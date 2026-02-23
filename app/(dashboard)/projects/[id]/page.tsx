// Project detail page showing buckets and files for a specific project
"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageTransition } from "@/components/page-transition";
import { BucketsTable } from "@/features/buckets/components/buckets-table";
import { FilesTable } from "@/features/files/components/files-table";
import { AnalyticsCards } from "@/features/infrastructure/components/analytics-cards";
import { useBuckets, useDeleteBucket } from "@/features/buckets/hooks/use-buckets";
import { useFiles, useDeleteFile } from "@/features/files/hooks/use-files";
import { useAnalytics } from "@/features/infrastructure/hooks/use-analytics";
import { useDeployBucket } from "@/features/infrastructure/hooks/use-deploy-bucket";
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
        </Tabs>
      </div>
    </PageTransition>
  );
}
