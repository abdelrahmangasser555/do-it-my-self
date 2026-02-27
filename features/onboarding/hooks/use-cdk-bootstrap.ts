// Hook for bootstrapping AWS CDK in the current account/region
"use client";

import { useState, useCallback } from "react";
import { executeCommandStreaming } from "../utils/commands";

export interface TerminalLine {
  type: string;
  message: string;
  level: string;
}

interface UseCdkBootstrapReturn {
  loading: boolean;
  error: string | null;
  success: boolean;
  checked: boolean;
  terminalOutput: TerminalLine[];
  recheck: () => Promise<boolean>;
}

export function useCdkBootstrap(): UseCdkBootstrapReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [checked, setChecked] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<TerminalLine[]>([]);

  const recheck = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    setTerminalOutput([]);

    try {
      // First check if CDKToolkit stack already exists
      setTerminalOutput((prev) => [
        ...prev,
        {
          type: "command",
          message: "$ aws cloudformation describe-stacks --stack-name CDKToolkit",
          level: "command",
        },
      ]);

      const checkResult = await executeCommandStreaming(
        'aws cloudformation describe-stacks --stack-name CDKToolkit --query "Stacks[0].StackStatus" --output text',
        (line) => setTerminalOutput((prev) => [...prev, line])
      );

      if (checkResult.success && checkResult.stdout.includes("COMPLETE")) {
        setSuccess(true);
        setChecked(true);
        setTerminalOutput((prev) => [
          ...prev,
          { type: "info", message: "CDK Bootstrap stack exists and is ready.", level: "success" },
        ]);
        return true;
      }

      // Run bootstrap
      setTerminalOutput((prev) => [
        ...prev,
        { type: "command", message: "$ cd infrastructure/cdk; npx cdk bootstrap", level: "command" },
      ]);

      const result = await executeCommandStreaming(
        "cd infrastructure/cdk; npx cdk bootstrap",
        (line) => setTerminalOutput((prev) => [...prev, line])
      );

      if (result.success) {
        setSuccess(true);
        setChecked(true);
        return true;
      } else {
        setError("CDK bootstrap failed. Check output for details.");
        setChecked(true);
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "CDK bootstrap failed");
      setChecked(true);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, success, checked, terminalOutput, recheck };
}
