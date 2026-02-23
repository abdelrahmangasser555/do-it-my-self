// Terminal log context — shared state for streaming deployment/operation logs
"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";

export type LogLevel = "info" | "warn" | "error" | "success" | "command";

export interface TerminalLine {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  source?: string;
}

interface TerminalContextValue {
  lines: TerminalLine[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  log: (message: string, level?: LogLevel, source?: string) => void;
  clear: () => void;
  logStream: (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    source?: string,
    onLine?: (parsed: Record<string, unknown>) => void
  ) => Promise<void>;
  runCommand: (command: string, cwd?: string) => Promise<void>;
  killCommand: () => Promise<void>;
  isRunning: boolean;
  commandHistory: string[];
  lastError: string | null;
}

const TerminalContext = createContext<TerminalContextValue | null>(null);

let lineCounter = 0;

function createLine(
  message: string,
  level: LogLevel = "info",
  source?: string
): TerminalLine {
  lineCounter++;
  return {
    id: `log-${lineCounter}-${Date.now()}`,
    timestamp: new Date().toISOString(),
    level,
    message,
    source,
  };
}

export function TerminalProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);
  const linesRef = useRef<TerminalLine[]>([]);
  const sessionIdRef = useRef<string | null>(null);

  const log = useCallback(
    (message: string, level: LogLevel = "info", source?: string) => {
      const line = createLine(message, level, source);
      linesRef.current = [...linesRef.current, line];
      setLines([...linesRef.current]);
      // Auto-open on error or command
      if (level === "error" || level === "command") {
        setIsOpen(true);
      }
    },
    []
  );

  const clear = useCallback(() => {
    linesRef.current = [];
    setLines([]);
  }, []);

  // Stream NDJSON from a fetch response body
  const logStream = useCallback(
    async (
      reader: ReadableStreamDefaultReader<Uint8Array>,
      source?: string,
      onLine?: (parsed: Record<string, unknown>) => void
    ) => {
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const jsonLines = buffer.split("\n");
          buffer = jsonLines.pop() || "";

          for (const raw of jsonLines) {
            if (!raw.trim()) continue;
            try {
              const parsed = JSON.parse(raw);
              const level: LogLevel =
                parsed.level ||
                (parsed.status === "error" ? "error" : "info");
              const message =
                parsed.message || parsed.label || parsed.data || raw;
              log(String(message), level, source);
              onLine?.(parsed);
            } catch {
              // Not JSON — log as raw text
              log(raw, "info", source);
            }
          }
        }

        // Flush remaining buffer
        if (buffer.trim()) {
          log(buffer.trim(), "info", source);
        }
      } catch (err) {
        log(
          `Stream error: ${err instanceof Error ? err.message : "Unknown"}`,
          "error",
          source
        );
      }
    },
    [log]
  );

  // Execute a shell command via the /api/terminal endpoint
  const runCommand = useCallback(
    async (command: string, cwd?: string) => {
      setIsOpen(true);
      setIsRunning(true);
      setLastError(null);
      setCommandHistory((prev) => [...prev, command]);
      sessionIdRef.current = null;

      try {
        const res = await fetch("/api/terminal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command, cwd }),
        });

        if (!res.ok) {
          const err = await res.json();
          const errMsg = err.error || "Command failed";
          log(errMsg, "error", "terminal");
          setLastError(errMsg);
          setIsRunning(false);
          return;
        }

        if (!res.body) {
          log("No response stream", "error", "terminal");
          setLastError("No response stream");
          setIsRunning(false);
          return;
        }

        let errorBuffer = "";
        await logStream(res.body.getReader(), "terminal", (parsed) => {
          // Capture session ID from the first message
          if (parsed.type === "session" && parsed.sessionId) {
            sessionIdRef.current = parsed.sessionId as string;
          }
          // Track errors for AI debugging
          if (parsed.level === "error" || parsed.level === "warn") {
            errorBuffer += (parsed.message || "") + "\n";
          }
        });
        if (errorBuffer.trim()) {
          setLastError(errorBuffer.trim());
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Unknown";
        log(`Command error: ${errMsg}`, "error", "terminal");
        setLastError(errMsg);
      } finally {
        setIsRunning(false);
        sessionIdRef.current = null;
      }
    },
    [log, logStream]
  );

  // Kill the currently running process
  const killCommand = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (!sid) {
      log("No running process to kill", "warn", "terminal");
      return;
    }

    try {
      const res = await fetch("/api/terminal", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid }),
      });

      if (res.ok) {
        log("Kill signal sent", "warn", "terminal");
      } else {
        const err = await res.json();
        log(`Failed to kill: ${err.error}`, "error", "terminal");
      }
    } catch (err) {
      log(
        `Kill error: ${err instanceof Error ? err.message : "Unknown"}`,
        "error",
        "terminal"
      );
    }
  }, [log]);

  return (
    <TerminalContext.Provider
      value={{ lines, isOpen, setIsOpen, log, clear, logStream, runCommand, killCommand, isRunning, commandHistory, lastError }}
    >
      {children}
    </TerminalContext.Provider>
  );
}

export function useTerminal() {
  const ctx = useContext(TerminalContext);
  if (!ctx) throw new Error("useTerminal must be used within TerminalProvider");
  return ctx;
}
