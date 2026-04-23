// Project detail page showing buckets and files for a specific project
'use client';

import { use, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, DollarSign, RefreshCw, Plus, Pencil } from 'lucide-react';
import { Sparklines, SparklinesLine } from 'react-sparklines';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageTransition } from '@/components/page-transition';
import { FilesTable } from '@/features/files/components/files-table';
import {
  CostSummaryCards,
  BucketExpensesTable,
  CostBreakdownTable,
  CostByServiceBreakdown,
} from '@/features/infrastructure/components/cost-tables';
import { BucketCard, FileTypeRod } from '@/features/buckets/components/bucket-card';
import { StackedFlags, BucketStorageRod } from '@/features/projects/components/project-cards';
import {
  useBuckets,
  useDeleteBucket,
  useCreateBucket,
  useUpdateBucket,
} from '@/features/buckets/hooks/use-buckets';
import { useBucketInventory } from '@/features/buckets/hooks/use-bucket-inventory';
import { useCompatibilityCheck } from '@/features/buckets/hooks/use-compatibility';
import { useFiles, useDeleteFile } from '@/features/files/hooks/use-files';
import { useAnalytics } from '@/features/infrastructure/hooks/use-analytics';
import { useDeployBucket } from '@/features/infrastructure/hooks/use-deploy-bucket';
import { useExpenses } from '@/features/infrastructure/hooks/use-expenses';
import { useProjects, useUpdateProject } from '@/features/projects/hooks/use-projects';
import { ProjectEditorDialog } from '@/features/projects/components/project-editor-dialog';
import { CreateBucketDialog } from '@/features/buckets/components/create-bucket-dialog';
import { DeleteBucketDialog } from '@/features/buckets/components/delete-bucket-dialog';
import { ConnectCdnDialog } from '@/features/buckets/components/connect-cdn-dialog';
import { ConnectProjectDialog } from '@/features/buckets/components/connect-project-dialog';
import { useEnvironments } from '@/features/environments/hooks/use-environments';
import { toast } from 'sonner';
import type { Bucket, ProjectUpdateData } from '@/lib/types';
import type { BucketFormValues } from '@/lib/validations';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}

