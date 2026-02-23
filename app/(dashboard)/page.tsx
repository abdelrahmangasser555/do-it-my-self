// Main dashboard page with analytics overview and charts
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

export default function DashboardPage() {
  const { summary, bucketAnalytics, loading } = useAnalytics();

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your storage infrastructure.
          </p>
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
