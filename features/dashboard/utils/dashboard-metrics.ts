import type { Bucket } from '@/lib/types';

interface InventoryFile {
  lastModified: string;
  size?: number;
}

interface InventoryBreakdownSegment {
  type: string;
  count: number;
  color: string;
}

interface BucketInventory {
  totalSizeBytes?: number;
  fileTypeBreakdown?: InventoryBreakdownSegment[];
  files?: InventoryFile[];
}

type BucketInventoryMap = Record<string, BucketInventory | undefined>;

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatCost(cost: number): string {
  if (cost === 0) return '$0.00';
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

export function getAllRegions(buckets: Bucket[]) {
  return [...new Set(buckets.map((bucket) => bucket.region).filter(Boolean))];
}

export function getStorageByProjectId(
  projectIds: string[],
  buckets: Bucket[],
  inventory: BucketInventoryMap,
) {
  const map: Record<string, number> = {};

  for (const projectId of projectIds) {
    const projectBuckets = buckets.filter((bucket) => bucket.projectId === projectId);
    map[projectId] = projectBuckets.reduce(
      (sum, bucket) => sum + (inventory[bucket.id]?.totalSizeBytes ?? 0),
      0,
    );
  }

  return map;
}

export function getAggregatedBreakdown(buckets: Bucket[], inventory: BucketInventoryMap) {
  const typeMap = new Map<string, { count: number; color: string }>();

  for (const bucket of buckets) {
    for (const segment of inventory[bucket.id]?.fileTypeBreakdown ?? []) {
      const existing = typeMap.get(segment.type);
      if (existing) {
        existing.count += segment.count;
      } else {
        typeMap.set(segment.type, { count: segment.count, color: segment.color });
      }
    }
  }

  return Array.from(typeMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .map(([type, { count, color }]) => ({ type, count, color }));
}

export function getActivityData(buckets: Bucket[], inventory: BucketInventoryMap, days = 14) {
  const now = Date.now();
  const data = new Array(days).fill(0);

  for (const bucket of buckets) {
    for (const file of inventory[bucket.id]?.files ?? []) {
      const age = (now - new Date(file.lastModified).getTime()) / (1000 * 60 * 60 * 24);
      const index = days - 1 - Math.floor(age);

      if (index >= 0 && index < days) {
        const sizeKB = (file.size ?? 0) / 1024;
        data[index] += sizeKB > 0 ? Math.min(Math.sqrt(sizeKB), 8) : 1;
      }
    }
  }

  return data;
}
