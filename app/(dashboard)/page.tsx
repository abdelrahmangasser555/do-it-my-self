// Main dashboard page with analytics overview, charts, and export
"use client";

import { PageTransition } from "@/components/page-transition";
import { AnalyticsCards } from "@/features/infrastructure/components/analytics-cards";
import { BucketAnalyticsTable } from "@/features/infrastructure/components/bucket-analytics-table";
import {
  StorageBarChart,
  StoragePieChart,
  CostBarChart,
  RequestsBarChart,
} from "@/features/infrastructure/components/storage-charts";
import {
  CostSummaryCards,
  ProjectExpensesTable,
  CostByServiceBreakdown,
} from "@/features/infrastructure/components/cost-tables";
import { useAnalytics } from "@/features/infrastructure/hooks/use-analytics";
import { useExpenses } from "@/features/infrastructure/hooks/use-expenses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, RefreshCw, FileSpreadsheet, FileJson, DollarSign } from "lucide-react";
import {
  exportAnalyticsToCSV,
  exportAnalyticsToJSON,
  downloadFile,
} from "@/features/infrastructure/utils/analytics-export";

export default function DashboardPage() {
  const { summary, bucketAnalytics, loading, syncedAt, refetch } = useAnalytics();
  const {
    summary: costSummary,
    projects: projectExpenses,
    loading: expensesLoading,
    refetch: refetchExpenses,
  } = useExpenses();

  const handleExportCSV = () => {
    if (!summary) return;
    const csv = exportAnalyticsToCSV(summary, bucketAnalytics);
    const date = new Date().toISOString().slice(0, 10);
    downloadFile(csv, `analytics-${date}.csv`, "text/csv");
  };

  const handleExportJSON = () => {
    if (!summary) return;
    const json = exportAnalyticsToJSON(summary, bucketAnalytics);
    const date = new Date().toISOString().slice(0, 10);
    downloadFile(json, `analytics-${date}.json`, "application/json");
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Overview of your storage infrastructure.
            </p>            {syncedAt && (
              <p className="text-xs text-muted-foreground mt-1">
                Last synced: {new Date(syncedAt).toLocaleString()}
              </p>
            )}          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { refetch(); refetchExpenses(); }}
              disabled={loading}
            >
              <RefreshCw className={`mr-2 size-3.5 ${loading ? "animate-spin" : ""}`} />
              Sync
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={!summary}>
                  <Download className="mr-2 size-3.5" />
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

        <AnalyticsCards summary={summary} loading={loading} />

        {/* Charts grid */}
        {!loading && bucketAnalytics.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            <StorageBarChart bucketAnalytics={bucketAnalytics} />
            <StoragePieChart bucketAnalytics={bucketAnalytics} />
            <CostBarChart bucketAnalytics={bucketAnalytics} />
            <RequestsBarChart bucketAnalytics={bucketAnalytics} />
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Bucket Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <BucketAnalyticsTable data={bucketAnalytics} />
          </CardContent>
        </Card>

        {/* ── Overall Cost Section ──────────────────────────────────────── */}
        <Separator />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="size-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Cost Overview</h2>
              <p className="text-sm text-muted-foreground">
                Estimated AWS costs across all projects and buckets
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refetchExpenses}
            disabled={expensesLoading}
          >
            <RefreshCw
              className={`size-3.5 mr-1.5 ${
                expensesLoading ? "animate-spin" : ""
              }`}
            />
            Refresh Costs
          </Button>
        </div>

        <CostSummaryCards summary={costSummary} loading={expensesLoading} />

        <div className="grid gap-6 lg:grid-cols-2">
          <CostByServiceBreakdown
            services={
              costSummary
                ? [
                    { service: "S3 Storage", cost: costSummary.s3StorageCost },
                    { service: "S3 Requests", cost: costSummary.s3RequestsCost },
                    {
                      service: "S3 Data Transfer",
                      cost: costSummary.s3DataTransferCost,
                    },
                    {
                      service: "CloudFront Transfer",
                      cost: costSummary.cfDataTransferCost,
                    },
                    {
                      service: "CloudFront Requests",
                      cost: costSummary.cfRequestsCost,
                    },
                  ]
                : []
            }
          />

          {/* Cost per project ranking */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Cost per Project</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {expensesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-6 rounded bg-muted animate-pulse"
                    />
                  ))}
                </div>
              ) : projectExpenses.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No projects found.
                </p>
              ) : (
                [...projectExpenses]
                  .sort(
                    (a, b) =>
                      b.costBreakdown.total - a.costBreakdown.total
                  )
                  .map((pe) => {
                    const maxCost = Math.max(
                      ...projectExpenses.map((p) => p.costBreakdown.total),
                      0.0001
                    );
                    const pct =
                      (pe.costBreakdown.total / maxCost) * 100;
                    return (
                      <div key={pe.projectId} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="truncate font-medium">
                            {pe.projectName}
                          </span>
                          <span className="font-mono text-muted-foreground">
                            ${pe.costBreakdown.total.toFixed(4)}
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{
                              width: `${Math.max(pct, 2)}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="size-4" />
              Project Cost Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectExpensesTable expenses={projectExpenses} />
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
