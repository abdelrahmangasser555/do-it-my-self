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
import { useAnalytics } from "@/features/infrastructure/hooks/use-analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, RefreshCw, FileSpreadsheet, FileJson } from "lucide-react";
import {
  exportAnalyticsToCSV,
  exportAnalyticsToJSON,
  downloadFile,
} from "@/features/infrastructure/utils/analytics-export";

export default function DashboardPage() {
  const { summary, bucketAnalytics, loading, refetch } = useAnalytics();

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
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              disabled={loading}
            >
              <RefreshCw className="mr-2 size-3.5" />
              Refresh
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
      </div>
    </PageTransition>
  );
}
