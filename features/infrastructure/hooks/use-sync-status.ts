// Hook for checking and syncing bucket status with AWS
"use client";

import { useState, useCallback } from "react";
import type { BucketSyncStatus } from "@/lib/types";

export function useSyncStatus() {
  const [loading, setLoading] = useState(false);
  const [syncResults, setSyncResults] = useState<BucketSyncStatus[]>([]);
  const [error, setError] = useState<string | null>(null);

  const checkBucketStatus = useCallback(
    async (bucketId: string): Promise<BucketSyncStatus | null> => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `/api/infrastructure?action=check-status&bucketId=${bucketId}`
        );
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to check status");
        }
        return await res.json();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const syncAll = useCallback(async (): Promise<BucketSyncStatus[]> => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/infrastructure?action=sync-all`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to sync");
      }
      const data = await res.json();
      setSyncResults(data.results);
      return data.results;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const applySync = useCallback(
    async (
      bucketId: string,
      syncAction: string
    ): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `/api/infrastructure?action=apply-sync&bucketId=${bucketId}&syncAction=${syncAction}`
        );
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Sync action failed");
        }
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    loading,
    syncResults,
    error,
    checkBucketStatus,
    syncAll,
    applySync,
  };
}
