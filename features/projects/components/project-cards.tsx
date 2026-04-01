// Card-based project grid with context menu actions
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  FolderKanban,
  Database,
  Trash2,
  ExternalLink,
  AlertTriangle,
  Plus,
  HardDrive,
  Eye,
  DollarSign,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Sparklines, SparklinesLine } from 'react-sparklines';
import { CircleFlag } from 'react-circle-flags';
import { getRegionAlpha2 } from '@/lib/region-flags';
import { FileTypeRod } from '@/features/buckets/components/bucket-card';
import { useBucketInventory } from '@/features/buckets/hooks/use-bucket-inventory';
import { useAnalytics } from '@/features/infrastructure/hooks/use-analytics';
import { useExpenses } from '@/features/infrastructure/hooks/use-expenses';
import type { Project, Bucket } from '@/lib/types';

interface ProjectCardsProps {
  projects: Project[];
  buckets: Bucket[];
  onDelete: (id: string) => void;
  onAddBucket?: (project: Project) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}

function buildActivityData(files: { lastModified: string; size?: number }[], days = 12): number[] {
  const now = Date.now();
  const data = new Array(days).fill(0);
  for (const f of files) {
    const age = (now - new Date(f.lastModified).getTime()) / (1000 * 60 * 60 * 24);
    const idx = days - 1 - Math.floor(age);
    if (idx >= 0 && idx < days) {
      const sizeKB = (f.size ?? 0) / 1024;
      const weight = sizeKB > 0 ? Math.min(Math.sqrt(sizeKB), 8) : 1;
      data[idx] += weight;
    }
  }
  return data;
}

// ── Stacked Region Flags ──────────────────────────────────────────────────────

function StackedFlags({ regions }: { regions: string[] }) {
  const unique = [...new Set(regions)].slice(0, 5);
  if (unique.length === 0) {
    return (
      <div className="flex size-6.5 shrink-0 items-center justify-center rounded-full border border-border bg-muted">
        <FolderKanban className="size-3 text-muted-foreground" />
      </div>
    );
  }
  return (
    <div className="flex items-center shrink-0">
      <div className="flex -space-x-1.5">
        {unique.map((region, i) => (
          <div
            key={region}
            className="overflow-hidden rounded-full ring-2 ring-card"
            style={{ zIndex: unique.length - i }}
          >
            <CircleFlag countryCode={getRegionAlpha2(region)} height={24} width={24} />
          </div>
        ))}
      </div>
      {regions.length > 5 && (
        <span className="ml-1.5 text-[10px] text-muted-foreground">+{regions.length - 5}</span>
      )}
    </div>
  );
}

// ── Progress Ring ─────────────────────────────────────────────────────────────

