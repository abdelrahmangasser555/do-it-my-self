// Hook for validating AWS connection (sts get-caller-identity) and listing CDK stacks
"use client";

import { useState, useCallback } from "react";
import { executeCommand, executeCommandStreaming } from "../utils/commands";

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
}

export function useAwsValidation(): UseAwsValidationReturn {
  const [identity, setIdentity] = useState<AwsIdentity | null>(null);
  const [cdkStacks, setCdkStacks] = useState<CdkStack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<TerminalLine[]>([]);

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
        { type: "command", message: "$ aws sts get-caller-identity", level: "command" },
      ]);

      const stsResult = await executeCommandStreaming(
        "aws sts get-caller-identity",
        (line) => setTerminalOutput((prev) => [...prev, line])
      );

      if (!stsResult.success) {
        setError("AWS CLI not configured. Run 'aws configure' to set up credentials.");
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
        { type: "command", message: "$ cd infrastructure/cdk; npx cdk list", level: "command" },
      ]);

      const cdkResult = await executeCommandStreaming(
        "cd infrastructure/cdk; npx cdk list",
        (line) => setTerminalOutput((prev) => [...prev, line])
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

  const allPassed = identity !== null;

  return { identity, cdkStacks, loading, error, checked, terminalOutput, allPassed, recheck };
}
