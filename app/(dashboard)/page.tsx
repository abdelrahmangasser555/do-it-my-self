// Main dashboard page with analytics overview, charts, and export
'use client';

import { useMemo } from 'react';
import { Sparklines, SparklinesLine } from 'react-sparklines';
import { PageTransition } from '@/components/page-transition';
import { BucketAnalyticsTable } from '@/features/infrastructure/components/bucket-analytics-table';
import {
  StorageBarChart,
  StoragePieChart,
  CostBarChart,
  RequestsBarChart,
} from '@/features/infrastructure/components/storage-charts';
import {
  ProjectExpensesTable,
  CostByServiceBreakdown,
} from '@/features/infrastructure/components/cost-tables';
import { useAnalytics } from '@/features/infrastructure/hooks/use-analytics';
import { useExpenses } from '@/features/infrastructure/hooks/use-expenses';
import { useProjects } from '@/features/projects/hooks/use-projects';
import { useBuckets } from '@/features/buckets/hooks/use-buckets';
import { useBucketInventory } from '@/features/buckets/hooks/use-bucket-inventory';
import {
  StackedFlags,
  AllProjectsStorageRod,
  ActivityRod,
} from '@/features/projects/components/project-cards';
import { FileTypeRod } from '@/features/buckets/components/bucket-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, RefreshCw, FileSpreadsheet, FileJson, DollarSign } from 'lucide-react';
import {
  exportAnalyticsToCSV,
  exportAnalyticsToJSON,
  downloadFile,
} from '@/features/infrastructure/utils/analytics-export';

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

