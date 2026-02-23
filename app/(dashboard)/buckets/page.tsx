// Buckets listing page with create, deploy, and full-delete controls
"use client";

import { useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTransition } from "@/components/page-transition";
import { BucketsTable } from "@/features/buckets/components/buckets-table";
import { CreateBucketDialog } from "@/features/buckets/components/create-bucket-dialog";
import { DeleteBucketDialog } from "@/features/buckets/components/delete-bucket-dialog";
import { SyncStatusDialog } from "@/features/infrastructure/components/sync-status-dialog";
import { useBuckets, useCreateBucket, useDeleteBucket } from "@/features/buckets/hooks/use-buckets";
import { useProjects } from "@/features/projects/hooks/use-projects";
import { useDeployBucket } from "@/features/infrastructure/hooks/use-deploy-bucket";
import { useFiles } from "@/features/files/hooks/use-files";
import type { BucketFormValues } from "@/lib/validations";
import type { Bucket } from "@/lib/types";

export default function BucketsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Bucket | null>(null);
  const [syncOpen, setSyncOpen] = useState(false);
  const { buckets, loading, refetch } = useBuckets();
  const { projects } = useProjects();
  const { createBucket, loading: creating } = useCreateBucket();
  const { deleteBucket } = useDeleteBucket();
  const { deploy } = useDeployBucket();
  const { files } = useFiles();

  const handleCreate = async (data: BucketFormValues) => {
    const result = await createBucket(data);
    if (result) {
      toast.success(`Bucket "${result.name}" created`);
      setDialogOpen(false);
      refetch();
    } else {
      toast.error("Failed to create bucket");
    }
  };

  const handleDelete = async (id: string) => {
    const success = await deleteBucket(id);
    if (success) {
      toast.success("Bucket metadata removed");
      refetch();
    } else {
      toast.error("Failed to delete bucket");
    }
  };

  const handleFullDelete = (bucket: Bucket) => {
    setDeleteTarget(bucket);
  };

  const handleDeploy = async (bucket: Bucket) => {
    toast.info(`Deploying ${bucket.name}... This may take a few minutes.`);
    const result = await deploy(bucket.id, bucket.s3BucketName, bucket.region);
    if (result.success) {
      toast.success("Deployment complete!");
      refetch();
    } else {
      toast.error(`Deployment failed: ${result.error}`);
    }
  };

  const fileCountForBucket = (bucket: Bucket | null) =>
    bucket ? files.filter((f) => f.bucketName === bucket.s3BucketName).length : 0;

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Buckets</h1>
            <p className="text-muted-foreground">
              Manage S3 buckets and CloudFront distributions.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setSyncOpen(true)}>
              <RefreshCw className="mr-2 size-4" />
              Sync with AWS
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 size-4" />
              New Bucket
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Buckets</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            ) : (
              <BucketsTable
                buckets={buckets}
                onDelete={handleDelete}
                onFullDelete={handleFullDelete}
                onDeploy={handleDeploy}
              />
            )}
          </CardContent>
        </Card>

        <CreateBucketDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleCreate}
          projects={projects}
          loading={creating}
        />

        <DeleteBucketDialog
          open={!!deleteTarget}
          onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
          bucket={deleteTarget}
          fileCount={fileCountForBucket(deleteTarget)}
          onComplete={() => {
            setDeleteTarget(null);
            refetch();
            toast.success("Bucket fully deleted from AWS");
          }}
        />

        <SyncStatusDialog
          open={syncOpen}
          onOpenChange={setSyncOpen}
          onSynced={() => {
            refetch();
            toast.success("Buckets synced with AWS");
          }}
        />
      </div>
    </PageTransition>
  );
}
