// Buckets listing page with create, deploy, search, AWS sync, and full-delete controls
'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, RefreshCw, Search, Database } from 'lucide-react';
import { FaAws } from 'react-icons/fa';
import { Sparklines, SparklinesLine } from 'react-sparklines';
import { toast } from 'sonner';
import { AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageTransition } from '@/components/page-transition';
import { BucketCard, FileTypeRod } from '@/features/buckets/components/bucket-card';
import { StackedFlags } from '@/features/projects/components/project-cards';
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
import { useCompatibilityCheck } from '@/features/buckets/hooks/use-compatibility';

export default function BucketsPage() {
  const router = useRouter();
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
  const { compatMap, makeCompatible } = useCompatibilityCheck(buckets);

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

  const handleCreate = async (data: BucketFormValues, deployNow?: boolean) => {
    const result = await createBucket(data);
    if (result) {
      toast.success(`Bucket "${result.name}" created`);
      setDialogOpen(false);
      refetch();
      if (deployNow) {
        await handleDeploy(result);
      }
      // Navigate to the setup tab of the new bucket
      router.push(`/buckets/${result.id}?tab=setup`);
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

  const allRegions = useMemo(
    () => [...new Set(buckets.map((b) => b.region).filter(Boolean))],
    [buckets],
  );

  const aggregatedBreakdown = useMemo(() => {
    const typeMap = new Map<string, { count: number; color: string }>();
    for (const b of buckets) {
      for (const seg of inventory[b.id]?.fileTypeBreakdown ?? []) {
        const ex = typeMap.get(seg.type);
        if (ex) ex.count += seg.count;
        else typeMap.set(seg.type, { count: seg.count, color: seg.color });
      }
    }
    return Array.from(typeMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .map(([type, { count, color }]) => ({ type, count, color }));
  }, [buckets, inventory]);

  const activityData = useMemo(() => {
    const days = 14;
    const now = Date.now();
    const data = new Array(days).fill(0);
    for (const b of buckets) {
      for (const f of inventory[b.id]?.files ?? []) {
        const age = (now - new Date(f.lastModified).getTime()) / (1000 * 60 * 60 * 24);
        const idx = days - 1 - Math.floor(age);
        if (idx >= 0 && idx < days) {
          const sizeKB = (f.size ?? 0) / 1024;
          data[idx] += sizeKB > 0 ? Math.min(Math.sqrt(sizeKB), 8) : 1;
        }
      }
    }
    return data;
  }, [buckets, inventory]);

  const hasActivity = activityData.some((v) => v > 0);

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

      const total = droppedFiles.length;
      let uploaded = 0;
      let failed = 0;

      // Show overall batch progress toast
      const batchId = `upload-${bucket.id}-${Date.now()}`;
      if (total > 1) {
        toast.loading(`Uploading 0 / ${total} files…`, { id: batchId });
      }

      for (let i = 0; i < droppedFiles.length; i++) {
        const file = droppedFiles[i];
        const fileId = `upload-file-${file.name}-${i}`;

        // Per-file loading toast
        toast.loading(`Uploading ${file.name}…`, { id: fileId });

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
            const data = await res.json().catch(() => ({}));
            const reason = data.error || data.message || `HTTP ${res.status}`;
            const detail = data.details || data.hint || '';
            toast.error(`${file.name} — ${reason}`, {
              id: fileId,
              description: detail || undefined,
            });
            failed++;
            if (total > 1)
              toast.loading(`Uploading ${uploaded + failed} / ${total} files…`, { id: batchId });
            continue;
          }

          const { uploadUrl } = await res.json();

          // Upload file directly to S3 via presigned URL
          const uploadRes = await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type || 'application/octet-stream' },
          });

          if (uploadRes.ok) {
            uploaded++;
            toast.success(`${file.name} uploaded`, { id: fileId, duration: 3000 });
          } else {
            failed++;
            let s3Error = `S3 upload failed (HTTP ${uploadRes.status})`;
            try {
              const body = await uploadRes.text();
              const match = body.match(/<Message>(.*?)<\/Message>/);
              const code = body.match(/<Code>(.*?)<\/Code>/);
              if (match?.[1]) s3Error = `${code?.[1] ?? 'S3Error'}: ${match[1]}`;
            } catch {
              /* ignore xml parse error */
            }
            toast.error(`${file.name} — ${s3Error}`, {
              id: fileId,
              description:
                uploadRes.status === 403
                  ? 'CORS not configured — use "Make Compatible" on the bucket'
                  : uploadRes.status === 400
                    ? 'Presigned URL expired or Content-Type mismatch'
                    : undefined,
            });
          }
        } catch (err) {
          failed++;
          toast.error(`${file.name} — ${err instanceof Error ? err.message : 'Network error'}`, {
            id: fileId,
          });
        }

        // Update batch progress
        if (total > 1) {
          toast.loading(`Uploading ${uploaded + failed} / ${total} files…`, { id: batchId });
        }
      }

      // Dismiss batch toast and show summary
      if (total > 1) {
        if (failed === 0) {
          toast.success(`All ${uploaded} files uploaded to ${bucket.name}`, { id: batchId });
        } else if (uploaded === 0) {
          toast.error(`All ${failed} uploads failed`, { id: batchId });
        } else {
          toast.warning(`${uploaded} uploaded, ${failed} failed`, { id: batchId });
        }
      }

      if (uploaded > 0) {
        refetch();
        refetchInventory();
        refetchAnalytics();
      }
    },
    [projects, refetch, refetchAnalytics, refetchInventory],
  );

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* One-liner */}
        <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-2.5 overflow-x-auto">
          {/* Regions */}
          {allRegions.length > 0 && (
            <>
              <StackedFlags regions={allRegions} buckets={buckets} />
              <div className="h-5 w-px bg-border/60 shrink-0" />
            </>
          )}

          {/* File Distribution rod */}
          {aggregatedBreakdown.length > 0 && (
            <>
              <div className="flex items-center gap-1.5 min-w-0 shrink-0">
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  Files · {summaryStats.totalFiles}
                </span>
                <div className="w-18">
                  <FileTypeRod breakdown={aggregatedBreakdown} />
                </div>
              </div>
              <div className="h-5 w-px bg-border/60 shrink-0" />
            </>
          )}

          {/* Storage + buckets */}
          <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
            {summaryStats.total} buckets · {summaryStats.totalStorage}
          </span>
          <div className="h-5 w-px bg-border/60 shrink-0" />

          {/* Activity sparkline */}
          {hasActivity && (
            <>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] text-muted-foreground">Activity</span>
                <Sparklines data={activityData} width={56} height={16} margin={1}>
                  <SparklinesLine
                    style={{ stroke: 'currentColor', strokeWidth: 1.5, fill: 'none' }}
                  />
                </Sparklines>
              </div>
              <div className="h-5 w-px bg-border/60 shrink-0" />
            </>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Search */}
          <InputGroup className="w-56 shrink-0">
            <InputGroupInput
              placeholder="Search buckets…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 text-xs"
            />
            <InputGroupAddon align="inline-end">
              <Search className="size-3" />
            </InputGroupAddon>
          </InputGroup>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              className=""
              onClick={() => setAwsSyncOpen(true)}
              title="Discover AWS Buckets"
            >
              <FaAws className="size-4" />
              Sync with
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setSyncOpen(true)}
              data-tour-step-id="tour-sync-aws"
              title="Sync Status"
            >
              <RefreshCw className="size-3.5" />
            </Button>
            <Button
              size="icon"
              className="size-7"
              onClick={() => setDialogOpen(true)}
              data-tour-step-id="tour-new-bucket"
              title="New Bucket"
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Content area */}
        {loading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col gap-3 rounded-xl border border-border/50 bg-card p-4"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="size-5 rounded-full" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-2.5 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-16 rounded-md" />
                </div>
                {/* Ring + stats */}
                <div className="flex items-center gap-4">
                  <Skeleton className="w-22.5 h-22.5 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-4/5" />
                    <Skeleton className="h-3 w-3/5" />
                  </div>
                </div>
                {/* Footer */}
                <div className="mt-auto space-y-2">
                  <Skeleton className="h-1.5 w-full rounded-full" />
                  <div className="flex justify-between">
                    <Skeleton className="h-2.5 w-20" />
                    <Skeleton className="h-2.5 w-28" />
                  </div>
                </div>
              </div>
            ))}
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
                    files={inventory[bucket.id]?.files}
                    compatible={compatMap[bucket.id]?.compatible}
                    compatibilityFixing={compatMap[bucket.id]?.fixing}
                    onDelete={handleDelete}
                    onFullDelete={handleFullDelete}
                    onDeploy={handleDeploy}
                    onConnectCDN={(b) => setConnectCdnTarget(b)}
                    onConnectProject={(b) => setConnectProjectTarget(b)}
                    onFileDrop={handleFileDrop}
                    onMakeCompatible={async (b) => {
                      const ok = await makeCompatible(b);
                      if (ok) toast.success(`${b.name} is now compatible`);
                      else toast.error(`Failed to fix compatibility for ${b.name}`);
                    }}
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
