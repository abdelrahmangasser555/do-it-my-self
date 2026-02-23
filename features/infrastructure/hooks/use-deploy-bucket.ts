// Hook for deploying infrastructure via CDK with streaming output to terminal
"use client";

import { useState, useCallback } from "react";
import { useTerminal } from "@/lib/terminal-context";

interface DeployResult {
  success: boolean;
  error?: string;
}

export function useDeployBucket() {
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const terminal = useTerminal();

  const runStreamingAction = useCallback(
    async (
      action: string,
      body: Record<string, string | undefined>,
      source: string
    ): Promise<DeployResult> => {
      setLoading(true);
      setError(null);
      setOutput("");
      terminal.setIsOpen(true);
      terminal.log(`Starting ${action}...`, "command", source);

      try {
        const res = await fetch("/api/infrastructure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...body }),
        });

        if (!res.ok) {
          // Non-streaming error (400 etc.)
          const data = await res.json();
          const msg = data.error || `${action} failed`;
          setError(msg);
          terminal.log(msg, "error", source);
          return { success: false, error: msg };
        }

        if (!res.body) {
          terminal.log("No response body", "error", source);
          return { success: false, error: "No response body" };
        }

        // Stream NDJSON lines
        let success = true;
        let lastError = "";
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const raw of lines) {
            if (!raw.trim()) continue;
            try {
              const parsed = JSON.parse(raw);
              const message =
                parsed.message || parsed.label || JSON.stringify(parsed);
              const level = parsed.level || "info";

              // Accumulate output
              setOutput((prev) => prev + message + "\n");
              terminal.log(message, level, source);

              // Track errors
              if (parsed.status === "error" || parsed.type === "result" && parsed.status === "error") {
                success = false;
                lastError = message;
              }

              // Error intelligence suggestions
              if (parsed.type === "error-intelligence") {
                terminal.log(`💡 ${parsed.title}`, "warn", source);
                terminal.log(`   ${parsed.suggestion}`, "warn", source);
                if (parsed.command) {
                  terminal.log(`   Fix: ${parsed.command}`, "command", source);
                }
              }
            } catch {
              terminal.log(raw, "info", source);
              setOutput((prev) => prev + raw + "\n");
            }
          }
        }

        // Flush buffer
        if (buffer.trim()) {
          terminal.log(buffer.trim(), "info", source);
        }

        if (!success) {
          setError(lastError);
        }

        return { success, error: success ? undefined : lastError };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : `${action} failed`;
        setError(message);
        terminal.log(message, "error", source);
        return { success: false, error: message };
      } finally {
        setLoading(false);
      }
    },
    [terminal]
  );

  const deploy = useCallback(
    async (
      bucketId: string,
      s3BucketName: string,
      region: string
    ): Promise<DeployResult> => {
      return runStreamingAction("deploy", { bucketId, s3BucketName, region }, "CDK Deploy");
    },
    [runStreamingAction]
  );

  const synth = useCallback(async (): Promise<DeployResult> => {
    return runStreamingAction("synth", {}, "CDK Synth");
  }, [runStreamingAction]);

  return { deploy, synth, loading, output, error };
}
