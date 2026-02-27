// Hook for validating local environment dependencies (Node, npm, AWS CLI, CDK)
"use client";

import { useState, useCallback } from "react";
import { DEPENDENCIES, executeCommand, type DependencyCheck } from "../utils/commands";

export interface DependencyResult {
  name: string;
  available: boolean;
  version: string | null;
  error: string | null;
  installSnippet: string;
  icon: DependencyCheck["icon"];
}

interface UseEnvironmentValidationReturn {
  results: DependencyResult[];
  loading: boolean;
  error: string | null;
  allPassed: boolean;
  checked: boolean;
  recheck: () => Promise<boolean>;
}

export function useEnvironmentValidation(): UseEnvironmentValidationReturn {
  const [results, setResults] = useState<DependencyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  const recheck = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const checkResults: DependencyResult[] = [];

      for (const dep of DEPENDENCIES) {
        try {
          const result = await executeCommand(dep.command);
          const combined = `${result.stdout}\n${result.stderr}`;
          const version = dep.versionParser(combined);

          checkResults.push({
            name: dep.name,
            available: result.success && version !== null,
            version,
            error: result.success ? null : combined.trim() || "Command failed",
            installSnippet: dep.installSnippet,
            icon: dep.icon,
          });
        } catch (err) {
          checkResults.push({
            name: dep.name,
            available: false,
            version: null,
            error: err instanceof Error ? err.message : "Check failed",
            installSnippet: dep.installSnippet,
            icon: dep.icon,
          });
        }
      }

      setResults(checkResults);
      setChecked(true);
      const allPassed = checkResults.every((r) => r.available);
      return allPassed;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Validation failed");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const allPassed = results.length > 0 && results.every((r) => r.available);

  return { results, loading, error, allPassed, checked, recheck };
}
