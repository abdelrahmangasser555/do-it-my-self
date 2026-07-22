// Projects listing page with card-based layout
'use client';

import { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Sparklines, SparklinesLine } from 'react-sparklines';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageTransition } from '@/components/page-transition';
import {
  ProjectCards,
  StackedFlags,
  AllProjectsStorageRod,
} from '@/features/projects/components/project-cards';
import { CreateProjectDialog } from '@/features/projects/components/create-project-dialog';
import { CreateBucketDialog } from '@/features/buckets/components/create-bucket-dialog';
import {
  useProjects,
  useCreateProject,
  useDeleteProject,
} from '@/features/projects/hooks/use-projects';
import { useBuckets } from '@/features/buckets/hooks/use-buckets';
import { useCreateBucket } from '@/features/buckets/hooks/use-buckets';
import { useBucketInventory } from '@/features/buckets/hooks/use-bucket-inventory';
import { useDeployBucket } from '@/features/infrastructure/hooks/use-deploy-bucket';
import { useEnvironments } from '@/features/environments/hooks/use-environments';
import type { ProjectFormValues, BucketFormValues } from '@/lib/validations';
import type { Project } from '@/lib/types';

export default function ProjectsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bucketDialogOpen, setBucketDialogOpen] = useState(false);
  const [addBucketProject, setAddBucketProject] = useState<Project | null>(null);

  const { projects, loading, refetch } = useProjects();
  const { createProject, loading: creating } = useCreateProject();
  const { deleteProject } = useDeleteProject();
  const { buckets, refetch: refetchBuckets } = useBuckets();
  const { createBucket, loading: creatingBucket } = useCreateBucket();
  const { deploy } = useDeployBucket();
  const { environments } = useEnvironments();
  const { inventory } = useBucketInventory(buckets);

  // Aggregated data for the one-liner
  const allRegions = useMemo(
    () => [...new Set(buckets.map((b) => b.region).filter(Boolean))],
    [buckets],
  );

  const storageByProjectId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of projects) {
      const pb = buckets.filter((b) => b.projectId === p.id);
      map[p.id] = pb.reduce((s, b) => s + (inventory[b.id]?.totalSizeBytes ?? 0), 0);
    }
    return map;
  }, [projects, buckets, inventory]);

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

  const handleCreate = async (data: ProjectFormValues) => {
    const result = await createProject(data);
    if (result) {
      toast.success(`Project "${result.name}" created`);
      setDialogOpen(false);
      refetch();
    } else {
      toast.error('Failed to create project');
    }
  };

  const handleDelete = async (id: string) => {
    const success = await deleteProject(id);
    if (success) {
      toast.success('Project deleted');
      refetch();
    } else {
      toast.error('Failed to delete project');
    }
  };

  const handleAddBucket = (project: Project) => {
    setAddBucketProject(project);
    setBucketDialogOpen(true);
  };

  const handleCreateBucket = async (data: BucketFormValues, shouldDeploy?: boolean) => {
    const bucket = await createBucket({
      ...data,
      projectId: addBucketProject?.id ?? data.projectId,
    });
    if (bucket) {
      toast.success(`Bucket "${bucket.name}" created`);
      setBucketDialogOpen(false);
      setAddBucketProject(null);
      refetchBuckets();
      if (shouldDeploy) {
        toast.info(`Deploying ${bucket.name}…`);
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

  return (
    <PageTransition>
      <div className="space-y-5">
        {/* ── One-liner header ── */}
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border/50 bg-card/60 px-4 py-3">
          <StackedFlags regions={allRegions} buckets={buckets} />

          <div className="h-7 w-px bg-border/50 hidden sm:block" />

          <div className="flex-1 min-w-32 space-y-1">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Project Distribution
            </p>
            {projects.length > 0 ? (
              <AllProjectsStorageRod
                allProjects={projects}
                storageByProjectId={storageByProjectId}
              />
            ) : (
              <div className="h-1.5 w-full rounded-full bg-muted" />
            )}
          </div>

          <div className="h-7 w-px bg-border/50 hidden sm:block" />

          <div className="space-y-1">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Activity (14d)
            </p>
            <div style={{ width: 80, height: 22 }} className="opacity-80">
              <Sparklines
                data={hasActivity ? activityData : new Array(14).fill(0)}
                height={22}
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

          <Button
            size="sm"
            onClick={() => setDialogOpen(true)}
            data-tour-step-id="tour-new-project"
          >
            <Plus className="mr-1.5 size-3.5" />
            New Project
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex h-full flex-col gap-3 rounded-xl border border-border/50 bg-card p-4"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className="flex -space-x-1.5">
                      <Skeleton className="size-6 rounded-full" />
                      <Skeleton className="size-6 rounded-full" />
                    </div>
                    <div className="space-y-1.5">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-3 w-12 rounded-full" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-16 rounded" />
                </div>
                {/* Ring + stats */}
                <div className="flex items-center gap-4">
                  <Skeleton className="size-18 rounded-full shrink-0" />
                  <div className="flex flex-col gap-2 flex-1">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-4/5" />
                    <Skeleton className="h-3 w-3/5" />
                  </div>
                </div>
                {/* Rods */}
                <Skeleton className="h-1.5 w-full rounded-full" />
                <Skeleton className="h-1.5 w-full rounded-full" />
                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-6 w-20 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ProjectCards
            projects={projects}
            buckets={buckets}
            onDelete={handleDelete}
            onAddBucket={handleAddBucket}
          />
        )}

        <CreateProjectDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleCreate}
          loading={creating}
        />

        <CreateBucketDialog
          open={bucketDialogOpen}
          onOpenChange={(open) => {
            setBucketDialogOpen(open);
            if (!open) setAddBucketProject(null);
          }}
          onSubmit={handleCreateBucket}
          projects={projects}
          loading={creatingBucket}
          environments={environments}
          defaultProjectId={addBucketProject?.id}
        />
      </div>
    </PageTransition>
  );
}
