// Hook for deploying infrastructure via CDK
"use client";

import { useState } from "react";

interface DeployResult {
  success: boolean;
  stdout?: string;
  stderr?: string;
  error?: string;
}

export function useDeployBucket() {
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const deploy = async (
    bucketId: string,
    s3BucketName: string,
    region: string
  ): Promise<DeployResult> => {
    try {
      setLoading(true);
      setError(null);
      setOutput("");

      const res = await fetch("/api/infrastructure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deploy",
          bucketId,
          s3BucketName,
          region,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Deployment failed");
        return { success: false, error: data.error };
      }

      setOutput(data.stdout || "");
      return { success: true, stdout: data.stdout, stderr: data.stderr };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Deployment failed";
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const synth = async (): Promise<DeployResult> => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/infrastructure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "synth" }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Synth failed");
        return { success: false, error: data.error };
      }

      setOutput(data.stdout || "");
      return { success: true, stdout: data.stdout };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Synth failed";
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  return { deploy, synth, loading, output, error };
}
