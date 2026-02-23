// Hook for fetching analytics summary and per-bucket stats
"use client";

import { useState, useEffect, useCallback } from "react";
import type { AnalyticsSummary, BucketAnalytics } from "@/lib/types";

export function useAnalytics(projectId?: string) {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [bucketAnalytics, setBucketAnalytics] = useState<BucketAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const url = projectId
        ? `/api/analytics?projectId=${projectId}`
        : "/api/analytics";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      const data = await res.json();
      setSummary(data.summary);
      setBucketAnalytics(data.bucketAnalytics);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return { summary, bucketAnalytics, loading, error, refetch: fetchAnalytics };
}
