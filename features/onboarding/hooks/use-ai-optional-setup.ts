// Hook for optional OpenAI API key configuration
"use client";

import { useState, useCallback } from "react";

interface UseAiOptionalSetupReturn {
  loading: boolean;
  error: string | null;
  configured: boolean;
  checked: boolean;
  recheck: () => Promise<boolean>;
  saveApiKey: (key: string) => Promise<boolean>;
}

export function useAiOptionalSetup(): UseAiOptionalSetupReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState(false);
  const [checked, setChecked] = useState(false);

  const recheck = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Call the AI endpoint with a lightweight probe to check if key exists
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          prompt: "echo test",
        }),
      });

      if (res.status === 401) {
        // API key not configured
        setConfigured(false);
        setChecked(true);
        return false;
      }

      if (res.ok) {
        setConfigured(true);
        setChecked(true);
        return true;
      }

      // Other error — might still be configured but rate limited etc.
      setConfigured(false);
      setChecked(true);
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI check failed");
      setChecked(true);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const saveApiKey = useCallback(async (key: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Save the API key to .env.local via a backend endpoint
      const res = await fetch("/api/system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiConfigured: true }),
      });

      if (!res.ok) {
        throw new Error("Failed to save AI configuration");
      }

      // Write the key to .env.local via terminal
      const writeRes = await fetch("/api/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: `$envFile = ".env.local"; $content = if (Test-Path $envFile) { Get-Content $envFile -Raw } else { "" }; $lines = $content -split "\\r?\\n" | Where-Object { $_ -notmatch "^OPENAI_API_KEY=" }; $lines += "OPENAI_API_KEY=${key}"; $lines | Set-Content $envFile -Encoding UTF8; Write-Host "API key saved to .env.local"`,
        }),
      });

      if (!writeRes.ok) {
        throw new Error("Failed to write .env.local");
      }

      // Consume stream
      if (writeRes.body) {
        const reader = writeRes.body.getReader();
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done } = await reader.read();
          if (done) break;
        }
      }

      setConfigured(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save API key");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, configured, checked, recheck, saveApiKey };
}
