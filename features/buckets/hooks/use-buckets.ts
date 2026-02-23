// Hook for fetching, creating, and deleting buckets
"use client";

import { useState, useEffect, useCallback } from "react";
import type { Bucket } from "@/lib/types";
import type { BucketFormValues } from "@/lib/validations";

export function useBuckets(projectId?: string) {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBuckets = useCallback(async () => {
    try {
      setLoading(true);
      const url = projectId
        ? `/api/buckets?projectId=${projectId}`
        : "/api/buckets";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch buckets");
      const data = await res.json();
      setBuckets(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchBuckets();
  }, [fetchBuckets]);

  return { buckets, loading, error, refetch: fetchBuckets };
}

export function useCreateBucket() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createBucket = async (data: BucketFormValues): Promise<Bucket | null> => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/buckets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create bucket");
      }
      return await res.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { createBucket, loading, error };
}

export function useDeleteBucket() {
  const [loading, setLoading] = useState(false);

  const deleteBucket = async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      const res = await fetch(`/api/buckets?id=${id}`, { method: "DELETE" });
      return res.ok;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { deleteBucket, loading };
}
