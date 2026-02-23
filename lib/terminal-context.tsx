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
  const linesRef = useRef<TerminalLine[]>([]);

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

  return (
    <TerminalContext.Provider
      value={{ lines, isOpen, setIsOpen, log, clear, logStream }}
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
