// Buckets listing page with create, deploy, search, AWS sync, and full-delete controls
"use client";

import { useState } from "react";
import { Plus, RefreshCw, Search, Cloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageTransition } from "@/components/page-transition";
import { BucketsTable } from "@/features/buckets/components/buckets-table";
import { CreateBucketDialog } from "@/features/buckets/components/create-bucket-dialog";
import { DeleteBucketDialog } from "@/features/buckets/components/delete-bucket-dialog";
import { AwsSyncDialog } from "@/features/buckets/components/aws-sync-dialog";
import { SyncStatusDialog } from "@/features/infrastructure/components/sync-status-dialog";
import {
  useBuckets,
  useCreateBucket,
  useDeleteBucket,
} from "@/features/buckets/hooks/use-buckets";
import { useProjects } from "@/features/projects/hooks/use-projects";
import { useDeployBucket } from "@/features/infrastructure/hooks/use-deploy-bucket";
import { useFiles } from "@/features/files/hooks/use-files";
import type { BucketFormValues } from "@/lib/validations";
import type { Bucket } from "@/lib/types";
import { useEnvironments } from "@/features/environments/hooks/use-environments";

export default function BucketsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Bucket | null>(null);
  const [syncOpen, setSyncOpen] = useState(false);
  const [awsSyncOpen, setAwsSyncOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { buckets, loading, refetch } = useBuckets();
  const { projects } = useProjects();
  const { createBucket, loading: creating } = useCreateBucket();
  const { deleteBucket } = useDeleteBucket();
  const { deploy } = useDeployBucket();
  const { files } = useFiles();
  const { environments } = useEnvironments();

  // Filter buckets by search query
  const filteredBuckets = buckets.filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      b.s3BucketName.toLowerCase().includes(q) ||
      b.region.toLowerCase().includes(q) ||
      b.status.toLowerCase().includes(q)
    );
  });

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

  const handleImportBuckets = async (
    awsBuckets: { name: string; creationDate: string; region: string }[]
  ) => {
    let imported = 0;
    for (const ab of awsBuckets) {
      try {
        const res = await fetch("/api/buckets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: projects[0]?.id || "",
            name: ab.name,
            region: ab.region,
            versioning: false,
            encryption: "s3",
            backupEnabled: false,
            maxFileSizeMB: 100,
          }),
        });
        if (res.ok) imported++;
      } catch {
        // continue with next bucket
      }
    }
    toast.success(`Imported ${imported} bucket${imported !== 1 ? "s" : ""}`);
    refetch();
    setAwsSyncOpen(false);
  };

  const fileCountForBucket = (bucket: Bucket | null) =>
    bucket
      ? files.filter((f) => f.bucketName === bucket.s3BucketName).length
      : 0;

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
            <Button
              variant="outline"
              onClick={() => setAwsSyncOpen(true)}
            >
              <Cloud className="mr-2 size-4" />
              Discover AWS Buckets
            </Button>
            <Button
              variant="outline"
              onClick={() => setSyncOpen(true)}
              data-tour-step-id="tour-sync-aws"
            >
              <RefreshCw className="mr-2 size-4" />
              Sync Status
            </Button>
            <Button
              onClick={() => setDialogOpen(true)}
              data-tour-step-id="tour-new-bucket"
            >
              <Plus className="mr-2 size-4" />
              New Bucket
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Buckets</CardTitle>
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search buckets by name, region, status…"
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            ) : filteredBuckets.length === 0 && search ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="mb-3 size-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No buckets match &quot;{search}&quot;
                </p>
              </div>
            ) : (
              <BucketsTable
                buckets={filteredBuckets}
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
          environments={environments}
        />

        <DeleteBucketDialog
          open={!!deleteTarget}
          onOpenChange={(v) => {
            if (!v) setDeleteTarget(null);
          }}
          bucket={deleteTarget}
          fileCount={fileCountForBucket(deleteTarget)}
          onComplete={() => {
            setDeleteTarget(null);
            refetch();
            toast.success("Bucket fully deleted from AWS");
          }}
        />

        <AwsSyncDialog
          open={awsSyncOpen}
          onOpenChange={setAwsSyncOpen}
          trackedBuckets={buckets}
          onImport={handleImportBuckets}
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