export default function DashboardPage() {
  const { summary, bucketAnalytics, loading, syncedAt, refetch } = useAnalytics();
  const {
    summary: costSummary,
    projects: projectExpenses,
    buckets: bucketExpenses,
    loading: expensesLoading,
    refetch: refetchExpenses,
  } = useExpenses();
  const { projects } = useProjects();
  const { buckets } = useBuckets();
  const { inventory } = useBucketInventory(buckets);

  // Aggregated data for one-liner
  const allRegions = useMemo(
    () => [...new Set(buckets.map((b) => b.region).filter(Boolean))],
    [buckets],
  );

  const storageByProjectId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of projects) {
      const pb = buckets.filter((b) => b.projectId === p.id);
      map[p.id] = pb.reduce((s, b) => s + (inventory[b.id]?.totalSizeBytes ?? 0), 0);
    }
    return map;
  }, [projects, buckets, inventory]);

  const aggregatedBreakdown = useMemo(() => {
    const typeMap = new Map<string, { count: number; color: string }>();
    for (const b of buckets) {
      for (const seg of inventory[b.id]?.fileTypeBreakdown ?? []) {
        const ex = typeMap.get(seg.type);
        if (ex) ex.count += seg.count;
        else typeMap.set(seg.type, { count: seg.count, color: seg.color });
      }
    }
    return Array.from(typeMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .map(([type, { count, color }]) => ({ type, count, color }));
  }, [buckets, inventory]);

  const activityData = useMemo(() => {
    const days = 14;
    const now = Date.now();
    const data = new Array(days).fill(0);
    for (const b of buckets) {
      for (const f of inventory[b.id]?.files ?? []) {
        const age = (now - new Date(f.lastModified).getTime()) / (1000 * 60 * 60 * 24);
        const idx = days - 1 - Math.floor(age);
        if (idx >= 0 && idx < days) {
          const sizeKB = (f.size ?? 0) / 1024;
          data[idx] += sizeKB > 0 ? Math.min(Math.sqrt(sizeKB), 8) : 1;
        }
      }
    }
    return data;
  }, [buckets, inventory]);

  const hasActivity = activityData.some((v) => v > 0);

  const totalFiles = summary?.totalFiles ?? 0;
  const totalStorage = summary?.totalStorageBytes ?? 0;

  // Cost breakdown for the cost rod
  const costServices = costSummary
    ? [
        { service: 'S3 Storage', cost: costSummary.s3StorageCost },
        { service: 'S3 Requests', cost: costSummary.s3RequestsCost },
        { service: 'S3 Transfer', cost: costSummary.s3DataTransferCost },
        { service: 'CF Transfer', cost: costSummary.cfDataTransferCost },
        { service: 'CF Requests', cost: costSummary.cfRequestsCost },
      ]
    : [];
  const totalCost = costServices.reduce((s, c) => s + c.cost, 0);

  const COST_COLORS = [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)',
  ];

  const handleExportCSV = () => {
    if (!summary) return;
    const csv = exportAnalyticsToCSV(
      summary,
      bucketAnalytics,
      costSummary ?? undefined,
      projectExpenses,
    );
    const date = new Date().toISOString().slice(0, 10);
    downloadFile(csv, `analytics-${date}.csv`, 'text/csv');
  };

  const handleExportJSON = () => {
    if (!summary) return;
    const json = exportAnalyticsToJSON(
      summary,
      bucketAnalytics,
      costSummary ?? undefined,
      projectExpenses,
    );
    const date = new Date().toISOString().slice(0, 10);
    downloadFile(json, `analytics-${date}.json`, 'application/json');
  };

  return (
    <PageTransition>
      <div className="space-y-5">
        {/* ── One-liner header ── */}
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border/50 bg-card/60 px-4 py-3">
          {/* Region flags */}
          <StackedFlags regions={allRegions} buckets={buckets} />

          <div className="h-7 w-px bg-border/50 hidden sm:block" />

          {/* Quick stats */}
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground shrink-0">
            <span>
              <span className="font-semibold text-foreground text-xs">
                {summary?.totalProjects ?? 0}
              </span>{' '}
              projects
            </span>
            <span>
              <span className="font-semibold text-foreground text-xs">
                {summary?.totalBuckets ?? 0}
              </span>{' '}
              buckets
            </span>
            <span>
              <span className="font-semibold text-foreground text-xs">{totalFiles}</span> files
            </span>
            <span>
              <span className="font-semibold text-foreground text-xs">
                {formatBytes(totalStorage)}
              </span>
            </span>
          </div>

          <div className="h-7 w-px bg-border/50 hidden sm:block" />

          {/* File distribution rod */}
          <div className="flex-1 min-w-28 space-y-1">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              File Distribution · {totalFiles}
            </p>
            {aggregatedBreakdown.length > 0 ? (
              <FileTypeRod breakdown={aggregatedBreakdown} />
            ) : (
              <div className="h-1.5 w-full rounded-full bg-muted" />
            )}
          </div>

          <div className="h-7 w-px bg-border/50 hidden sm:block" />

          {/* Project storage distribution rod */}
          <div className="flex-1 min-w-28 space-y-1">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Project Storage
            </p>
            {projects.length > 0 ? (
              <AllProjectsStorageRod
                allProjects={projects}
                storageByProjectId={storageByProjectId}
              />
            ) : (
              <div className="h-1.5 w-full rounded-full bg-muted" />
            )}
          </div>

          <div className="h-7 w-px bg-border/50 hidden sm:block" />

          {/* Activity sparkline */}
          <div className="space-y-1">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Activity (14d)
            </p>
            <div style={{ width: 72, height: 20 }} className="opacity-80">
              <Sparklines
                data={hasActivity ? activityData : new Array(14).fill(0)}
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

          <div className="h-7 w-px bg-border/50 hidden sm:block" />

          {/* Est. cost */}
          <div className="min-w-16">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Est. Cost/mo
            </p>
            <p className="text-xs font-semibold tabular-nums">
              {formatCost(costSummary?.totalMonthlyCost ?? 0)}
            </p>
          </div>

          <div className="h-7 w-px bg-border/50 hidden sm:block" />

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => {
                refetch();
                refetchExpenses();
              }}
              disabled={loading}
            >
              <RefreshCw className={`mr-1 size-3 ${loading ? 'animate-spin' : ''}`} />
              Sync
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  disabled={!summary}
                >
                  <Download className="mr-1 size-3" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCSV}>
                  <FileSpreadsheet className="mr-2 size-4" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportJSON}>
                  <FileJson className="mr-2 size-4" />
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {syncedAt && (
          <p className="text-[10px] text-muted-foreground">
            Last synced: {new Date(syncedAt).toLocaleString()}
          </p>
        )}

        {/* ── Cost Distribution Rod ── */}
        {totalCost > 0 && (
          <div className="rounded-xl border border-border/50 bg-card/60 px-4 py-3 space-y-2">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Cost Breakdown · {formatCost(totalCost)}/mo
            </p>
            <div className="flex h-2 w-full overflow-hidden rounded-full">
              {costServices
                .filter((s) => s.cost > 0)
                .map((s, i) => (
                  <div
                    key={s.service}
                    className="h-full transition-all"
                    style={{
                      width: `${(s.cost / totalCost) * 100}%`,
                      backgroundColor: COST_COLORS[i % COST_COLORS.length],
                    }}
                  />
                ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {costServices.map((s, i) => (
                <div key={s.service} className="flex items-center gap-1.5 text-[10px]">
                  <span
                    className="size-2 rounded-full shrink-0"
                    style={{ backgroundColor: COST_COLORS[i % COST_COLORS.length] }}
                  />
                  <span className="text-muted-foreground">{s.service}</span>
                  <span className="font-medium tabular-nums">{formatCost(s.cost)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Charts grid */}
        {!loading && bucketAnalytics.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            <StorageBarChart bucketAnalytics={bucketAnalytics} />
            <StoragePieChart bucketAnalytics={bucketAnalytics} />
            <CostBarChart bucketAnalytics={bucketAnalytics} />
            <RequestsBarChart bucketAnalytics={bucketAnalytics} />
          </div>
        )}

        {/* Bucket analytics table */}
        <div className="rounded-xl border border-border/50 bg-card/60">
          <div className="px-4 py-3 border-b border-border/40">
            <p className="text-sm font-medium">Bucket Breakdown</p>
          </div>
          <div className="p-4">
            <BucketAnalyticsTable data={bucketAnalytics} />
          </div>
        </div>

        {/* ── Cost Section ── */}
        <Separator />

        <div className="grid gap-6 lg:grid-cols-2">
          <CostByServiceBreakdown services={costServices} />

          {/* Cost per project ranking */}
          <div className="rounded-xl border border-border/50 bg-card/60">
            <div className="px-4 py-3 border-b border-border/40">
              <p className="text-sm font-medium">Cost per Project</p>
            </div>
            <div className="p-4 space-y-3">
              {expensesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-6 rounded bg-muted animate-pulse" />
                  ))}
                </div>
              ) : projectExpenses.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No projects found.</p>
              ) : (
                [...projectExpenses]
                  .sort((a, b) => b.costBreakdown.total - a.costBreakdown.total)
                  .map((pe) => {
                    const maxCost = Math.max(
                      ...projectExpenses.map((p) => p.costBreakdown.total),
                      0.0001,
                    );
                    const pct = (pe.costBreakdown.total / maxCost) * 100;
                    return (
                      <div key={pe.projectId} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="truncate font-medium">{pe.projectName}</span>
                          <span className="font-mono text-muted-foreground">
                            ${pe.costBreakdown.total.toFixed(4)}
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/50 bg-card/60">
          <div className="px-4 py-3 border-b border-border/40 flex items-center gap-2">
            <DollarSign className="size-4" />
            <p className="text-sm font-medium">Project Cost Breakdown</p>
          </div>
          <div className="p-4">
            <ProjectExpensesTable expenses={projectExpenses} />
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
