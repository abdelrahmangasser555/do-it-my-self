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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageTransition } from '@/components/page-transition';
import { BucketCard } from '@/features/buckets/components/bucket-card';
import { CreateBucketDialog } from '@/features/buckets/components/create-bucket-dialog';
import { DeleteBucketDialog } from '@/features/buckets/components/delete-bucket-dialog';
import { AwsSyncDialog } from '@/features/buckets/components/aws-sync-dialog';
import { ConnectCdnDialog } from '@/features/buckets/components/connect-cdn-dialog';
import { SyncStatusDialog } from '@/features/infrastructure/components/sync-status-dialog';
import { useBuckets, useCreateBucket, useDeleteBucket } from '@/features/buckets/hooks/use-buckets';
import { useProjects } from '@/features/projects/hooks/use-projects';
import { useDeployBucket } from '@/features/infrastructure/hooks/use-deploy-bucket';
import { useFiles } from '@/features/files/hooks/use-files';
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
  const [search, setSearch] = useState('');
  const { buckets, loading, refetch } = useBuckets();
  const { projects } = useProjects();
  const { createBucket, loading: creating } = useCreateBucket();
  const { deleteBucket } = useDeleteBucket();
  const { deploy } = useDeployBucket();
  const { files } = useFiles();
  const { environments } = useEnvironments();
  const { bucketAnalytics } = useAnalytics();

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
    setAwsSyncOpen(false);
  };

  // Per-bucket file stats
  const bucketStats = useMemo(() => {
    const stats = new Map<string, { fileCount: number; totalSizeBytes: number }>();
    for (const bucket of buckets) {
      const bucketFiles = files.filter((f) => f.bucketName === bucket.s3BucketName);
      stats.set(bucket.id, {
        fileCount: bucketFiles.length,
        totalSizeBytes: bucketFiles.reduce((sum, f) => sum + (f.size || 0), 0),
      });
    }
    return stats;
  }, [buckets, files]);

  const fileCountForBucket = (bucket: Bucket | null) =>
    bucket ? (bucketStats.get(bucket.id)?.fileCount ?? 0) : 0;

  // Summary stats
  const summaryStats = useMemo(() => {
    let totalFiles = 0;
    let totalBytes = 0;
    let activeCount = 0;
    for (const bucket of buckets) {
      const s = bucketStats.get(bucket.id);
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
      totalFiles,
      totalStorage: formatBytes(totalBytes),
    };
  }, [buckets, bucketStats]);

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
      }
      if (failed > 0 && uploaded === 0) {
        toast.error(`All ${failed} upload${failed !== 1 ? 's' : ''} failed`);
      }
    },
    [projects, refetch],
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
        <div className="flex items-center w-80 rounded-md border border-input bg-transparent shadow-xs">
          <Search className="ml-3 size-4 text-muted-foreground shrink-0" />
          <Input
            placeholder="Search buckets by name, region, status…"
            className="border-0 shadow-none focus-visible:ring-0"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

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
                const stats = bucketStats.get(bucket.id) || {
                  fileCount: 0,
                  totalSizeBytes: 0,
                };
                const analytics = bucketAnalytics.find((a) => a.bucketId === bucket.id);
                // Build file type breakdown from local file metadata
                const bucketFiles = files.filter((f) => f.bucketName === bucket.s3BucketName);
                const extCounts = new Map<string, number>();
                for (const f of bucketFiles) {
                  const ext = (f.objectKey ?? '').split('.').pop()?.toLowerCase() || 'other';
                  extCounts.set(ext, (extCounts.get(ext) ?? 0) + 1);
                }
                const FILE_TYPE_COLORS: Record<string, string> = {
                  jpg: '#3b82f6',
                  jpeg: '#3b82f6',
                  png: '#8b5cf6',
                  gif: '#ec4899',
                  webp: '#f59e0b',
                  svg: '#14b8a6',
                  mp4: '#ef4444',
                  mov: '#ef4444',
                  avi: '#ef4444',
                  webm: '#ef4444',
                  pdf: '#f97316',
                  doc: '#2563eb',
                  docx: '#2563eb',
                  xls: '#22c55e',
                  xlsx: '#22c55e',
                  json: '#eab308',
                  csv: '#a3e635',
                  txt: '#94a3b8',
                  html: '#e11d48',
                  css: '#06b6d4',
                  js: '#facc15',
                  ts: '#3b82f6',
                  zip: '#a78bfa',
                  rar: '#a78bfa',
                  gz: '#a78bfa',
                  other: '#6b7280',
                };
                const fileTypeBreakdown = Array.from(extCounts.entries())
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 6)
                  .map(([type, count]) => ({
                    type,
                    count,
                    color: FILE_TYPE_COLORS[type] ?? '#6b7280',
                  }));
                return (
                  <BucketCard
                    key={bucket.id}
                    bucket={bucket}
                    fileCount={stats.fileCount}
                    totalSizeBytes={stats.totalSizeBytes}
                    analytics={analytics}
                    fileTypeBreakdown={fileTypeBreakdown}
                    onDelete={handleDelete}
                    onFullDelete={handleFullDelete}
                    onDeploy={handleDeploy}
                    onConnectCDN={(b) => setConnectCdnTarget(b)}
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

        <SyncStatusDialog
          open={syncOpen}
          onOpenChange={setSyncOpen}
          onSynced={() => {
            refetch();
            toast.success('Buckets synced with AWS');
          }}
        />
      </div>
    </PageTransition>
  );
}