function buildActivityData(files: { lastModified: string; size?: number }[], days = 14): number[] {
  const now = Date.now();
  const data = new Array(days).fill(0);
  for (const f of files) {
    const age = (now - new Date(f.lastModified).getTime()) / (1000 * 60 * 60 * 24);
    const idx = days - 1 - Math.floor(age);
    if (idx >= 0 && idx < days) {
      const sizeKB = (f.size ?? 0) / 1024;
      data[idx] += sizeKB > 0 ? Math.min(Math.sqrt(sizeKB), 8) : 1;
    }
  }
  return data;
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { projects, refetch: refetchProjects } = useProjects();
  const { updateProject, loading: updatingProject } = useUpdateProject();
  const project = projects.find((p) => p.id === id);
  const { buckets, refetch: refetchBuckets } = useBuckets(id);
  const { files, refetch: refetchFiles } = useFiles(id);
  const { summary, bucketAnalytics, loading: analyticsLoading } = useAnalytics(id);
  const { inventory } = useBucketInventory(buckets);
  const {
    summary: costSummary,
    buckets: bucketExpenses,
    loading: expensesLoading,
    refetch: refetchExpenses,
  } = useExpenses(id);
  const { deleteBucket } = useDeleteBucket();
  const { createBucket, loading: creatingBucket } = useCreateBucket();
  const { updateBucket, loading: updatingBucket } = useUpdateBucket();
  const { deleteFile } = useDeleteFile();
  const { deploy } = useDeployBucket();
  const { environments } = useEnvironments();
  const { compatMap, makeCompatible } = useCompatibilityCheck(buckets);
  const [bucketDialogOpen, setBucketDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Bucket | null>(null);
  const [connectCdnTarget, setConnectCdnTarget] = useState<Bucket | null>(null);
  const [connectProjectTarget, setConnectProjectTarget] = useState<Bucket | null>(null);

  const [editOpen, setEditOpen] = useState(false);

  const handleEditProject = async (projectId: string, updates: ProjectUpdateData) => {
    const updated = await updateProject(projectId, updates);
    if (updated) {
      toast.success('Project updated');
      refetchProjects();
      return true;
    }

    toast.error('Failed to update project');
    return false;
  };

  // ── Hero stats: derived from inventory ──
  const uniqueRegions = useMemo(
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

  const totalStorageBytes = useMemo(
    () => buckets.reduce((s, b) => s + (inventory[b.id]?.totalSizeBytes ?? 0), 0),
    [buckets, inventory],
  );

  const allFiles = useMemo(
    () => buckets.flatMap((b) => inventory[b.id]?.files ?? []),
    [buckets, inventory],
  );

  const activityData = useMemo(() => buildActivityData(allFiles), [allFiles]);
  const hasActivity = activityData.some((v) => v > 0);

  const handleCreateBucket = async (data: BucketFormValues, shouldDeploy?: boolean) => {
    const bucket = await createBucket({ ...data, projectId: id });
    if (bucket) {
      toast.success(`Bucket "${bucket.name}" created`);
      setBucketDialogOpen(false);
      refetchBuckets();
      if (shouldDeploy) {
        toast.info(`Deploying ${bucket.name}...`);
        const result = await deploy(bucket.id, bucket.s3BucketName, bucket.region);
        if (result.success) {
          toast.success('Deployment complete!');
          refetchBuckets();
        } else {
          toast.error(`Deployment failed: ${result.error}`);
        }
      }
    } else {
      toast.error('Failed to create bucket');
    }
  };

  const handleDeleteBucket = async (bucketId: string) => {
    const success = await deleteBucket(bucketId);
    if (success) {
      toast.success('Bucket deleted');
      refetchBuckets();
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    const success = await deleteFile(fileId);
    if (success) {
      toast.success('File record deleted');
      refetchFiles();
    }
  };

  const handleDeploy = async (bucket: Bucket) => {
    toast.info(`Deploying ${bucket.name}...`);
    const result = await deploy(bucket.id, bucket.s3BucketName, bucket.region);
    if (result.success) {
      toast.success('Deployment complete!');
      refetchBuckets();
    } else {
      toast.error(`Deployment failed: ${result.error}`);
    }
  };

  const handleFullDelete = (bucket: Bucket) => {
    setDeleteTarget(bucket);
  };

  const handleConnectProject = async (projectId: string) => {
    if (!connectProjectTarget) return;
    const updated = await updateBucket(connectProjectTarget.id, { projectId });
    if (!updated) {
      toast.error('Failed to connect bucket to project');
      return;
    }
    toast.success('Bucket connected to project');
    setConnectProjectTarget(null);
    refetchBuckets();
  };

  const handleFileDrop = useCallback(
    async (bucket: Bucket, droppedFiles: File[]) => {
      if (!project) {
        toast.error('Bucket has no associated project');
        return;
      }
      const total = droppedFiles.length;
      let uploaded = 0;
      let failed = 0;
      const batchId = `upload-${bucket.id}-${Date.now()}`;
      if (total > 1) toast.loading(`Uploading 0 / ${total} files…`, { id: batchId });

      for (let i = 0; i < droppedFiles.length; i++) {
        const file = droppedFiles[i];
        const fileId = `upload-file-${file.name}-${i}`;
        toast.loading(`Uploading ${file.name}…`, { id: fileId });
        try {
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
            toast.error(`${file.name} — ${data.error || `HTTP ${res.status}`}`, { id: fileId });
            failed++;
            if (total > 1)
              toast.loading(`Uploading ${uploaded + failed} / ${total} files…`, { id: batchId });
            continue;
          }
          const { uploadUrl } = await res.json();
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
            toast.error(`${file.name} — S3 upload failed`, { id: fileId });
          }
        } catch (err) {
          failed++;
          toast.error(`${file.name} — ${err instanceof Error ? err.message : 'Network error'}`, {
            id: fileId,
          });
        }
        if (total > 1)
          toast.loading(`Uploading ${uploaded + failed} / ${total} files…`, { id: batchId });
      }
      if (total > 1) {
        if (failed === 0)
          toast.success(`All ${uploaded} files uploaded to ${bucket.name}`, { id: batchId });
        else if (uploaded === 0) toast.error(`All ${failed} uploads failed`, { id: batchId });
        else toast.warning(`${uploaded} uploaded, ${failed} failed`, { id: batchId });
      }
      if (uploaded > 0) {
        refetchBuckets();
        refetchFiles();
      }
    },
    [project, refetchBuckets, refetchFiles],
  );

  const fileCountForBucket = (bucket: Bucket | null) =>
    bucket ? (inventory[bucket.id]?.fileCount ?? 0) : 0;

  // Est. monthly cost from expenses
  const estMonthlyCost = costSummary?.totalMonthlyCost ?? 0;
  const totalFiles = useMemo(
    () => buckets.reduce((s, b) => s + (inventory[b.id]?.fileCount ?? 0), 0),
    [buckets, inventory],
  );

  return (
    <PageTransition>
      <div className="space-y-5">
        {/* ── One-liner header ── */}
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border/50 bg-card/60 px-4 py-3">
          <Button variant="ghost" size="icon" className="size-7" onClick={() => router.back()}>
            <ArrowLeft className="size-3.5" />
          </Button>

          {/* Project name + env */}
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">{project?.name || 'Project'}</p>
            <p className="text-[10px] text-muted-foreground">
              {project?.environment} · max {project?.maxFileSizeMB} MB
            </p>
          </div>

          <div className="h-7 w-px bg-border/50 hidden sm:block" />

          {/* Region flags */}
          <StackedFlags regions={uniqueRegions} buckets={buckets} />

          <div className="h-7 w-px bg-border/50 hidden sm:block" />

          {/* Est. monthly cost */}
          <div className="min-w-16">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Est. Cost/mo
            </p>
            <p className="text-xs font-semibold tabular-nums">${estMonthlyCost.toFixed(2)}</p>
          </div>

          <div className="h-7 w-px bg-border/50 hidden sm:block" />

          {/* File distribution */}
          <div className="flex-1 min-w-28 space-y-1">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              File Distribution · {totalFiles} files
            </p>
            {aggregatedBreakdown.length > 0 ? (
              <FileTypeRod breakdown={aggregatedBreakdown} />
            ) : (
              <div className="h-1.5 w-full rounded-full bg-muted" />
            )}
          </div>

          <div className="h-7 w-px bg-border/50 hidden sm:block" />

          {/* Storage distribution */}
          <div className="flex-1 min-w-28 space-y-1">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Storage Distribution · {formatBytes(totalStorageBytes)}
            </p>
            {buckets.length > 0 ? (
              <BucketStorageRod projectBuckets={buckets} inventory={inventory} />
            ) : (
              <div className="h-1.5 w-full rounded-full bg-muted" />
            )}
          </div>

          <div className="h-7 w-px bg-border/50 hidden sm:block" />

          {/* Activity sparkline */}
          <div className="space-y-1">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Activity (14d)
            </p>
            <div style={{ width: 72, height: 20 }} className="opacity-80">
              <Sparklines
                data={hasActivity ? activityData : new Array(14).fill(0)}
                height={20}
                min={0}
              >
                <SparklinesLine
                  color="#22c55e"
                  style={{ fill: '#22c55e', fillOpacity: 0.18, strokeWidth: 1.5 }}
                />
              </Sparklines>
            </div>
          </div>

          <div className="h-7 w-px bg-border/50 hidden sm:block" />

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() => setBucketDialogOpen(true)}
            >
              <Plus className="size-3 mr-1" />
              Add Bucket
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => setEditOpen(true)}
              disabled={!project}
            >
              <Pencil className="size-3" />
            </Button>
          </div>
        </div>

        <Tabs defaultValue="buckets">
          <TabsList>
            <TabsTrigger value="buckets">Buckets ({buckets.length})</TabsTrigger>
            <TabsTrigger value="files">Files ({files.length})</TabsTrigger>
            <TabsTrigger value="pricing" className="gap-1.5">
              <DollarSign className="size-3.5" />
              Pricing
            </TabsTrigger>
          </TabsList>
          <TabsContent value="buckets">
            {buckets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <p className="text-sm font-medium">No buckets yet</p>
                <p className="text-xs mt-1">Add your first bucket to get started.</p>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 mt-4">
                {buckets.map((bucket) => (
                  <BucketCard
                    key={bucket.id}
                    bucket={bucket}
                    projectName={project?.name}
                    fileCount={inventory[bucket.id]?.fileCount ?? 0}
                    totalSizeBytes={inventory[bucket.id]?.totalSizeBytes ?? 0}
                    analytics={bucketAnalytics.find((a) => a.bucketId === bucket.id)}
                    fileTypeBreakdown={inventory[bucket.id]?.fileTypeBreakdown ?? []}
                    files={inventory[bucket.id]?.files ?? []}
                    compatible={compatMap[bucket.id]?.compatible}
                    compatibilityFixing={compatMap[bucket.id]?.fixing}
                    onDelete={handleDeleteBucket}
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
                ))}
              </div>
            )}
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
                <RefreshCw className={`size-3.5 mr-1.5 ${expensesLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            <CostSummaryCards summary={costSummary} loading={expensesLoading} />

            <div className="grid gap-6 lg:grid-cols-2">
              <CostByServiceBreakdown
                services={
                  costSummary
                    ? [
                        { service: 'S3 Storage', cost: costSummary.s3StorageCost },
                        { service: 'S3 Requests', cost: costSummary.s3RequestsCost },
                        { service: 'S3 Data Transfer', cost: costSummary.s3DataTransferCost },
                        { service: 'CloudFront Transfer', cost: costSummary.cfDataTransferCost },
                        { service: 'CloudFront Requests', cost: costSummary.cfRequestsCost },
                      ]
                    : []
                }
              />

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
                      .sort((a, b) => b.costBreakdown.total - a.costBreakdown.total)
                      .map((be) => {
                        const maxCost = Math.max(
                          ...bucketExpenses.map((b) => b.costBreakdown.total),
                          0.0001,
                        );
                        const pct = (be.costBreakdown.total / maxCost) * 100;
                        return (
                          <div key={be.bucketId} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="truncate font-medium">{be.displayName}</span>
                              <span className="font-mono text-muted-foreground">
                                ${be.costBreakdown.total.toFixed(4)}
                              </span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${Math.max(pct, 2)}%` }}
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

            {bucketExpenses.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Per-Bucket Line-Item Breakdown
                </h3>
                <div className="w-full">
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

        <CreateBucketDialog
          open={bucketDialogOpen}
          onOpenChange={setBucketDialogOpen}
          onSubmit={handleCreateBucket}
          projects={projects}
          loading={creatingBucket}
          environments={environments}
          defaultProjectId={id}
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
            refetchBuckets();
            toast.success('Bucket fully deleted from AWS');
          }}
        />

        <ConnectCdnDialog
          open={!!connectCdnTarget}
          onOpenChange={(v) => {
            if (!v) setConnectCdnTarget(null);
          }}
          bucket={connectCdnTarget}
          onComplete={() => {
            setConnectCdnTarget(null);
            refetchBuckets();
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

        <ProjectEditorDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          project={project ?? null}
          loading={updatingProject}
          onSubmit={handleEditProject}
        />
      </div>
    </PageTransition>
  );
}
