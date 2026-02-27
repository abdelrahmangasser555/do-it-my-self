// Hook for reading/writing onboarding system state from /data/system.json
"use client";

import { useState, useEffect, useCallback } from "react";

export interface SystemState {
  environmentValidated: boolean;
  awsValidated: boolean;
  cdkBootstrapped: boolean;
  aiConfigured: boolean;
  onboardingComplete: boolean;
  tourCompleted: boolean;
}

const DEFAULT_STATE: SystemState = {
  environmentValidated: false,
  awsValidated: false,
  cdkBootstrapped: false,
  aiConfigured: false,
  onboardingComplete: false,
  tourCompleted: false,
};

export function useOnboardingState() {
  const [state, setState] = useState<SystemState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchState = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/system");
      if (!res.ok) throw new Error("Failed to load system state");
      const data = await res.json();
      setState({ ...DEFAULT_STATE, ...data });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load state");
    } finally {
      setLoading(false);
    }
  }, []);

  const updateState = useCallback(
    async (updates: Partial<SystemState>) => {
      try {
        const res = await fetch("/api/system", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        if (!res.ok) throw new Error("Failed to update system state");
        const data = await res.json();
        setState({ ...DEFAULT_STATE, ...data });
        return data as SystemState;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update state");
        return null;
      }
    },
    []
  );

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  return {
    state,
    loading,
    error,
    updateState,
    refetch: fetchState,
  };
}
