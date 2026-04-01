'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Bucket } from '@/lib/types';
import type { MergedS3File } from '@/features/files/hooks/use-files';

export interface BucketInventoryTypeSegment {
  type: string;
  count: number;
  color: string;
}

export interface BucketInventorySummary {
  bucketId: string;
  fileCount: number;
  totalSizeBytes: number;
  files: MergedS3File[];
  fileTypeBreakdown: BucketInventoryTypeSegment[];
}

const FILE_TYPE_COLORS: Record<string, string> = {
  image: 'var(--chart-1)',
  video: 'var(--chart-2)',
  document: 'var(--chart-3)',
  archive: 'var(--chart-4)',
  code: 'var(--chart-5)',
  audio: 'var(--primary)',
  other: 'var(--muted-foreground)',
};

function classifyFileType(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'].includes(ext)) {
    return 'image';
  }
  if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext)) {
    return 'video';
  }
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) {
    return 'audio';
  }
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'].includes(ext)) {
    return 'document';
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return 'archive';
  }
  if (['js', 'ts', 'tsx', 'jsx', 'json', 'html', 'css', 'md', 'xml', 'yml', 'yaml'].includes(ext)) {
    return 'code';
  }
  return 'other';
}

function buildBreakdown(files: MergedS3File[]): BucketInventoryTypeSegment[] {
  const counts = new Map<string, number>();
  for (const file of files) {
    if (file.key.endsWith('/')) continue;
    const type = classifyFileType(file.key);
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({
      type,
      count,
      color: FILE_TYPE_COLORS[type] ?? FILE_TYPE_COLORS.other,
    }));
}

export function useBucketInventory(buckets: Bucket[]) {
  const [inventory, setInventory] = useState<Record<string, BucketInventorySummary>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInventory = useCallback(async () => {
    const activeBuckets = buckets.filter((bucket) => bucket.status === 'active');
    if (activeBuckets.length === 0) {
      setInventory({});
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const responses = await Promise.allSettled(
        activeBuckets.map(async (bucket) => {
          const params = new URLSearchParams({ bucketName: bucket.s3BucketName });
          if (bucket.region) params.set('region', bucket.region);

          const response = await fetch(`/api/files/s3?${params.toString()}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch inventory for ${bucket.name}`);
          }

          const data = (await response.json()) as {
            files: MergedS3File[];
            totalSize: number;
            totalFiles: number;
          };

          const actualFiles = data.files.filter((file) => !file.key.endsWith('/'));

          return {
            bucketId: bucket.id,
            fileCount: actualFiles.length,
            totalSizeBytes: actualFiles.reduce((sum, file) => sum + file.size, 0),
            files: actualFiles,
            fileTypeBreakdown: buildBreakdown(actualFiles),
          } satisfies BucketInventorySummary;
        }),
      );

      const nextInventory: Record<string, BucketInventorySummary> = {};
      for (const result of responses) {
        if (result.status === 'fulfilled') {
          nextInventory[result.value.bucketId] = result.value;
        }
      }

      setInventory(nextInventory);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bucket inventory');
    } finally {
      setLoading(false);
    }
  }, [buckets]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const totals = useMemo(() => {
    return Object.values(inventory).reduce(
      (acc, item) => {
        acc.totalFiles += item.fileCount;
        acc.totalSizeBytes += item.totalSizeBytes;
        return acc;
      },
      { totalFiles: 0, totalSizeBytes: 0 },
    );
  }, [inventory]);

  return {
    inventory,
    loading,
    error,
    totals,
    refetch: fetchInventory,
  };
}
