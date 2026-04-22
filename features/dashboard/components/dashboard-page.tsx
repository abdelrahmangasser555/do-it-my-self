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
import { StackedFlags, AllProjectsStorageRod } from '@/features/projects/components/project-cards';
import { FileTypeRod } from '@/features/buckets/components/bucket-card';
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
import {
  formatBytes,
  formatCost,
  getActivityData,
  getAggregatedBreakdown,
  getAllRegions,
  getStorageByProjectId,
} from '@/features/dashboard/utils/dashboard-metrics';

const COST_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

export function DashboardPage() {
  const { summary, bucketAnalytics, loading, syncedAt, refetch } = useAnalytics();
  const {
    summary: costSummary,
    projects: projectExpenses,
    loading: expensesLoading,
    refetch: refetchExpenses,
  } = useExpenses();
  const { projects } = useProjects();
  const { buckets } = useBuckets();
  const { inventory } = useBucketInventory(buckets);

  const allRegions = useMemo(() => getAllRegions(buckets), [buckets]);

  const storageByProjectId = useMemo(
    () =>
      getStorageByProjectId(
        projects.map((project) => project.id),
        buckets,
        inventory,
      ),
    [projects, buckets, inventory],
  );

  const aggregatedBreakdown = useMemo(
    () => getAggregatedBreakdown(buckets, inventory),
    [buckets, inventory],
  );

  const activityData = useMemo(() => getActivityData(buckets, inventory), [buckets, inventory]);
  const hasActivity = activityData.some((value) => value > 0);

  const totalFiles = summary?.totalFiles ?? 0;
  const totalStorage = summary?.totalStorageBytes ?? 0;
  const costServices = costSummary
    ? [
        { service: 'S3 Storage', cost: costSummary.s3StorageCost },
        { service: 'S3 Requests', cost: costSummary.s3RequestsCost },
        { service: 'S3 Transfer', cost: costSummary.s3DataTransferCost },
        { service: 'CF Transfer', cost: costSummary.cfDataTransferCost },
        { service: 'CF Requests', cost: costSummary.cfRequestsCost },
      ]
    : [];
  const totalCost = costServices.reduce((sum, service) => sum + service.cost, 0);

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
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border/50 bg-card/60 px-4 py-3">
          <StackedFlags regions={allRegions} buckets={buckets} />

          <div className="h-7 w-px bg-border/50 hidden sm:block" />

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

          <div className="min-w-16">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Est. Cost/mo
            </p>
            <p className="text-xs font-semibold tabular-nums">
              {formatCost(costSummary?.totalMonthlyCost ?? 0)}
            </p>
          </div>

          <div className="h-7 w-px bg-border/50 hidden sm:block" />

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

        {totalCost > 0 && (
          <div className="rounded-xl border border-border/50 bg-card/60 px-4 py-3 space-y-2">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Cost Breakdown · {formatCost(totalCost)}/mo
            </p>
            <div className="flex h-2 w-full overflow-hidden rounded-full">
              {costServices
                .filter((service) => service.cost > 0)
                .map((service, index) => (
                  <div
                    key={service.service}
                    className="h-full transition-all"
                    style={{
                      width: `${(service.cost / totalCost) * 100}%`,
                      backgroundColor: COST_COLORS[index % COST_COLORS.length],
                    }}
                  />
                ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {costServices.map((service, index) => (
                <div key={service.service} className="flex items-center gap-1.5 text-[10px]">
                  <span
                    className="size-2 rounded-full shrink-0"
                    style={{ backgroundColor: COST_COLORS[index % COST_COLORS.length] }}
                  />
                  <span className="text-muted-foreground">{service.service}</span>
                  <span className="font-medium tabular-nums">{formatCost(service.cost)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && bucketAnalytics.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            <StorageBarChart bucketAnalytics={bucketAnalytics} />
            <StoragePieChart bucketAnalytics={bucketAnalytics} />
            <CostBarChart bucketAnalytics={bucketAnalytics} />
            <RequestsBarChart bucketAnalytics={bucketAnalytics} />
          </div>
        )}

        <div className="rounded-xl border border-border/50 bg-card/60">
          <div className="px-4 py-3 border-b border-border/40">
            <p className="text-sm font-medium">Bucket Breakdown</p>
          </div>
          <div className="p-4">
            <BucketAnalyticsTable data={bucketAnalytics} />
          </div>
        </div>

        <Separator />

        <div className="grid gap-6 lg:grid-cols-2">
          <CostByServiceBreakdown services={costServices} />

          <div className="rounded-xl border border-border/50 bg-card/60">
            <div className="px-4 py-3 border-b border-border/40">
              <p className="text-sm font-medium">Cost per Project</p>
            </div>
            <div className="p-4 space-y-3">
              {expensesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((index) => (
                    <div key={index} className="h-6 rounded bg-muted animate-pulse" />
                  ))}
                </div>
              ) : projectExpenses.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No projects found.</p>
              ) : (
                [...projectExpenses]
                  .sort((a, b) => b.costBreakdown.total - a.costBreakdown.total)
                  .map((projectExpense) => {
                    const maxCost = Math.max(
                      ...projectExpenses.map((project) => project.costBreakdown.total),
                      0.0001,
                    );
                    const width = (projectExpense.costBreakdown.total / maxCost) * 100;

                    return (
                      <div key={projectExpense.projectId} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="truncate font-medium">{projectExpense.projectName}</span>
                          <span className="font-mono text-muted-foreground">
                            ${projectExpense.costBreakdown.total.toFixed(4)}
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${Math.max(width, 2)}%` }}
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
