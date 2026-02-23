// Hook for fetching expense / cost breakdown data
"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  BucketExpense,
  ProjectExpense,
  OverallCostSummary,
} from "@/lib/types";

interface ExpensesData {
  summary: OverallCostSummary | null;
  projects: ProjectExpense[];
  buckets: BucketExpense[];
}

export function useExpenses(
  projectId?: string,
  bucketId?: string
) {
  const [data, setData] = useState<ExpensesData>({
    summary: null,
    projects: [],
    buckets: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (projectId) params.set("projectId", projectId);
      if (bucketId) params.set("bucketId", bucketId);
      const url = `/api/expenses?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch expenses");
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [projectId, bucketId]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  return { ...data, loading, error, refetch: fetchExpenses };
}
