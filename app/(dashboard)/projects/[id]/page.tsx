// Project detail page showing buckets and files for a specific project
'use client';

import { use, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, DollarSign, RefreshCw, Plus, Pencil } from 'lucide-react';
import { motion } from 'framer-motion';
import { CircleFlag } from 'react-circle-flags';
import { Sparklines, SparklinesLine } from 'react-sparklines';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PageTransition } from '@/components/page-transition';
import { FilesTable } from '@/features/files/components/files-table';
import { AnalyticsCards } from '@/features/infrastructure/components/analytics-cards';
import {
  CostSummaryCards,
  BucketExpensesTable,
  CostBreakdownTable,
  CostByServiceBreakdown,
} from '@/features/infrastructure/components/cost-tables';
import { BucketCard } from '@/features/buckets/components/bucket-card';
import { FileTypeRod } from '@/features/buckets/components/bucket-card';
import { useBuckets, useDeleteBucket, useCreateBucket } from '@/features/buckets/hooks/use-buckets';
import { useBucketInventory } from '@/features/buckets/hooks/use-bucket-inventory';
import { useFiles, useDeleteFile } from '@/features/files/hooks/use-files';
import { useAnalytics } from '@/features/infrastructure/hooks/use-analytics';
import { useDeployBucket } from '@/features/infrastructure/hooks/use-deploy-bucket';
import { useExpenses } from '@/features/infrastructure/hooks/use-expenses';
import { useProjects, useUpdateProject } from '@/features/projects/hooks/use-projects';
import { CreateBucketDialog } from '@/features/buckets/components/create-bucket-dialog';
import { useEnvironments } from '@/features/environments/hooks/use-environments';
import { getRegionAlpha2, getRegionCountry } from '@/lib/region-flags';
import { toast } from 'sonner';
import type { Bucket } from '@/lib/types';
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
  const { deleteFile } = useDeleteFile();
  const { deploy } = useDeployBucket();
  const { environments } = useEnvironments();
  const [bucketDialogOpen, setBucketDialogOpen] = useState(false);

  // ── Edit project state ──
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEnv, setEditEnv] = useState<'dev' | 'prod'>('dev');
  const [editMaxSizeMB, setEditMaxSizeMB] = useState(10);

  useEffect(() => {
    if (project) {
      setEditName(project.name);
      setEditEnv(project.environment);
      setEditMaxSizeMB(project.maxFileSizeMB);
    }
  }, [project]);

  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = await updateProject(id, {
      name: editName.trim(),
      environment: editEnv,
      maxFileSizeMB: editMaxSizeMB,
    });
    if (updated) {
      toast.success('Project updated');
      setEditOpen(false);
      refetchProjects();
    } else {
      toast.error('Failed to update project');
    }
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

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* ── Header ── */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight truncate">
              {project?.name || 'Project'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              {project && (
                <>
                  <Badge variant={project.environment === 'prod' ? 'default' : 'secondary'}>
                    {project.environment}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Max {project.maxFileSizeMB} MB
                  </span>
                </>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} disabled={!project}>
            <Pencil className="size-3.5 mr-1.5" />
            Edit
          </Button>
        </div>

        {/* ── Hero stats bar ── */}
        {project && (
          <div className="flex flex-wrap items-center gap-5 rounded-xl border border-border/50 bg-card/60 px-5 py-4">
            {/* Animated region flags */}
            <div className="flex items-center">
              {uniqueRegions.length === 0 ? (
                <span className="text-xs text-muted-foreground">No regions yet</span>
              ) : (
                <div className="flex -space-x-2">
                  {uniqueRegions.slice(0, 6).map((region, i, arr) => (
                    <motion.div
                      key={region}
                      whileHover={{ y: -5 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      title={`${getRegionCountry(region)} (${region})`}
                      className="overflow-hidden rounded-full ring-2 ring-card cursor-default"
                      style={{ zIndex: arr.length - i }}
                    >
                      <CircleFlag countryCode={getRegionAlpha2(region)} height={30} width={30} />
                    </motion.div>
                  ))}
                  {uniqueRegions.length > 6 && (
                    <span className="ml-2 text-[10px] text-muted-foreground self-center">
                      +{uniqueRegions.length - 6}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="h-8 w-px bg-border/50 hidden sm:block" />

            {/* File distribution rod */}
            <div className="flex-1 min-w-36 space-y-1">
              <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                File Distribution
              </p>
              {aggregatedBreakdown.length > 0 ? (
                <FileTypeRod breakdown={aggregatedBreakdown} />
              ) : (
                <div className="h-1.5 w-full rounded-full bg-muted" />
              )}
            </div>

            <div className="h-8 w-px bg-border/50 hidden sm:block" />

            {/* Storage */}
            <div className="min-w-28 space-y-0.5">
              <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                Storage
              </p>
              <p className="text-sm font-semibold tabular-nums">{formatBytes(totalStorageBytes)}</p>
              <p className="text-[10px] text-muted-foreground">
                across {buckets.length} bucket{buckets.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="h-8 w-px bg-border/50 hidden sm:block" />

            {/* Activity sparkline */}
            <div className="space-y-1">
              <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                Activity (14d)
              </p>
              <div style={{ width: 90, height: 24 }} className="opacity-80">
                <Sparklines
                  data={hasActivity ? activityData : new Array(14).fill(0)}
                  height={24}
                  min={0}
                >
                  <SparklinesLine
                    color="#22c55e"
                    style={{ fill: '#22c55e', fillOpacity: 0.2, strokeWidth: 1.5 }}
                  />
                </Sparklines>
              </div>
            </div>
          </div>
        )}

        <AnalyticsCards summary={summary} loading={analyticsLoading} />

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
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Project Buckets</CardTitle>
                <Button size="sm" onClick={() => setBucketDialogOpen(true)}>
                  <Plus className="mr-1.5 size-3.5" />
                  Add Bucket
                </Button>
              </CardHeader>
              <CardContent>
                {buckets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <p className="text-sm font-medium">No buckets yet</p>
                    <p className="text-xs mt-1">Add your first bucket to get started.</p>
                  </div>
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
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
                        onDelete={handleDeleteBucket}
                        onDeploy={handleDeploy}
                      />
                    ))}
                  </div>
                )}
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
                <RefreshCw className={`size-3.5 mr-1.5 ${expensesLoading ? 'animate-spin' : ''}`} />
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
                        { service: 'S3 Storage', cost: costSummary.s3StorageCost },
                        { service: 'S3 Requests', cost: costSummary.s3RequestsCost },
                        {
                          service: 'S3 Data Transfer',
                          cost: costSummary.s3DataTransferCost,
                        },
                        {
                          service: 'CloudFront Transfer',
                          cost: costSummary.cfDataTransferCost,
                        },
                        {
                          service: 'CloudFront Requests',
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

        {/* ── Edit Project Dialog ── */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditProject}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Project name"
                    required
                    minLength={2}
                    maxLength={50}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-env">Environment</Label>
                  <Select value={editEnv} onValueChange={(v) => setEditEnv(v as 'dev' | 'prod')}>
                    <SelectTrigger id="edit-env">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dev">dev</SelectItem>
                      <SelectItem value="prod">prod</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-maxsize">Max File Size (MB)</Label>
                  <Input
                    id="edit-maxsize"
                    type="number"
                    min={1}
                    max={500}
                    value={editMaxSizeMB}
                    onChange={(e) => setEditMaxSizeMB(Number(e.target.value))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updatingProject}>
                  {updatingProject ? 'Saving…' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}
