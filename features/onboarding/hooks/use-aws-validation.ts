// Hook for validating AWS connection (sts get-caller-identity) and checking IAM permissions
"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { executeCommand, executeCommandStreaming } from "../utils/commands";
import type { IamPolicy, IamPermissionResult } from "../components/aws-step";

export interface AwsIdentity {
  account: string;
  arn: string;
  userId: string;
}

export interface CdkStack {
  name: string;
}

export interface TerminalLine {
  type: string;
  message: string;
  level: string;
}

interface UseAwsValidationReturn {
  identity: AwsIdentity | null;
  cdkStacks: CdkStack[];
  loading: boolean;
  error: string | null;
  checked: boolean;
  terminalOutput: TerminalLine[];
  allPassed: boolean;
  recheck: () => Promise<boolean>;

  // IAM permissions
  iamPolicies: IamPolicy[];
  iamPermissions: IamPermissionResult[];
  hasAdminPolicy: boolean;
  allPermissionsGranted: boolean;
  iamLoading: boolean;
  checkPermissions: () => Promise<void>;

  // Credential switching
  updateCredentials: (
    accessKeyId: string,
    secretAccessKey: string,
    region: string,
  ) => Promise<boolean>;
  credentialUpdating: boolean;
}

export function useAwsValidation(): UseAwsValidationReturn {
  const [identity, setIdentity] = useState<AwsIdentity | null>(null);
  const [cdkStacks, setCdkStacks] = useState<CdkStack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<TerminalLine[]>([]);

  // IAM state
  const [iamPolicies, setIamPolicies] = useState<IamPolicy[]>([]);
  const [iamPermissions, setIamPermissions] = useState<IamPermissionResult[]>(
    [],
  );
  const [hasAdminPolicy, setHasAdminPolicy] = useState(false);
  const [allPermissionsGranted, setAllPermissionsGranted] = useState(false);
  const [iamLoading, setIamLoading] = useState(false);
  const [credentialUpdating, setCredentialUpdating] = useState(false);

  const recheck = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);
    setTerminalOutput([]);
    setIdentity(null);
    setCdkStacks([]);

    try {
      // Step 1: Verify AWS identity
      setTerminalOutput((prev) => [
        ...prev,
        {
          type: "command",
          message: "$ aws sts get-caller-identity",
          level: "command",
        },
      ]);

      const stsResult = await executeCommandStreaming(
        "aws sts get-caller-identity",
        (line) => setTerminalOutput((prev) => [...prev, line]),
      );

      if (!stsResult.success) {
        setError(
          "AWS CLI not configured. Run 'aws configure' to set up credentials.",
        );
        setChecked(true);
        return false;
      }

      try {
        const parsed = JSON.parse(stsResult.stdout);
        setIdentity({
          account: parsed.Account || "",
          arn: parsed.Arn || "",
          userId: parsed.UserId || "",
        });
      } catch {
        setError("Failed to parse AWS identity response");
        setChecked(true);
        return false;
      }

      // Step 2: List CDK stacks
      setTerminalOutput((prev) => [
        ...prev,
        {
          type: "command",
          message: "$ cd infrastructure/cdk; npx cdk list",
          level: "command",
        },
      ]);

      const cdkResult = await executeCommandStreaming(
        "cd infrastructure/cdk; npx cdk list",
        (line) => setTerminalOutput((prev) => [...prev, line]),
      );

      if (cdkResult.success && cdkResult.stdout.trim()) {
        const stacks = cdkResult.stdout
          .trim()
          .split("\n")
          .filter((s) => s.trim())
          .map((name) => ({ name: name.trim() }));
        setCdkStacks(stacks);
      }

      setChecked(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "AWS validation failed");
      setChecked(true);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const checkPermissions = useCallback(async () => {
    setIamLoading(true);
    try {
      const res = await fetch("/api/aws-identity/permissions");
      if (!res.ok) {
        const data = await res.json();
        toast.error("Failed to check permissions", {
          description: data.error || "Unknown error",
        });
        return;
      }
      const data = await res.json();
      setIamPolicies(data.policies || []);
      setIamPermissions(data.permissionResults || []);
      setHasAdminPolicy(data.hasAdminPolicy || false);
      setAllPermissionsGranted(data.allPermissionsGranted || false);

      // Update identity if we got richer data
      if (data.identity) {
        setIdentity((prev) => ({
          account: data.identity.account || prev?.account || "",
          arn: data.identity.arn || prev?.arn || "",
          userId: data.identity.userId || prev?.userId || "",
        }));
      }
    } catch (err) {
      toast.error("Failed to check IAM permissions", {
        description:
          err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setIamLoading(false);
    }
  }, []);

  const updateCredentials = useCallback(
    async (
      accessKeyId: string,
      secretAccessKey: string,
      region: string,
    ): Promise<boolean> => {
      setCredentialUpdating(true);
      const toastId = toast.loading("Updating AWS credentials...");
      try {
        const res = await fetch("/api/aws-identity/credentials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessKeyId, secretAccessKey, region }),
        });
        const data = await res.json();

        if (!res.ok) {
          toast.error("Failed to update credentials", {
            id: toastId,
            description: data.error,
          });
          return false;
        }

        // Update identity with new info
        if (data.identity) {
          setIdentity({
            account: data.identity.account || "",
            arn: data.identity.arn || "",
            userId: "",
          });
        }

        // Reset permission state since user changed
        setIamPolicies([]);
        setIamPermissions([]);
        setHasAdminPolicy(false);
        setAllPermissionsGranted(false);
        setChecked(true);
        setError(null);

        toast.success("Credentials updated successfully!", {
          id: toastId,
          description: `Connected as ${data.identity?.arn || "new user"}`,
        });
        return true;
      } catch (err) {
        toast.error("Failed to update credentials", {
          id: toastId,
          description:
            err instanceof Error ? err.message : "Network error",
        });
        return false;
      } finally {
        setCredentialUpdating(false);
      }
    },
    [],
  );

  const allPassed = identity !== null;

  return {
    identity,
    cdkStacks,
    loading,
    error,
    checked,
    terminalOutput,
    allPassed,
    recheck,
    iamPolicies,
    iamPermissions,
    hasAdminPolicy,
    allPermissionsGranted,
    iamLoading,
    checkPermissions,
    updateCredentials,
    credentialUpdating,
  };
}
