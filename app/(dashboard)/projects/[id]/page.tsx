// Project detail page showing buckets and files for a specific project
"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, DollarSign, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { PageTransition } from "@/components/page-transition";
import { BucketsTable } from "@/features/buckets/components/buckets-table";
import { FilesTable } from "@/features/files/components/files-table";
import { AnalyticsCards } from "@/features/infrastructure/components/analytics-cards";
import {
  CostSummaryCards,
  BucketExpensesTable,
  CostBreakdownTable,
  CostByServiceBreakdown,
} from "@/features/infrastructure/components/cost-tables";
import { useBuckets, useDeleteBucket } from "@/features/buckets/hooks/use-buckets";
import { useFiles, useDeleteFile } from "@/features/files/hooks/use-files";
import { useAnalytics } from "@/features/infrastructure/hooks/use-analytics";
import { useDeployBucket } from "@/features/infrastructure/hooks/use-deploy-bucket";
import { useExpenses } from "@/features/infrastructure/hooks/use-expenses";
import { useProjects } from "@/features/projects/hooks/use-projects";
import { toast } from "sonner";
import type { Bucket } from "@/lib/types";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { projects } = useProjects();
  const project = projects.find((p) => p.id === id);
  const { buckets, refetch: refetchBuckets } = useBuckets(id);
  const { files, refetch: refetchFiles } = useFiles(id);
  const { summary, loading: analyticsLoading } = useAnalytics(id);
  const {
    summary: costSummary,
    buckets: bucketExpenses,
    loading: expensesLoading,
    refetch: refetchExpenses,
  } = useExpenses(id);
  const { deleteBucket } = useDeleteBucket();
  const { deleteFile } = useDeleteFile();
  const { deploy } = useDeployBucket();

  const handleDeleteBucket = async (bucketId: string) => {
    const success = await deleteBucket(bucketId);
    if (success) {
      toast.success("Bucket deleted");
      refetchBuckets();
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    const success = await deleteFile(fileId);
    if (success) {
      toast.success("File record deleted");
      refetchFiles();
    }
  };

  const handleDeploy = async (bucket: Bucket) => {
    toast.info(`Deploying ${bucket.name}...`);
    const result = await deploy(bucket.id, bucket.s3BucketName, bucket.region);
    if (result.success) {
      toast.success("Deployment complete!");
      refetchBuckets();
    } else {
      toast.error(`Deployment failed: ${result.error}`);
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {project?.name || "Project"}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              {project && (
                <>
                  <Badge
                    variant={
                      project.environment === "prod" ? "default" : "secondary"
                    }
                  >
                    {project.environment}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Max {project.maxFileSizeMB} MB
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <AnalyticsCards summary={summary} loading={analyticsLoading} />

        <Tabs defaultValue="buckets">
          <TabsList>
            <TabsTrigger value="buckets">
              Buckets ({buckets.length})
            </TabsTrigger>
            <TabsTrigger value="files">Files ({files.length})</TabsTrigger>
            <TabsTrigger value="pricing" className="gap-1.5">
              <DollarSign className="size-3.5" />
              Pricing
            </TabsTrigger>
          </TabsList>
          <TabsContent value="buckets">
            <Card>
              <CardHeader>
                <CardTitle>Project Buckets</CardTitle>
              </CardHeader>
              <CardContent>
                <BucketsTable
                  buckets={buckets}
                  onDelete={handleDeleteBucket}
                  onDeploy={handleDeploy}
                />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="files">
            <Card>
              <CardHeader>
                <CardTitle>Project Files</CardTitle>
              </CardHeader>
              <CardContent>
                <FilesTable files={files} onDelete={handleDeleteFile} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-6">
            {/* Cost summary cards */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Project Cost Breakdown</h2>
                <p className="text-sm text-muted-foreground">
                  Estimated monthly AWS costs for all resources in this project
                </p>
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
                Refresh
              </Button>
            </div>

            <CostSummaryCards summary={costSummary} loading={expensesLoading} />

            {/* Service breakdown + cost chart side by side */}
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

              {/* Per-bucket total cost ranking */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Cost per Bucket</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {expensesLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-6 rounded bg-muted animate-pulse" />
                      ))}
                    </div>
                  ) : bucketExpenses.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No buckets in this project yet.
                    </p>
                  ) : (
                    [...bucketExpenses]
                      .sort(
                        (a, b) =>
                          b.costBreakdown.total - a.costBreakdown.total
                      )
                      .map((be) => {
                        const maxCost = Math.max(
                          ...bucketExpenses.map((b) => b.costBreakdown.total),
                          0.0001
                        );
                        const pct =
                          (be.costBreakdown.total / maxCost) * 100;
                        return (
                          <div key={be.bucketId} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="truncate font-medium">
                                {be.displayName}
                              </span>
                              <span className="font-mono text-muted-foreground">
                                ${be.costBreakdown.total.toFixed(4)}
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

            <Separator />

            {/* Detailed bucket expenses table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="size-4" />
                  Bucket Expenses Detail
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BucketExpensesTable expenses={bucketExpenses} />
              </CardContent>
            </Card>

            {/* Individual bucket cost breakdowns */}
            {bucketExpenses.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Per-Bucket Line-Item Breakdown
                </h3>
                <div className="grid gap-4 lg:grid-cols-2">
                  {bucketExpenses.map((be) => (
                    <CostBreakdownTable
                      key={be.bucketId}
                      breakdown={be.costBreakdown}
                      title={be.displayName}
                    />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
}
