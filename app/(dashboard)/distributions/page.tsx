// CloudFront Distributions management page — card-based layout
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  Globe,
  RefreshCw,
  Trash2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2,
  Server,
  AlertTriangle,
  Database,
  Shield,
  Clock,
  PauseCircle,
} from 'lucide-react';
import { CircleFlag } from 'react-circle-flags';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PageTransition } from '@/components/page-transition';
import { useBuckets } from '@/features/buckets/hooks/use-buckets';
import { useBucketInventory } from '@/features/buckets/hooks/use-bucket-inventory';
import { useAnalytics } from '@/features/infrastructure/hooks/use-analytics';
import { useExpenses } from '@/features/infrastructure/hooks/use-expenses';
import { getRegionAlpha2 } from '@/lib/region-flags';

// ── Types ────────────────────────────────────────────────────────────────────

interface LinkedBucket {
  id: string;
  name: string;
  s3BucketName: string;
  status: string;
}

interface Distribution {
  id: string;
  domainName: string;
  status: string;
  enabled: boolean;
  origins: string[];
  comment: string;
  lastModified: string;
  alternativeDomains: string[];
  priceClass: string;
  linkedBucket: LinkedBucket | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatCost(cost: number): string {
  if (cost === 0) return '$0.00';
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

const PRICE_CLASS_LABELS: Record<string, { label: string; regions: string }> = {
  PriceClass_All: { label: 'All Regions', regions: 'Global edge coverage' },
  PriceClass_200: { label: '200 Edges', regions: 'US, EU, Asia, Middle East, Africa' },
  PriceClass_100: { label: '100 Edges', regions: 'US, EU only' },
};

function getPriceClassInfo(pc: string) {
  return PRICE_CLASS_LABELS[pc] ?? { label: pc, regions: 'Unknown' };
}

// Extract approximate region from S3 origin domain
function originToRegion(origin: string): string | null {
  const match = origin.match(/\.s3[.-]([a-z0-9-]+)\.amazonaws\.com/);
  return match?.[1] ?? null;
}

const PALETTE = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

// ── DistributionCard ─────────────────────────────────────────────────────────

function DistributionCard({
  dist,
  bucketStats,
  onDelete,
  onDisable,
  disabling,
}: {
  dist: Distribution;
  bucketStats: {
    fileCount: number;
    totalSizeBytes: number;
    reads: number;
    writes: number;
    dataTransferBytes: number;
    cfCost: number;
    cacheHits: number;
    cacheMisses: number;
    cacheHitRate: number;
    cacheMissRate: number;
    fileTypeBreakdown: { type: string; count: number; color: string }[];
  } | null;
  onDelete: (d: Distribution) => void;
  onDisable: (d: Distribution) => void;
  disabling: boolean;
}) {
  const pcInfo = getPriceClassInfo(dist.priceClass);
  const originRegions = dist.origins.map(originToRegion).filter((r): r is string => r !== null);
  const uniqueRegions = [...new Set(originRegions)];

  // A distribution is considered "linked" if it has a tracked bucket OR has CNAMEs in use
  // Origins always exist in CloudFront, so we check tracked linkage + custom domains
  const isLinked = !!dist.linkedBucket || dist.alternativeDomains.length > 0;
  const canDisable = dist.enabled && !isLinked;

  // Build mini transfer rod from cost data
  const hasStats =
    bucketStats &&
    (bucketStats.reads > 0 || bucketStats.writes > 0 || bucketStats.dataTransferBytes > 0);
  const transferSegments = hasStats
    ? [
        { label: 'Reads', value: bucketStats!.reads, color: PALETTE[0] },
        { label: 'Writes', value: bucketStats!.writes, color: PALETTE[1] },
        {
          label: 'Transfer',
          value: bucketStats!.dataTransferBytes / (1024 * 1024),
          color: PALETTE[2],
        },
      ].filter((s) => s.value > 0)
    : [];
  const transferTotal = transferSegments.reduce((s, seg) => s + seg.value, 0);
  const cacheSegments = bucketStats
    ? [
        { label: 'Hit', value: bucketStats.cacheHits, color: PALETTE[1] },
        { label: 'Miss', value: bucketStats.cacheMisses, color: PALETTE[4] },
      ].filter((segment) => segment.value > 0)
    : [];
  const cacheTotal = cacheSegments.reduce((sum, segment) => sum + segment.value, 0);

  // File type rod
  const ftBreakdown = bucketStats?.fileTypeBreakdown ?? [];
  const ftTotal = ftBreakdown.reduce((s, seg) => s + seg.count, 0);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      className="group h-full"
    >
      <div className="relative flex flex-col h-full overflow-hidden rounded-xl border border-border/50 bg-card transition-all duration-200 hover:border-border hover:scale-[1.008]">
        <div className="flex flex-col gap-2.5 p-4 flex-1">
          {/* ── Header ── */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              {/* Flag from origin region or globe */}
              {uniqueRegions.length > 0 ? (
                <div className="flex -space-x-1.5 shrink-0">
                  {uniqueRegions.slice(0, 3).map((region) => (
                    <motion.div
                      key={region}
                      whileHover={{ y: -4 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      className="overflow-hidden rounded-full ring-2 ring-card"
                    >
                      <CircleFlag countryCode={getRegionAlpha2(region)} height={22} width={22} />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="size-6 shrink-0 rounded-full border border-border bg-muted flex items-center justify-center">
                  <Globe className="size-3 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <a
                  href={`https://${dist.domainName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold truncate hover:text-primary transition-colors flex items-center gap-1"
                >
                  {dist.domainName}
                  <ExternalLink className="size-2.5 shrink-0 opacity-50" />
                </a>
                <p className="text-[10px] text-muted-foreground font-mono truncate">{dist.id}</p>
              </div>
            </div>
            {/* Status badge */}
            <Badge
              variant={dist.enabled ? 'success' : 'destructive'}
              className={`text-[10px] px-1.5 py-0 shrink-0 `}
            >
              {dist.enabled ? 'Active' : 'Disabled'}
            </Badge>
          </div>

          {/* ── Key metrics ── */}
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div>
              <p className="text-muted-foreground">Status</p>
              <p className="font-medium">{dist.status}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Price Class</p>
              <HoverCard openDelay={300} closeDelay={100}>
                <HoverCardTrigger asChild>
                  <p className="font-medium cursor-default">{pcInfo.label}</p>
                </HoverCardTrigger>
                <HoverCardContent side="bottom" className="w-48 p-3">
                  <p className="text-xs font-semibold">{pcInfo.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{pcInfo.regions}</p>
                </HoverCardContent>
              </HoverCard>
            </div>
            <div>
              <p className="text-muted-foreground">Origins</p>
              <HoverCard openDelay={300} closeDelay={100}>
                <HoverCardTrigger asChild>
                  <p className="font-medium cursor-default">
                    {dist.origins.length} source{dist.origins.length !== 1 ? 's' : ''}
                  </p>
                </HoverCardTrigger>
                <HoverCardContent side="bottom" className="w-64 p-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Origins
                  </p>
                  <div className="space-y-1">
                    {dist.origins.map((o, i) => (
                      <p key={i} className="text-[11px] font-mono truncate">
                        {o}
                      </p>
                    ))}
                  </div>
                </HoverCardContent>
              </HoverCard>
            </div>
          </div>

          {/* ── Linked bucket + stats ── */}
          {dist.linkedBucket ? (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/40 border border-border/30">
              <Database className="size-3 text-primary shrink-0" />
              <Link
                href={`/buckets/${dist.linkedBucket.id}`}
                className="text-[11px] font-medium hover:text-primary transition-colors truncate"
              >
                {dist.linkedBucket.name}
              </Link>
              {bucketStats && (
                <span className="ml-auto text-[10px] text-muted-foreground tabular-nums shrink-0">
                  {bucketStats.fileCount} files · {formatBytes(bucketStats.totalSizeBytes)}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/20 border border-dashed border-border/40">
              <Database className="size-3 text-muted-foreground/50 shrink-0" />
              <span className="text-[10px] text-muted-foreground">
                Not linked to a tracked bucket
              </span>
            </div>
          )}

          {/* ── Rods ── */}
          <div className="space-y-2">
            {/* File type distribution */}
            {ftTotal > 0 && (
              <div className="space-y-0.5">
                <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">
                  File Types · {ftTotal}
                </p>
                <div className="flex h-1.5 w-full overflow-hidden rounded-full transition-all duration-150 hover:h-2">
                  {ftBreakdown.map((seg) => (
                    <div
                      key={seg.type}
                      className="h-full"
                      style={{
                        width: `${(seg.count / ftTotal) * 100}%`,
                        backgroundColor: seg.color,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Transfer / activity rod */}
            {transferTotal > 0 && (
              <HoverCard openDelay={200} closeDelay={100}>
                <HoverCardTrigger asChild>
                  <div className="space-y-0.5 cursor-default">
                    <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">
                      Activity
                    </p>
                    <div className="flex h-1.5 w-full overflow-hidden rounded-full transition-all duration-150 hover:h-2">
                      {transferSegments.map((s) => (
                        <div
                          key={s.label}
                          className="h-full"
                          style={{
                            width: `${(s.value / transferTotal) * 100}%`,
                            backgroundColor: s.color,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </HoverCardTrigger>
                <HoverCardContent side="top" className="w-44 p-3">
                  <div className="space-y-1.5">
                    {transferSegments.map((s) => (
                      <div key={s.label} className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: s.color }}
                          />
                          <span className="text-muted-foreground">{s.label}</span>
                        </div>
                        <span className="font-medium tabular-nums">
                          {s.label === 'Transfer'
                            ? `${s.value.toFixed(1)} MB`
                            : s.value.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </HoverCardContent>
              </HoverCard>
            )}

            {/* Cache efficiency rod */}
            {cacheTotal > 0 && bucketStats && (
              <HoverCard openDelay={200} closeDelay={100}>
                <HoverCardTrigger asChild>
                  <div className="space-y-0.5 cursor-default">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">
                        Cache
                      </p>
                      <span className="text-[9px] font-medium tabular-nums text-muted-foreground">
                        {formatRate(bucketStats.cacheHitRate)} hit
                      </span>
                    </div>
                    <div
                      className="flex h-1.5 w-full overflow-hidden rounded-full transition-all duration-150 hover:h-2"
                      role="img"
                      aria-label="Cache hit and miss distribution"
                    >
                      {cacheSegments.map((segment) => (
                        <div
                          key={segment.label}
                          className="h-full"
                          style={{
                            width: `${(segment.value / cacheTotal) * 100}%`,
                            backgroundColor: segment.color,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </HoverCardTrigger>
                <HoverCardContent side="top" className="w-48 p-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: PALETTE[0] }}
                        />
                        <span className="text-muted-foreground">Hits</span>
                      </div>
                      <span className="font-medium tabular-nums">
                        {bucketStats.cacheHits.toLocaleString()} (
                        {formatRate(bucketStats.cacheHitRate)})
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: PALETTE[3] }}
                        />
                        <span className="text-muted-foreground">Misses</span>
                      </div>
                      <span className="font-medium tabular-nums">
                        {bucketStats.cacheMisses.toLocaleString()} (
                        {formatRate(bucketStats.cacheMissRate)})
                      </span>
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/40">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              {dist.alternativeDomains.length > 0 && (
                <HoverCard openDelay={300} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    <span className="cursor-default flex items-center gap-0.5">
                      <Shield className="size-2.5" />
                      {dist.alternativeDomains.length} CNAME
                      {dist.alternativeDomains.length !== 1 ? 's' : ''}
                    </span>
                  </HoverCardTrigger>
                  <HoverCardContent side="bottom" className="w-56 p-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Alternative Domains
                    </p>
                    {dist.alternativeDomains.map((d) => (
                      <p key={d} className="text-[11px] font-mono truncate">
                        {d}
                      </p>
                    ))}
                  </HoverCardContent>
                </HoverCard>
              )}
              {bucketStats && bucketStats.cfCost > 0 && (
                <>
                  <span className="text-border">·</span>
                  <span className="tabular-nums">{formatCost(bucketStats.cfCost)}/mo</span>
                </>
              )}
              {dist.lastModified && (
                <>
                  <span className="text-border">·</span>
                  <span className="flex items-center gap-0.5">
                    <Clock className="size-2.5" />
                    {new Date(dist.lastModified).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Disable — only when not linked to anything and currently enabled */}
              {canDisable && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] text-amber-500 hover:text-amber-600"
                  onClick={() => onDisable(dist)}
                  disabled={disabling}
                  title="Disable this distribution (no tracked bucket or CNAME linked)"
                >
                  {disabling ? (
                    <Loader2 className="size-2.5 mr-1 animate-spin" />
                  ) : (
                    <PauseCircle className="size-2.5 mr-1" />
                  )}
                  Disable
                </Button>
              )}
              {/* Delete — only when already disabled */}
              {!dist.enabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] text-destructive hover:text-destructive"
                  onClick={() => onDelete(dist)}
                >
                  <Trash2 className="size-2.5 mr-1" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function DistributionCardSkeleton() {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-xl border border-border/50 bg-card">
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-start gap-2.5">
            <Skeleton className="size-6 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-3.5 w-44 max-w-full" />
              <Skeleton className="mt-1 h-2.5 w-28 max-w-full" />
            </div>
          </div>
          <Skeleton className="h-5 w-14 shrink-0 rounded-full" />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-2.5 w-8" />
            <Skeleton className="h-3 w-10" />
          </div>
          <div className="flex flex-col gap-1">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>
          <div className="flex flex-col gap-1">
            <Skeleton className="h-2.5 w-10" />
            <Skeleton className="h-3 w-14" />
          </div>
        </div>

        <Skeleton className="h-7 w-full rounded-lg" />

        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-2.5 w-10" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-2.5 w-12" />
              <Skeleton className="h-2.5 w-10" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/40 pt-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-2.5 w-10" />
            <Skeleton className="h-2.5 w-12" />
          </div>
          <div className="flex items-center gap-1">
            <Skeleton className="h-6 w-14 rounded-md" />
            <Skeleton className="h-6 w-14 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

function DistributionsPageSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border/50 bg-card/60 px-4 py-3">
        <div className="flex items-center gap-2 shrink-0">
          <Skeleton className="size-4 rounded-full" />
          <Skeleton className="h-3.5 w-20" />
        </div>

        <div className="h-7 w-px bg-border/50 hidden sm:block" />

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-18" />
        </div>

        <div className="h-7 w-px bg-border/50 hidden sm:block" />

        <div className="w-28 shrink-0 gap-1">
          <Skeleton className="h-2.5 w-12" />
          <Skeleton className="h-1.5 w-full rounded-full" />
        </div>

        <div className="h-7 w-px bg-border/50 hidden sm:block" />

        <div className="w-32 shrink-0 gap-1">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-2.5 w-12" />
            <Skeleton className="h-3 w-10" />
          </div>
          <Skeleton className="h-1.5 w-full rounded-full" />
          <Skeleton className="h-2.5 w-24" />
        </div>

        <div className="h-7 w-px bg-border/50 hidden sm:block" />

        <Skeleton className="h-8 w-24 rounded-md" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 items-stretch">
        {Array.from({ length: 8 }).map((_, index) => (
          <DistributionCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function DistributionsPage() {
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Distribution | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [disablingId, setDisablingId] = useState<string | null>(null);

  const { buckets } = useBuckets();
  const { inventory } = useBucketInventory(buckets);
  const { bucketAnalytics } = useAnalytics();
  const { buckets: bucketExpenses } = useExpenses();

  const fetchDistributions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/distributions');
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch distributions');
      }
      const data = await res.json();
      setDistributions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDistributions();
  }, [fetchDistributions]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/distributions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ distributionId: deleteTarget.id }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete');
      }
      toast.success(`Distribution ${deleteTarget.id} deletion started`);
      setDeleteTarget(null);
      fetchDistributions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const handleDisable = async (dist: Distribution) => {
    setDisablingId(dist.id);
    try {
      const res = await fetch('/api/distributions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ distributionId: dist.id }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to disable');
      }
      toast.success('Distribution disabled — you can now delete it once it reaches Deployed state');
      fetchDistributions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to disable distribution');
    } finally {
      setDisablingId(null);
    }
  };

  const activeCount = distributions.filter((d) => d.enabled).length;
  const disabledCount = distributions.filter((d) => !d.enabled).length;
  const deployingCount = distributions.filter((d) => d.enabled && d.status === 'InProgress').length;

  // Distribution density rod — enabled / deploying / disabled proportions
  const distRodSegments = useMemo(() => {
    const deployed = distributions.filter((d) => d.enabled && d.status !== 'InProgress').length;
    const deploying = distributions.filter((d) => d.enabled && d.status === 'InProgress').length;
    const disabled = distributions.filter((d) => !d.enabled).length;
    const total = distributions.length;
    if (total === 0) return [];
    return [
      { label: 'Active', value: deployed, color: 'var(--chart-1)' },
      { label: 'Deploying', value: deploying, color: 'var(--chart-3)' },
      { label: 'Disabled', value: disabled, color: 'var(--chart-5)' },
    ].filter((s) => s.value > 0);
  }, [distributions]);

  // Map bucket stats by linked bucket id
  const bucketStatsMap = useMemo(() => {
    const map: Record<
      string,
      {
        fileCount: number;
        totalSizeBytes: number;
        reads: number;
        writes: number;
        dataTransferBytes: number;
        cfCost: number;
        cacheHits: number;
        cacheMisses: number;
        cacheHitRate: number;
        cacheMissRate: number;
        fileTypeBreakdown: { type: string; count: number; color: string }[];
      }
    > = {};
    for (const b of buckets) {
      const inv = inventory[b.id];
      const analytics = bucketAnalytics.find((a) => a.bucketId === b.id);
      const expense = bucketExpenses.find((e) => e.bucketId === b.id);
      if (inv || analytics || expense) {
        map[b.id] = {
          fileCount: inv?.fileCount ?? 0,
          totalSizeBytes: inv?.totalSizeBytes ?? 0,
          reads: analytics?.readRequests ?? 0,
          writes: analytics?.writeRequests ?? 0,
          dataTransferBytes: expense?.dataTransferBytes ?? 0,
          cfCost:
            (expense?.costBreakdown.cfDataTransfer ?? 0) + (expense?.costBreakdown.cfRequests ?? 0),
          cacheHits: analytics?.cacheHits ?? 0,
          cacheMisses: analytics?.cacheMisses ?? 0,
          cacheHitRate: analytics?.cacheHitRate ?? 0,
          cacheMissRate: analytics?.cacheMissRate ?? 0,
          fileTypeBreakdown: inv?.fileTypeBreakdown ?? [],
        };
      }
    }
    return map;
  }, [buckets, inventory, bucketAnalytics, bucketExpenses]);

  const cacheOverview = useMemo(() => {
    let cacheHits = 0;
    let cacheMisses = 0;

    for (const distribution of distributions) {
      if (!distribution.linkedBucket) continue;
      const stats = bucketStatsMap[distribution.linkedBucket.id];
      if (!stats) continue;
      cacheHits += stats.cacheHits;
      cacheMisses += stats.cacheMisses;
    }

    const total = cacheHits + cacheMisses;

    return {
      cacheHits,
      cacheMisses,
      total,
      cacheHitRate: total > 0 ? cacheHits / total : 0,
      cacheMissRate: total > 0 ? cacheMisses / total : 0,
    };
  }, [distributions, bucketStatsMap]);

  // Compute total transfer and cost for one-liner
  const totalTransfer = useMemo(() => {
    let total = 0;
    for (const d of distributions) {
      if (d.linkedBucket) {
        total += bucketStatsMap[d.linkedBucket.id]?.dataTransferBytes ?? 0;
      }
    }
    return total;
  }, [distributions, bucketStatsMap]);

  const totalCfCost = useMemo(() => {
    let total = 0;
    for (const d of distributions) {
      if (d.linkedBucket) {
        total += bucketStatsMap[d.linkedBucket.id]?.cfCost ?? 0;
      }
    }
    return total;
  }, [distributions, bucketStatsMap]);

  return (
    <PageTransition>
      {loading ? (
        <DistributionsPageSkeleton />
      ) : (
        <div className="space-y-5">
          {/* ── One-liner ── */}
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border/50 bg-card/60 px-4 py-3">
            <div className="flex items-center gap-2 shrink-0">
              <Globe className="size-4 text-primary" />
              <span className="text-xs font-semibold">CloudFront</span>
            </div>

            <div className="h-7 w-px bg-border/50 hidden sm:block" />

            {/* Quick stats */}
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground shrink-0">
              <span>
                <span className="font-semibold text-foreground text-xs">
                  {distributions.length}
                </span>{' '}
                distributions
              </span>
              <span className="flex items-center gap-0.5">
                <CheckCircle2 className="size-2.5 text-emerald-500" />
                <span className="font-semibold text-foreground text-xs">{activeCount}</span> active
              </span>
              {deployingCount > 0 && (
                <span className="flex items-center gap-0.5">
                  <Loader2 className="size-2.5 text-amber-400 animate-spin" />
                  <span className="font-semibold text-foreground text-xs">
                    {deployingCount}
                  </span>{' '}
                  deploying
                </span>
              )}
              {disabledCount > 0 && (
                <span className="flex items-center gap-0.5">
                  <XCircle className="size-2.5 text-red-500" />
                  <span className="font-semibold text-foreground text-xs">
                    {disabledCount}
                  </span>{' '}
                  disabled
                </span>
              )}
            </div>

            {/* Distribution density rod */}
            {distRodSegments.length > 0 && (
              <>
                <div className="h-7 w-px bg-border/50 hidden sm:block" />
                <HoverCard openDelay={200} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    <div className="w-28 shrink-0 space-y-0.5 cursor-default">
                      <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                        Status
                      </p>
                      <div className="flex h-1.5 w-full overflow-hidden rounded-full transition-all duration-150 hover:h-2">
                        {distRodSegments.map((s) => (
                          <div
                            key={s.label}
                            style={{
                              width: `${(s.value / distributions.length) * 100}%`,
                              backgroundColor: s.color,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent side="bottom" className="w-44 p-3">
                    <div className="space-y-1.5">
                      {distRodSegments.map((s) => (
                        <div
                          key={s.label}
                          className="flex items-center justify-between text-[10px]"
                        >
                          <div className="flex items-center gap-1.5">
                            <span
                              className="size-2 rounded-full"
                              style={{ backgroundColor: s.color }}
                            />
                            <span className="text-muted-foreground">{s.label}</span>
                          </div>
                          <span className="font-medium tabular-nums">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </>
            )}

            {cacheOverview.total > 0 && (
              <>
                <div className="h-7 w-px bg-border/50 hidden sm:block" />
                <HoverCard openDelay={200} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    <div className="w-32 shrink-0 space-y-0.5 cursor-default">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                          Cache
                        </p>
                        <span className="text-[10px] font-semibold tabular-nums text-foreground">
                          {formatRate(cacheOverview.cacheHitRate)}
                        </span>
                      </div>
                      <div className="flex h-1.5 w-full overflow-hidden rounded-full transition-all duration-150 hover:h-2">
                        <div
                          className="h-full"
                          style={{
                            width: `${cacheOverview.cacheHitRate * 100}%`,
                            backgroundColor: PALETTE[0],
                          }}
                        />
                        <div
                          className="h-full"
                          style={{
                            width: `${cacheOverview.cacheMissRate * 100}%`,
                            backgroundColor: PALETTE[3],
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {formatRate(cacheOverview.cacheHitRate)} hit ·{' '}
                        {formatRate(cacheOverview.cacheMissRate)} miss
                      </p>
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent side="bottom" className="w-48 p-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: PALETTE[0] }}
                          />
                          <span className="text-muted-foreground">Hits</span>
                        </div>
                        <span className="font-medium tabular-nums">
                          {cacheOverview.cacheHits.toLocaleString()} (
                          {formatRate(cacheOverview.cacheHitRate)})
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: PALETTE[3] }}
                          />
                          <span className="text-muted-foreground">Misses</span>
                        </div>
                        <span className="font-medium tabular-nums">
                          {cacheOverview.cacheMisses.toLocaleString()} (
                          {formatRate(cacheOverview.cacheMissRate)})
                        </span>
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </>
            )}

            <div className="h-7 w-px bg-border/50 hidden sm:block" />

            {/* Data transfer */}
            {totalTransfer > 0 && (
              <>
                <div className="shrink-0">
                  <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                    Data Transfer
                  </p>
                  <p className="text-xs font-semibold tabular-nums">{formatBytes(totalTransfer)}</p>
                </div>
                <div className="h-7 w-px bg-border/50 hidden sm:block" />
              </>
            )}

            {/* CF cost */}
            {totalCfCost > 0 && (
              <>
                <div className="shrink-0">
                  <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                    CF Cost/mo
                  </p>
                  <p className="text-xs font-semibold tabular-nums">{formatCost(totalCfCost)}</p>
                </div>
                <div className="h-7 w-px bg-border/50 hidden sm:block" />
              </>
            )}

            <div className="flex-1" />

            {/* Actions */}
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={fetchDistributions}
              disabled={loading}
            >
              <RefreshCw className={`mr-1 size-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* ── Content ── */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading distributions...</span>
            </div>
          ) : error ? (
            <div className="py-12 text-center space-y-2">
              <AlertTriangle className="size-8 mx-auto text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
              <p className="text-xs text-muted-foreground">
                Make sure your AWS credentials are configured with CloudFront read permissions.
              </p>
            </div>
          ) : distributions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Server className="mb-3 size-10 opacity-40" />
              <p className="text-sm font-medium">No CloudFront distributions found</p>
              <p className="text-xs mt-1">
                Distributions are created automatically when you deploy a bucket with CDN.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 items-stretch">
              <AnimatePresence mode="popLayout">
                {distributions.map((dist) => (
                  <DistributionCard
                    key={dist.id}
                    dist={dist}
                    bucketStats={
                      dist.linkedBucket ? (bucketStatsMap[dist.linkedBucket.id] ?? null) : null
                    }
                    onDelete={setDeleteTarget}
                    onDisable={handleDisable}
                    disabling={disablingId === dist.id}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Delete confirmation dialog */}
          <AlertDialog
            open={!!deleteTarget}
            onOpenChange={(open) => !open && setDeleteTarget(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete CloudFront Distribution</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the distribution{' '}
                  <span className="font-mono font-medium">{deleteTarget?.id}</span> (
                  {deleteTarget?.domainName}). This action cannot be undone.
                  <br />
                  <br />
                  The distribution will be disabled first (if not already), then deleted once it
                  reaches Deployed state. This may take several minutes.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="mr-1.5 size-3.5 animate-spin" /> Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-1.5 size-3.5" /> Delete Distribution
                    </>
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </PageTransition>
  );
}
