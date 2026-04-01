// Buckets listing page with create, deploy, search, AWS sync, and full-delete controls
'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Plus,
  RefreshCw,
  Search,
  Cloud,
  Database,
  HardDrive,
  Activity,
  FileStack,
} from 'lucide-react';
import { toast } from 'sonner';
import { AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageTransition } from '@/components/page-transition';
import { BucketCard } from '@/features/buckets/components/bucket-card';
import { CreateBucketDialog } from '@/features/buckets/components/create-bucket-dialog';
import { DeleteBucketDialog } from '@/features/buckets/components/delete-bucket-dialog';
import { AwsSyncDialog } from '@/features/buckets/components/aws-sync-dialog';
import { ConnectCdnDialog } from '@/features/buckets/components/connect-cdn-dialog';
import { ConnectProjectDialog } from '@/features/buckets/components/connect-project-dialog';
import { SyncStatusDialog } from '@/features/infrastructure/components/sync-status-dialog';
import {
  useBuckets,
  useCreateBucket,
  useDeleteBucket,
  useUpdateBucket,
} from '@/features/buckets/hooks/use-buckets';
import { useBucketInventory } from '@/features/buckets/hooks/use-bucket-inventory';
import { useProjects } from '@/features/projects/hooks/use-projects';
import { useDeployBucket } from '@/features/infrastructure/hooks/use-deploy-bucket';
import type { BucketFormValues } from '@/lib/validations';
import type { Bucket } from '@/lib/types';
import { useEnvironments } from '@/features/environments/hooks/use-environments';
import { useAnalytics } from '@/features/infrastructure/hooks/use-analytics';