function ProgressRing({ percent, size = 72 }: { percent: number; size?: number }) {
  const r = (size - 10) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = (percent / 100) * circumference;
  const hue = percent >= 80 ? 0 : percent >= 50 ? 40 : 142;
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        className="text-muted/30"
        strokeWidth={4}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={`hsl(${hue}, 72%, 50%)`}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference - filled}`}
        strokeDashoffset={circumference * 0.25}
        className="transition-all duration-700 ease-out"
      />
    </svg>
  );
}

// ── Bucket Storage Rod ────────────────────────────────────────────────────────

const BUCKET_PALETTE = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

function BucketStorageRod({
  buckets,
  storageByBucket,
}: {
  buckets: Bucket[];
  storageByBucket: Record<string, number>;
}) {
  const total = Object.values(storageByBucket).reduce((s, v) => s + v, 0);
  if (total === 0) return null;

  const segments = buckets
    .filter((b) => (storageByBucket[b.id] ?? 0) > 0)
    .map((b, i) => ({
      name: b.name,
      bytes: storageByBucket[b.id] ?? 0,
      pct: ((storageByBucket[b.id] ?? 0) / total) * 100,
      color: BUCKET_PALETTE[i % BUCKET_PALETTE.length],
    }));

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div
          className="flex h-1.5 w-full cursor-default overflow-hidden rounded-full transition-all duration-150 hover:h-2"
          role="img"
          aria-label="Bucket storage distribution"
        >
          {segments.map((s) => (
            <div
              key={s.name}
              className="h-full"
              style={{ width: `${s.pct}%`, backgroundColor: s.color }}
            />
          ))}
        </div>
      </HoverCardTrigger>
      <HoverCardContent side="top" align="center" className="w-52 p-3">
        <p className="text-[11px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
          Bucket Storage
        </p>
        <div className="space-y-1.5">
          {segments.map((s) => (
            <div key={s.name} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span
                  className="size-2 rounded-full shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-xs text-foreground truncate max-w-25">{s.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium tabular-nums">{formatBytes(s.bytes)}</span>
                <span className="text-[10px] text-muted-foreground">({Math.round(s.pct)}%)</span>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t mt-2 pt-2 flex justify-between text-[10px] text-muted-foreground">
          <span>Total</span>
          <span className="font-medium text-foreground">{formatBytes(total)}</span>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ProjectCards({ projects, buckets, onDelete, onAddBucket }: ProjectCardsProps) {
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const { inventory } = useBucketInventory(buckets);
  const { bucketAnalytics } = useAnalytics();
  const { buckets: bucketExpenses } = useExpenses();

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <FolderKanban className="mb-4 size-12 opacity-40" />
        <p className="text-sm font-medium">No projects yet</p>
        <p className="text-xs mt-1">Create your first project to get started.</p>
      </div>
    );
  }

  const getBucketsForProject = (projectId: string) =>
    buckets.filter((b) => b.projectId === projectId);

  const handleDeleteAttempt = (project: Project) => {
    const pb = getBucketsForProject(project.id);
    if (pb.length > 0) setDeleteTarget(project);
    else onDelete(project.id);
  };

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project, i) => {
          const projectBuckets = getBucketsForProject(project.id);
          const hasBuckets = projectBuckets.length > 0;
          const isProd = project.environment === 'prod';

          // ── Aggregate metrics ──
          const allFiles = projectBuckets.flatMap((b) => inventory[b.id]?.files ?? []);
          const totalFiles = projectBuckets.reduce(
            (s, b) => s + (inventory[b.id]?.fileCount ?? 0),
            0,
          );
          const totalStorageBytes = projectBuckets.reduce(
            (s, b) => s + (inventory[b.id]?.totalSizeBytes ?? 0),
            0,
          );
          const totalReads = projectBuckets.reduce((s, b) => {
            const a = bucketAnalytics.find((a) => a.bucketId === b.id);
            return s + (a?.readRequests ?? 0);
          }, 0);
          const totalCost = projectBuckets.reduce((s, b) => {
            const e = bucketExpenses.find((e) => e.bucketId === b.id);
            return s + (e?.costBreakdown.total ?? 0);
          }, 0);

          // ── Aggregate file type breakdown ──
          const typeMap = new Map<string, { count: number; color: string }>();
          for (const b of projectBuckets) {
            for (const seg of inventory[b.id]?.fileTypeBreakdown ?? []) {
              const existing = typeMap.get(seg.type);
              if (existing) existing.count += seg.count;
              else typeMap.set(seg.type, { count: seg.count, color: seg.color });
            }
          }
          const aggregatedBreakdown = Array.from(typeMap.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .map(([type, { count, color }]) => ({ type, count, color }));

          // ── Per-bucket storage for rod ──
          const storageByBucket: Record<string, number> = {};
          for (const b of projectBuckets) {
            storageByBucket[b.id] = inventory[b.id]?.totalSizeBytes ?? 0;
          }

          // ── Unique regions ──
          const regions = [...new Set(projectBuckets.map((b) => b.region).filter(Boolean))];

          // ── Usage % (50 GB project cap) ──
          const PROJECT_CAP = 50 * 1024 * 1024 * 1024;
          const usagePct = Math.min((totalStorageBytes / PROJECT_CAP) * 100, 100);

          // ── Activity sparkline ──
          const activityData = buildActivityData(allFiles);
          const hasActivity = activityData.some((v) => v > 0);

          return (
            <ContextMenu key={project.id}>
              <ContextMenuTrigger asChild>
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.2, delay: i * 0.04 }}
                  className="group h-full"
                >
                  <div className="relative flex h-full overflow-hidden rounded-xl border border-border/50 bg-card transition-all duration-200 hover:border-border hover:scale-[1.012]">
                    <div className="flex h-full w-full flex-col gap-3 p-4">
                      {/* ── Header ── */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <StackedFlags regions={regions} />
                          <div className="min-w-0">
                            <Link href={`/projects/${project.id}`}>
                              <h3 className="font-semibold text-sm truncate hover:text-primary transition-colors">
                                {project.name}
                              </h3>
                            </Link>
                            <Badge
                              variant="outline"
                              className={`mt-0.5 text-[10px] px-1.5 py-0 ${
                                isProd
                                  ? 'border-blue-500/30 text-blue-400'
                                  : 'border-emerald-500/30 text-emerald-400'
                              }`}
                            >
                              {project.environment}
                            </Badge>
                          </div>
                        </div>
                        {/* Activity sparkline — top right */}
                        <div
                          style={{ width: 64, height: 20 }}
                          className="opacity-70 shrink-0 mt-0.5"
                        >
                          <Sparklines
                            data={hasActivity ? activityData : new Array(12).fill(0)}
                            height={20}
                            min={0}
                          >
                            <SparklinesLine
                              color="#22c55e"
                              style={{ fill: '#22c55e', fillOpacity: 0.18, strokeWidth: 1.5 }}
                            />
                          </Sparklines>
                        </div>
                      </div>

                      {/* ── Ring + stats ── */}
                      <div className="flex items-center gap-4">
                        <div className="relative shrink-0">
                          <ProgressRing percent={usagePct} size={72} />
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-[11px] font-bold tabular-nums leading-none">
                              {Math.round(usagePct)}%
                            </span>
                            <span className="text-[8px] text-muted-foreground leading-none mt-0.5">
                              used
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 flex-1 min-w-0">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <HardDrive className="size-3" /> Storage
                            </span>
                            <span className="font-medium tabular-nums">
                              {formatBytes(totalStorageBytes)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Eye className="size-3" /> Reads
                            </span>
                            <span className="font-medium tabular-nums">
                              {totalReads.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <DollarSign className="size-3" /> Cost/mo
                            </span>
                            <span className="font-medium tabular-nums">
                              ${totalCost.toFixed(3)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* ── Two distribution rods ── */}
                      <div className="space-y-1.5">
                        <FileTypeRod breakdown={aggregatedBreakdown} />
                        <BucketStorageRod
                          buckets={projectBuckets}
                          storageByBucket={storageByBucket}
                        />
                      </div>

                      {/* ── Footer ── */}
                      <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/40">
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Database className="size-3" />
                            <span className="font-medium text-foreground">
                              {projectBuckets.length}
                            </span>
                            {` bucket${projectBuckets.length !== 1 ? 's' : ''}`}
                          </span>
                          <span className="text-border">·</span>
                          <span>
                            <span className="font-medium text-foreground">{totalFiles}</span> files
                          </span>
                        </div>
                        {/* Add bucket button — appears on hover */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          {onAddBucket && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-[11px] gap-1"
                              onClick={(e) => {
                                e.preventDefault();
                                onAddBucket(project);
                              }}
                            >
                              <Plus className="size-2.5" />
                              Add Bucket
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" asChild>
                            <Link href={`/projects/${project.id}`}>
                              <ExternalLink className="size-3" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </ContextMenuTrigger>

              <ContextMenuContent className="w-48">
                <ContextMenuItem asChild>
                  <Link href={`/projects/${project.id}`}>
                    <ExternalLink className="mr-2 size-3.5" />
                    Open Project
                  </Link>
                </ContextMenuItem>
                {onAddBucket && (
                  <ContextMenuItem onClick={() => onAddBucket(project)}>
                    <Plus className="mr-2 size-3.5" />
                    Add Bucket
                  </ContextMenuItem>
                )}
                <ContextMenuSeparator />
                <ContextMenuItem
                  className="text-destructive focus:text-destructive"
                  disabled={hasBuckets}
                  onClick={() => handleDeleteAttempt(project)}
                >
                  <Trash2 className="mr-2 size-3.5" />
                  {hasBuckets ? "Has buckets — can't delete" : 'Delete Project'}
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
      </div>

      {/* Can't delete dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-yellow-500" />
              Cannot Delete Project
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong> has{' '}
              {deleteTarget ? getBucketsForProject(deleteTarget.id).length : 0} bucket(s). Delete
              all buckets first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Got it
            </Button>
            {deleteTarget && (
              <Button asChild>
                <Link href={`/projects/${deleteTarget.id}`}>Go to Project</Link>
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
