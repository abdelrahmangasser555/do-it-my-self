// Hook for managing bootstrapped AWS environments
"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import type { BootstrappedEnvironment } from "@/lib/types";

export interface BootstrapProgress {
  region: string;
  phase: "checking" | "repairing" | "installing" | "bootstrapping" | "done" | "error";
  message: string;
  detail?: string;
}

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
  const [lastErrorOutput, setLastErrorOutput] = useState<string>("");
  const [progress, setProgress] = useState<BootstrapProgress | null>(null);

  // Bad CloudFormation states that require stack deletion before re-bootstrap
  const BAD_STACK_STATES = [
    "ROLLBACK_COMPLETE",
    "ROLLBACK_FAILED",
    "CREATE_FAILED",
    "DELETE_FAILED",
    "UPDATE_ROLLBACK_FAILED",
    "UPDATE_ROLLBACK_COMPLETE",
    "IMPORT_ROLLBACK_FAILED",
    "IMPORT_ROLLBACK_COMPLETE",
  ];

  /** Returns the CDKToolkit stack status, or null if not found */
  const getStackStatus = async (
    region: string,
  ): Promise<string | null> => {
    try {
      const termRes = await fetch("/api/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: `aws cloudformation describe-stacks --stack-name CDKToolkit --region ${region} --query "Stacks[0].StackStatus" --output text`,
        }),
      });

      if (!termRes.ok || !termRes.body) return null;

      const reader = termRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let stdout = "";
      let exitCode: number | null = null;

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
            if (parsed.type === "stdout") {
              stdout += (parsed.message || "").trim();
            }
            if (parsed.type === "exit") {
              exitCode = parsed.exitCode;
            }
          } catch {
            // ignore
          }
        }
      }

      // Non-zero exit = stack doesn't exist
      if (exitCode !== 0) return null;
      return stdout.trim() || null;
    } catch {
      return null;
    }
  };

  /** Delete a CloudFormation stack and wait for deletion to complete */
  const deleteStackAndWait = async (
    region: string,
    onProgress: (msg: string) => void,
  ): Promise<boolean> => {
    // First, delete the stack
    onProgress("Deleting broken CDKToolkit stack...");
    const deleteRes = await fetch("/api/terminal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        command: `aws cloudformation delete-stack --stack-name CDKToolkit --region ${region}`,
      }),
    });

    if (!deleteRes.ok || !deleteRes.body) return false;

    // Consume the delete command stream
    const reader1 = deleteRes.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let deleteExitCode: number | null = null;
    while (true) {
      const { done, value } = await reader1.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() || "";
      for (const raw of lines) {
        if (!raw.trim()) continue;
        try {
          const parsed = JSON.parse(raw);
          if (parsed.type === "exit") deleteExitCode = parsed.exitCode;
        } catch {
          // ignore
        }
      }
    }

    if (deleteExitCode !== 0) {
      // If normal delete fails, try with --force flag (retain nothing)
      onProgress("Retrying deletion with retain policy...");
      const forceRes = await fetch("/api/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: `aws cloudformation delete-stack --stack-name CDKToolkit --region ${region} --deletion-mode FORCE_DELETE_STACK`,
        }),
      });
      if (forceRes.body) {
        const r = forceRes.body.getReader();
        while (!(await r.read()).done) { /* drain */ }
      }
    }

    // Now poll for deletion to complete (up to 5 minutes)
    onProgress("Waiting for stack deletion to complete...");
    const maxAttempts = 30;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((r) => setTimeout(r, 10000)); // 10s interval
      const status = await getStackStatus(region);

      if (status === null) {
        // Stack no longer exists — deletion complete
        return true;
      }

      if (status === "DELETE_FAILED") {
        onProgress("Stack deletion failed — attempting forced cleanup...");
        // One more try: delete with retention of everything that's blocking
        const retryRes = await fetch("/api/terminal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            command: `aws cloudformation delete-stack --stack-name CDKToolkit --region ${region} --deletion-mode FORCE_DELETE_STACK`,
          }),
        });
        if (retryRes.body) {
          const r = retryRes.body.getReader();
          while (!(await r.read()).done) { /* drain */ }
        }
        continue;
      }

      if (status === "DELETE_IN_PROGRESS") {
        onProgress(
          `Stack deletion in progress… (${attempt + 1}/${maxAttempts})`,
        );
        continue;
      }

      // Unexpected status
      onProgress(`Stack status: ${status} — waiting…`);
    }

    // Timed out
    return false;
  };

  const bootstrapEnvironment = async (
    region: string,
    accountId: string,
    alias?: string,
  ): Promise<BootstrappedEnvironment | null> => {
    try {
      setLoading(true);
      setError(null);
      setProgress({ region, phase: "checking", message: "Checking if region is already bootstrapped..." });

      const toastId = toast.loading(`Bootstrapping ${alias || region}…`, {
        description: "Checking existing bootstrap status",
      });

      // Pre-check: See if CDKToolkit stack already exists and what state it's in
      const stackStatus = await getStackStatus(region);

      // If stack is in a bad state, auto-repair by deleting it first
      if (stackStatus && BAD_STACK_STATES.includes(stackStatus)) {
        setProgress({
          region,
          phase: "repairing",
          message: `Stack in ${stackStatus} state — auto-repairing…`,
        });
        toast.loading(`Bootstrapping ${alias || region}…`, {
          id: toastId,
          description: `CDKToolkit is in ${stackStatus} state — deleting and re-creating`,
        });

        const deleted = await deleteStackAndWait(region, (msg) => {
          setProgress({ region, phase: "repairing", message: msg });
          toast.loading(`Bootstrapping ${alias || region}…`, {
            id: toastId,
            description: msg,
          });
        });

        if (!deleted) {
          toast.error(`Bootstrap failed for ${alias || region}`, {
            id: toastId,
            description:
              "Could not delete broken CDKToolkit stack. You may need to delete it manually in the AWS CloudFormation console.",
          });
          setProgress({
            region,
            phase: "error",
            message: "Failed to delete broken stack",
          });
          throw new Error(
            "Could not auto-repair CDKToolkit stack. Delete it manually in AWS CloudFormation console, then retry.",
          );
        }

        // Stack deleted — fall through to full bootstrap below
        toast.loading(`Bootstrapping ${alias || region}…`, {
          id: toastId,
          description: "Broken stack removed — proceeding with fresh bootstrap",
        });
      }

      // If healthy stack exists, skip bootstrap
      const isHealthy =
        stackStatus !== null &&
        !BAD_STACK_STATES.includes(stackStatus) &&
        stackStatus.includes("COMPLETE") &&
        stackStatus !== "DELETE_COMPLETE";

      if (isHealthy) {
        setProgress({ region, phase: "done", message: "Already bootstrapped" });

        // Create the environment record as active directly
        const createRes = await fetch("/api/environments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ region, accountId, alias }),
        });

        if (!createRes.ok) {
          const err = await createRes.json();
          // If duplicate, that's fine
          if (!err.error?.includes("already")) {
            toast.error(`Failed to record environment`, {
              id: toastId,
              description: err.error,
            });
            throw new Error(err.error || "Failed to create environment");
          }
        }

        const env: BootstrappedEnvironment = createRes.ok
          ? await createRes.json()
          : { id: "", region, accountId, alias: alias || "", status: "active" as const, bootstrappedAt: new Date().toISOString(), createdAt: new Date().toISOString() };

        // Mark as active
        if (env.id) {
          await fetch("/api/environments", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: env.id,
              status: "active",
              bootstrappedAt: new Date().toISOString(),
            }),
          });
        }

        toast.success(
          `${alias || region} already bootstrapped!`,
          {
            id: toastId,
            description: "CDKToolkit stack found — skipping bootstrap",
          },
        );
        setProgress(null);
        return { ...env, status: "active" };
      }

      // Not bootstrapped — proceed with full bootstrap
      setProgress({ region, phase: "installing", message: "Installing CDK dependencies..." });

      toast.loading(`Bootstrapping ${alias || region}…`, {
        id: toastId,
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
        setProgress({ region, phase: "error", message: err.error || "Failed to create environment" });
        throw new Error(err.error || "Failed to create environment");
      }

      const env: BootstrappedEnvironment = await createRes.json();

      toast.loading(`Bootstrapping ${alias || region}…`, {
        id: toastId,
        description: "Running CDK bootstrap — this may take a few minutes",
      });

      setProgress({ region, phase: "bootstrapping", message: "Running CDK bootstrap..." });

      // 2. Run CDK bootstrap for the specific region
      const termRes = await fetch("/api/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: `cd infrastructure/cdk; npm install --prefer-offline; npx cdk bootstrap aws://${accountId}/${region}`,
        }),
      });

      if (!termRes.ok) {
        await fetch("/api/environments", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: env.id, status: "failed" }),
        });
        toast.error(`Bootstrap failed`, {
          id: toastId,
          description: "Bootstrap command failed to start",
        });
        setProgress({ region, phase: "error", message: "Bootstrap command failed to start" });
        throw new Error("Bootstrap command failed to start");
      }

      // 3. Consume the stream and show progress
      let success = false;
      const errorLines: string[] = [];
      if (termRes.body) {
        const reader = termRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
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

              if (parsed.type === "stdout" || parsed.type === "stderr") {
                const text = (parsed.message || "").trim();
                if (parsed.type === "stderr" && text) {
                  errorLines.push(text);
                }
                if (text && text.length > 5 && text.length < 200) {
                  // Detect phase from output
                  let phase: BootstrapProgress["phase"] = "bootstrapping";
                  if (text.includes("npm") || text.includes("install")) {
                    phase = "installing";
                  }
                  setProgress({
                    region,
                    phase,
                    message: text.length > 80 ? text.slice(0, 80) + "…" : text,
                    detail: text,
                  });
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
        setProgress({ region, phase: "error", message: "Failed to update environment status" });
        throw new Error("Failed to update environment status");
      }

      const updated = await updateRes.json();
      if (!success) {
        const errorOutput = errorLines.join("\n");
        setLastErrorOutput(errorOutput);
        const errorPreview =
          errorOutput.slice(0, 150) ||
          "CDK bootstrap exited with errors. Check output for details.";
        toast.error(`Bootstrap failed for ${alias || region}`, {
          id: toastId,
          description: errorPreview,
        });
        setProgress({
          region,
          phase: "error",
          message: "Bootstrap failed",
          detail: errorPreview,
        });
        throw new Error("CDK bootstrap failed for this region");
      }

      toast.success(`${alias || region} bootstrapped successfully!`, {
        id: toastId,
        description: "Region is now ready for deployments",
      });

      setProgress({ region, phase: "done", message: "Bootstrap complete!" });

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

  return { bootstrapEnvironment, removeEnvironment, loading, error, lastErrorOutput, progress };
}
