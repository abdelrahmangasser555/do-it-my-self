'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Bucket } from '@/lib/types';

export interface CompatibilityState {
  compatible: boolean;
  issues: string[];
  checked: boolean;
  fixing: boolean;
}

/**
 * Batch-checks upload compatibility for all active buckets in parallel.
 * Returns a map of bucketId → CompatibilityState and a makeCompatible() helper.
 */
export function useCompatibilityCheck(buckets: Bucket[]) {
  const [compatMap, setCompatMap] = useState<Record<string, CompatibilityState>>({});

  // Derive stable key from active bucket IDs — avoid infinite re-renders
  const activeKey = buckets
    .filter((b) => b.status === 'active')
    .map((b) => b.id)
    .sort()
    .join(',');

  const bucketsRef = useRef(buckets);
  bucketsRef.current = buckets;

  useEffect(() => {
    if (!activeKey) return;

    const activeBuckets = bucketsRef.current.filter((b) => b.status === 'active');

    void Promise.all(
      activeBuckets.map(async (bucket) => {
        const params = new URLSearchParams({ bucketName: bucket.s3BucketName });
        if (bucket.region) params.set('region', bucket.region);
        try {
          const res = await fetch(`/api/buckets/compatibility?${params.toString()}`);
          if (res.ok) {
            const data = await res.json();
            return {
              id: bucket.id,
              state: {
                compatible: data.compatible as boolean,
                issues: (data.issues as string[]) ?? [],
                checked: true,
                fixing: false,
              } satisfies CompatibilityState,
            };
          }
        } catch {
          /* silently ignore — assume compatible */
        }
        return {
          id: bucket.id,
          state: { compatible: true, issues: [], checked: true, fixing: false },
        };
      }),
    ).then((results) => {
      setCompatMap((prev) => {
        const next = { ...prev };
        for (const r of results) next[r.id] = r.state;
        return next;
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  const makeCompatible = useCallback(async (bucket: Bucket): Promise<boolean> => {
    setCompatMap((prev) => ({
      ...prev,
      [bucket.id]: {
        ...(prev[bucket.id] ?? { compatible: false, issues: [], checked: true }),
        fixing: true,
      },
    }));

    try {
      const res = await fetch('/api/buckets/compatibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucketName: bucket.s3BucketName, region: bucket.region }),
      });
      if (!res.ok) {
        setCompatMap((prev) => ({
          ...prev,
          [bucket.id]: { ...(prev[bucket.id] ?? {}), fixing: false } as CompatibilityState,
        }));
        return false;
      }

      // Re-check after applying
      const params = new URLSearchParams({ bucketName: bucket.s3BucketName });
      if (bucket.region) params.set('region', bucket.region);
      const check = await fetch(`/api/buckets/compatibility?${params.toString()}`);
      if (check.ok) {
        const data = await check.json();
        setCompatMap((prev) => ({
          ...prev,
          [bucket.id]: {
            compatible: data.compatible as boolean,
            issues: (data.issues as string[]) ?? [],
            checked: true,
            fixing: false,
          },
        }));
        return data.compatible as boolean;
      }

      setCompatMap((prev) => ({
        ...prev,
        [bucket.id]: { compatible: true, issues: [], checked: true, fixing: false },
      }));
      return true;
    } catch {
      setCompatMap((prev) => ({
        ...prev,
        [bucket.id]: { ...(prev[bucket.id] ?? {}), fixing: false } as CompatibilityState,
      }));
      return false;
    }
  }, []);

  return { compatMap, makeCompatible };
}