export default function BucketsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Bucket | null>(null);
  const [syncOpen, setSyncOpen] = useState(false);
  const [awsSyncOpen, setAwsSyncOpen] = useState(false);
  const [connectCdnTarget, setConnectCdnTarget] = useState<Bucket | null>(null);
  const [connectProjectTarget, setConnectProjectTarget] = useState<Bucket | null>(null);
  const [search, setSearch] = useState('');
  const { buckets, loading, refetch } = useBuckets();
  const { projects } = useProjects();
  const { createBucket, loading: creating } = useCreateBucket();
  const { deleteBucket } = useDeleteBucket();
  const { updateBucket, loading: updatingBucket } = useUpdateBucket();
  const { deploy } = useDeployBucket();
  const { environments } = useEnvironments();
  const { bucketAnalytics, refetch: refetchAnalytics } = useAnalytics();
  const {
    inventory,
    totals: inventoryTotals,
    refetch: refetchInventory,
  } = useBucketInventory(buckets);

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

  const handleCreate = async (data: BucketFormValues, deploy?: boolean) => {
    const result = await createBucket(data);
    if (result) {
      toast.success(`Bucket "${result.name}" created`);
      setDialogOpen(false);
      refetch();
      if (deploy) {
        // Trigger deploy via infrastructure API
        await handleDeploy(result);
      }
    } else {
      toast.error('Failed to create bucket');
    }
  };

  const handleDelete = async (id: string) => {
    const success = await deleteBucket(id);
    if (success) {
      toast.success('Bucket metadata removed');
      refetch();
    } else {
      toast.error('Failed to delete bucket');
    }
  };

  const handleFullDelete = (bucket: Bucket) => {
    setDeleteTarget(bucket);
  };

  const handleDeploy = async (bucket: Bucket) => {
    toast.info(`Deploying ${bucket.name}... This may take a few minutes.`);
    const result = await deploy(bucket.id, bucket.s3BucketName, bucket.region);
    if (result.success) {
      toast.success('Deployment complete!');
      refetch();
    } else {
      toast.error(`Deployment failed: ${result.error}`);
    }
  };

  const handleImportBuckets = async (
    awsBuckets: { name: string; creationDate: string; region: string }[],
  ) => {
    try {
      const res = await fetch('/api/buckets/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buckets: awsBuckets }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Imported ${data.imported} bucket${data.imported !== 1 ? 's' : ''}`);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Import failed');
      }
    } catch {
      toast.error('Failed to import buckets');
    }
    refetch();
    refetchInventory();
    refetchAnalytics();
    setAwsSyncOpen(false);
  };

  const fileCountForBucket = (bucket: Bucket | null) =>
    bucket ? (inventory[bucket.id]?.fileCount ?? 0) : 0;

  // Summary stats
  const summaryStats = useMemo(() => {
    let totalFiles = 0;
    let totalBytes = 0;
    let activeCount = 0;
    for (const bucket of buckets) {
      const s = inventory[bucket.id];
      if (s) {
        totalFiles += s.fileCount;
        totalBytes += s.totalSizeBytes;
      }
      if (bucket.status === 'active') activeCount++;
    }
    const formatBytes = (bytes: number) => {
      if (bytes === 0) return '0 B';
      const units = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return `${(bytes / Math.pow(1024, i)).toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
    };
    return {
      total: buckets.length,
      active: activeCount,
      totalFiles: inventoryTotals.totalFiles || totalFiles,
      totalStorage: formatBytes(inventoryTotals.totalSizeBytes || totalBytes),
    };
  }, [buckets, inventory, inventoryTotals]);

  const projectNames = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects],
  );

  const handleConnectProject = async (projectId: string) => {
    if (!connectProjectTarget) return;
    const updated = await updateBucket(connectProjectTarget.id, { projectId });
    if (!updated) {
      toast.error('Failed to connect bucket to project');
      return;
    }
    toast.success('Bucket connected to project');
    setConnectProjectTarget(null);
    refetch();
  };

  // Drag-and-drop upload handler
  const handleFileDrop = useCallback(
    async (bucket: Bucket, droppedFiles: File[]) => {
      const project = projects.find((p) => p.id === bucket.projectId);
      if (!project) {
        toast.error('Bucket has no associated project');
        return;
      }

      let uploaded = 0;
      let failed = 0;

      for (const file of droppedFiles) {
        try {
          // Request presigned upload URL
          const res = await fetch('/api/files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: file.name,
              fileSize: file.size,
              mimeType: file.type || 'application/octet-stream',
              projectId: bucket.projectId,
              bucketName: bucket.s3BucketName,
            }),
          });

          if (!res.ok) {
            const data = await res.json();
            toast.error(`Failed: ${file.name} — ${data.error || 'Unknown error'}`);
            failed++;
            continue;
          }

          const { uploadUrl } = await res.json();

          // Upload file to S3 via presigned URL
          const uploadRes = await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type || 'application/octet-stream' },
          });

          if (uploadRes.ok) {
            uploaded++;
          } else {
            failed++;
            toast.error(`Upload failed: ${file.name}`);
          }
        } catch {
          failed++;
          toast.error(`Upload error: ${file.name}`);
        }
      }

      if (uploaded > 0) {
        toast.success(`Uploaded ${uploaded} file${uploaded !== 1 ? 's' : ''} to ${bucket.name}`);
        refetch();
        refetchInventory();
        refetchAnalytics();
      }
      if (failed > 0 && uploaded === 0) {
        toast.error(`All ${failed} upload${failed !== 1 ? 's' : ''} failed`);
      }
    },
    [projects, refetch, refetchAnalytics, refetchInventory],
  );

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Buckets</h1>
            <p className="text-muted-foreground">Manage S3 buckets and CloudFront distributions.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAwsSyncOpen(true)}>
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
            <Button onClick={() => setDialogOpen(true)} data-tour-step-id="tour-new-bucket">
              <Plus className="mr-2 size-4" />
              New Bucket
            </Button>
          </div>
        </div>

        {/* Search bar */}
        <InputGroup className="w-80">
          <InputGroupInput
            placeholder="Search buckets by name, region, status…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <InputGroupAddon align="inline-end">
            <Search />
          </InputGroupAddon>
        </InputGroup>

        {/* Summary strip */}
        {buckets.length > 0 && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              {
                icon: Database,
                label: 'Total Buckets',
                value: summaryStats.total,
              },
              {
                icon: Activity,
                label: 'Active',
                value: summaryStats.active,
              },
              {
                icon: FileStack,
                label: 'Total Files',
                value: summaryStats.totalFiles,
              },
              {
                icon: HardDrive,
                label: 'Total Storage',
                value: summaryStats.totalStorage,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-3"
              >
                <stat.icon className="size-5 text-muted-foreground/60" />
                <div>
                  <p className="text-sm font-semibold leading-none">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Content area */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : filteredBuckets.length === 0 && search ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="mb-3 size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No buckets match &quot;{search}&quot;</p>
          </div>
        ) : filteredBuckets.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Database className="mb-4 size-12 text-muted-foreground/30" />
              <h3 className="text-lg font-semibold">No buckets yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Create your first S3 bucket to get started.
              </p>
              <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 size-4" />
                New Bucket
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {filteredBuckets.map((bucket) => {
                const stats = inventory[bucket.id] || {
                  fileCount: inventory[bucket.id]?.fileCount ?? 0,
                  totalSizeBytes: inventory[bucket.id]?.totalSizeBytes ?? 0,
                  files: [],
                  fileTypeBreakdown: [],
                };
                const analytics = bucketAnalytics.find((a) => a.bucketId === bucket.id);
                const fileTypeBreakdown = inventory[bucket.id]?.fileTypeBreakdown ?? [];
                return (
                  <BucketCard
                    key={bucket.id}
                    bucket={bucket}
                    projectName={projectNames.get(bucket.projectId)}
                    fileCount={stats.fileCount}
                    totalSizeBytes={stats.totalSizeBytes}
                    analytics={analytics}
                    fileTypeBreakdown={fileTypeBreakdown}
                    onDelete={handleDelete}
                    onFullDelete={handleFullDelete}
                    onDeploy={handleDeploy}
                    onConnectCDN={(b) => setConnectCdnTarget(b)}
                    onConnectProject={(b) => setConnectProjectTarget(b)}
                    onFileDrop={handleFileDrop}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        )}

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
            toast.success('Bucket fully deleted from AWS');
          }}
        />

        <AwsSyncDialog
          open={awsSyncOpen}
          onOpenChange={setAwsSyncOpen}
          trackedBuckets={buckets}
          onImport={handleImportBuckets}
        />

        <ConnectCdnDialog
          open={!!connectCdnTarget}
          onOpenChange={(v) => {
            if (!v) setConnectCdnTarget(null);
          }}
          bucket={connectCdnTarget}
          onComplete={() => {
            setConnectCdnTarget(null);
            refetch();
          }}
        />

        <ConnectProjectDialog
          open={!!connectProjectTarget}
          onOpenChange={(open) => {
            if (!open) setConnectProjectTarget(null);
          }}
          bucket={connectProjectTarget}
          projects={projects}
          loading={updatingBucket}
          onConfirm={handleConnectProject}
        />

        <SyncStatusDialog
          open={syncOpen}
          onOpenChange={setSyncOpen}
          onSynced={() => {
            refetch();
            refetchInventory();
            refetchAnalytics();
            toast.success('Buckets synced with AWS');
          }}
        />
      </div>
    </PageTransition>
  );
}
