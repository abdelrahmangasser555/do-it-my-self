// Hook for managing bootstrapped AWS environments
"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import type { BootstrappedEnvironment } from "@/lib/types";

export function useEnvironments() {
  const [environments, setEnvironments] = useState<BootstrappedEnvironment[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEnvironments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/environments");
      if (!res.ok) throw new Error("Failed to fetch environments");
      const data = await res.json();
      setEnvironments(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEnvironments();
  }, [fetchEnvironments]);

  const activeEnvironments = environments.filter((e) => e.status === "active");

  return {
    environments,
    activeEnvironments,
    loading,
    error,
    refetch: fetchEnvironments,
  };
}

export function useBootstrapEnvironment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bootstrapEnvironment = async (
    region: string,
    accountId: string,
    alias?: string,
  ): Promise<BootstrappedEnvironment | null> => {
    try {
      setLoading(true);
      setError(null);

      const toastId = toast.loading(`Bootstrapping ${alias || region}…`, {
        description: "Creating environment record",
      });

      // 1. Create the environment record
      const createRes = await fetch("/api/environments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ region, accountId, alias }),
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        toast.error(`Bootstrap failed`, {
          id: toastId,
          description: err.error || "Failed to create environment",
        });
        throw new Error(err.error || "Failed to create environment");
      }

      const env: BootstrappedEnvironment = await createRes.json();

      toast.loading(`Bootstrapping ${alias || region}…`, {
        id: toastId,
        description: "Running CDK bootstrap — this may take a few minutes",
      });

      // 2. Run CDK bootstrap for the specific region
      // Ensure CDK deps are installed before running bootstrap
      const termRes = await fetch("/api/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: `cd infrastructure/cdk && npm install --prefer-offline 2>/dev/null && npx cdk bootstrap aws://${accountId}/${region}`,
        }),
      });

      if (!termRes.ok) {
        // Update environment to failed
        await fetch("/api/environments", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: env.id, status: "failed" }),
        });
        toast.error(`Bootstrap failed`, {
          id: toastId,
          description: "Bootstrap command failed to start",
        });
        throw new Error("Bootstrap command failed to start");
      }

      // 3. Consume the stream and show progress toasts
      let success = false;
      if (termRes.body) {
        const reader = termRes.body.getReader();
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

              // Show meaningful progress lines
              if (parsed.type === "stdout" || parsed.type === "stderr") {
                const text = (parsed.message || "").trim();
                if (text && text.length > 5 && text.length < 200) {
                  toast.loading(`Bootstrapping ${alias || region}…`, {
                    id: toastId,
                    description: text,
                  });
                }
              }

              if (parsed.type === "exit" && parsed.exitCode === 0) {
                success = true;
              }
            } catch {
              // ignore
            }
          }
        }
      }

      // 4. Update the environment status
      const finalStatus = success ? "active" : "failed";
      const updateRes = await fetch("/api/environments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: env.id,
          status: finalStatus,
          bootstrappedAt: success ? new Date().toISOString() : "",
        }),
      });

      if (!updateRes.ok) {
        toast.error(`Bootstrap failed`, {
          id: toastId,
          description: "Failed to update environment status",
        });
        throw new Error("Failed to update environment status");
      }

      const updated = await updateRes.json();
      if (!success) {
        toast.error(`Bootstrap failed for ${alias || region}`, {
          id: toastId,
          description:
            "CDK bootstrap exited with errors. Check your AWS credentials and try again.",
        });
        throw new Error("CDK bootstrap failed for this region");
      }

      toast.success(`${alias || region} bootstrapped successfully!`, {
        id: toastId,
        description: "Region is now ready for deployments",
      });

      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bootstrap failed");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const removeEnvironment = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/environments?id=${id}`, {
        method: "DELETE",
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  return { bootstrapEnvironment, removeEnvironment, loading, error };
}
