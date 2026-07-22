'use client';

import { type ElementType, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Sparklines, SparklinesLine } from 'react-sparklines';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  FolderKanban,
  Database,
  FileUp,
  BarChart3,
  Globe,
  MapPin,
  RotateCcw,
  Loader2,
  Settings,
  BookOpen,
  Zap,
  Video,
  Plus,
  FolderPlus,
  Trash2,
  Folders,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { HeroVideoDialog } from '@/components/ui/hero-video-dialog';
import { APP_CONFIG } from '@/lib/config';
import { GitHubStarsButton } from '@/components/ui/github-stars-button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { CreateProjectDialog } from '@/features/projects/components/create-project-dialog';
import { ProjectEditorDialog } from '@/features/projects/components/project-editor-dialog';
import { CreateBucketDialog } from '@/features/buckets/components/create-bucket-dialog';
import { DeleteBucketDialog } from '@/features/buckets/components/delete-bucket-dialog';
import {
  useCreateProject,
  useProjects,
  useUpdateProject,
} from '@/features/projects/hooks/use-projects';
import { useBuckets, useCreateBucket } from '@/features/buckets/hooks/use-buckets';
import { useBucketInventory } from '@/features/buckets/hooks/use-bucket-inventory';
import { useEnvironments } from '@/features/environments/hooks/use-environments';
import { useTheme } from '@/lib/theme-context';
import { useAppMode } from '@/lib/app-mode-context';
import { cn } from '@/lib/utils';
import type { Bucket, Project } from '@/lib/types';

const navItems = [
  {
    title: 'Overview',
    items: [{ label: 'Dashboard', href: '/', icon: BarChart3 }],
  },
  {
    title: 'Management',
    items: [
      { label: 'Projects', href: '/projects', icon: FolderKanban },
      { label: 'Buckets', href: '/buckets', icon: Database },
      { label: 'Files', href: '/files', icon: FileUp },
      { label: 'Distributions', href: '/distributions', icon: Globe },
      { label: 'Environments', href: '/environments', icon: MapPin },
    ],
  },
];

type FooterLink = { label: string; icon: ElementType; href: string };
type FooterAction = { label: string; icon: ElementType; action: 'tutorial' | 'reset' };
type FooterItem = FooterLink | FooterAction;

const footerActions: FooterItem[] = [
  { label: 'Settings', icon: Settings, href: '/settings' },
  { label: 'Documentation', icon: BookOpen, href: '/docs/setup-guide' },
  { label: 'Commands', icon: Zap, href: '/commands' },
  { label: 'Watch Tutorial', icon: Video, action: 'tutorial' },
  { label: 'Reset Local Data', icon: RotateCcw, action: 'reset' },
];

function formatStorage(bytes: number) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, index)).toFixed(index > 1 ? 1 : 0)} ${units[index]}`;
}

function buildSidebarActivity(files: Array<{ lastModified: string; size?: number }>, days = 7) {
  const now = Date.now();
  const activity = new Array(days).fill(0);

  for (const file of files) {
    const age = (now - new Date(file.lastModified).getTime()) / (1000 * 60 * 60 * 24);
    const bucketIndex = days - 1 - Math.floor(age);

    if (bucketIndex >= 0 && bucketIndex < days) {
      activity[bucketIndex] += 1;
    }
  }

  return activity;
}

function getProjectGlyph(project: Project) {
  if (project.imageDataUrl) {
    return (
      <img
        src={project.imageDataUrl}
        alt={project.name}
        className="size-10 rounded-2xl object-cover"
      />
    );
  }

  return (
    <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-sm font-semibold uppercase text-primary">
      {project.name.slice(0, 2)}
    </span>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const {
    isDeveloperMode,
    selectedProjectId,
    setSelectedProjectId,
    selectedBucketId,
    setSelectedBucketId,
  } = useAppMode();

  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [bucketDialogOpen, setBucketDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Bucket | null>(null);

  const logoSrc = resolvedTheme === 'dark' ? APP_CONFIG.logoDark : APP_CONFIG.logoLight;

  const { createProject, loading: creatingProject } = useCreateProject();
  const { updateProject, loading: updatingProject } = useUpdateProject();
  const { createBucket, loading: creatingBucket } = useCreateBucket();
  const { projects, refetch: refetchProjects } = useProjects();
  const { buckets, refetch: refetchBuckets } = useBuckets();
  const { inventory } = useBucketInventory(buckets);
  const { environments } = useEnvironments();

  const projectBuckets = useMemo(
    () => buckets.filter((bucket) => bucket.projectId === selectedProjectId),
    [buckets, selectedProjectId],
  );

  useEffect(() => {
    const [, rootSegment, routeId] = pathname.split('/');

    if (rootSegment === 'projects' && routeId) {
      if (routeId !== selectedProjectId) {
        setSelectedProjectId(routeId);
      }
      if (selectedBucketId) {
        setSelectedBucketId(null);
      }
      return;
    }

    if (rootSegment === 'buckets' && routeId) {
      const routeBucket = buckets.find((bucket) => bucket.id === routeId);
      if (!routeBucket) {
        return;
      }
      if (routeBucket.projectId !== selectedProjectId) {
        setSelectedProjectId(routeBucket.projectId);
      }
      if (routeBucket.id !== selectedBucketId) {
        setSelectedBucketId(routeBucket.id);
      }
    }
  }, [
    buckets,
    pathname,
    selectedBucketId,
    selectedProjectId,
    setSelectedBucketId,
    setSelectedProjectId,
  ]);

  useEffect(() => {
    const isRouteDrivenSelection =
      pathname.startsWith('/projects/') || pathname.startsWith('/buckets/');

    if (isRouteDrivenSelection) {
      return;
    }

    if (projects.length === 0) {
      if (selectedProjectId) setSelectedProjectId(null);
      if (selectedBucketId) setSelectedBucketId(null);
      return;
    }

    const hasSelectedProject = projects.some((project) => project.id === selectedProjectId);
    if (!hasSelectedProject) {
      setSelectedProjectId(projects[0].id);
    }
  }, [
    pathname,
    projects,
    selectedBucketId,
    selectedProjectId,
    setSelectedBucketId,
    setSelectedProjectId,
  ]);

  useEffect(() => {
    if (!selectedProjectId) {
      if (selectedBucketId) setSelectedBucketId(null);
      return;
    }

    const projectBucketIds = new Set(projectBuckets.map((bucket) => bucket.id));
    if (projectBuckets.length === 0) {
      if (selectedBucketId) setSelectedBucketId(null);
      return;
    }

    const shouldAutoSelectBucket = pathname === '/' || pathname.startsWith('/buckets/');

    if (!shouldAutoSelectBucket) {
      if (selectedBucketId && !projectBucketIds.has(selectedBucketId)) {
        setSelectedBucketId(null);
      }
      return;
    }

    if (!selectedBucketId || !projectBucketIds.has(selectedBucketId)) {
      setSelectedBucketId(projectBuckets[0].id);
    }
  }, [pathname, projectBuckets, selectedBucketId, selectedProjectId, setSelectedBucketId]);

  const handleCreateProject = async (data: Parameters<typeof createProject>[0]) => {
    const result = await createProject(data);
    if (result) {
      toast.success(`Project "${result.name}" created`);
      setSelectedProjectId(result.id);
      setProjectDialogOpen(false);
      refetchProjects();
    } else {
      toast.error('Failed to create project');
    }
  };

  const handleCreateBucket = async (data: Parameters<typeof createBucket>[0], deploy?: boolean) => {
    const result = await createBucket(data);
    if (result) {
      toast.success(`Bucket "${result.name}" created`);
      setSelectedProjectId(result.projectId);
      setSelectedBucketId(result.id);
      setBucketDialogOpen(false);
      refetchBuckets();

      if (deploy) {
        router.push(isDeveloperMode ? '/buckets' : `/buckets/${result.id}`);
        return;
      }

      if (!isDeveloperMode) {
        router.push(`/buckets/${result.id}`);
      }
    } else {
      toast.error('Failed to create bucket');
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      const res = await fetch('/api/system/reset', { method: 'POST' });
      if (res.ok) {
        toast.success('All local data has been reset');
        setResetOpen(false);
        router.push('/onboarding');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to reset');
      }
    } catch {
      toast.error('Failed to reset data');
    } finally {
      setResetting(false);
    }
  };

  const handleFooterClick = (action: 'tutorial' | 'reset') => {
    if (action === 'tutorial') setTutorialOpen(true);
    if (action === 'reset') setResetOpen(true);
  };

  const handleProjectSelect = (projectId: string) => {
    if (projectId === selectedProjectId) {
      if (pathname !== `/projects/${projectId}`) {
        router.push(`/projects/${projectId}`);
      }
      return;
    }

    setSelectedProjectId(projectId);
    setSelectedBucketId(null);
    router.push(`/projects/${projectId}`);
  };

  const handleBucketSelect = (bucket: Bucket) => {
    setSelectedProjectId(bucket.projectId);
    setSelectedBucketId(bucket.id);
    router.push(`/buckets/${bucket.id}`);
  };

  const handleProjectUpdate = async (
    projectId: string,
    updates: Parameters<typeof updateProject>[1],
  ) => {
    const updated = await updateProject(projectId, updates);
    if (!updated) {
      toast.error('Failed to update project');
      return false;
    }

    toast.success('Project updated');
    refetchProjects();
    setEditingProject(null);
    return true;
  };

  const activeEnvironmentCount = environments.filter(
    (environment) => environment.status === 'active',
  ).length;

  const simplifiedFooter = (
    <SidebarFooter className="border-t px-3 py-3">
      <div className="flex items-center justify-center gap-1">
        {[footerActions[0], footerActions[1], footerActions[3], footerActions[4]].map((item) => (
          <Tooltip key={item.label} delayDuration={300}>
            <TooltipTrigger asChild>
              {'href' in item ? (
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                  <Link href={item.href}>
                    <item.icon className="size-4" />
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleFooterClick(item.action)}
                >
                  <item.icon className="size-4" />
                </Button>
              )}
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {item.label}
            </TooltipContent>
          </Tooltip>
        ))}

        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
              <Link href="/environments">
                <MapPin className="size-4" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {`Environments · ${activeEnvironmentCount} active`}
          </TooltipContent>
        </Tooltip>
      </div>
    </SidebarFooter>
  );

  return (
    <Sidebar>
      <HeroVideoDialog
        videoSrc={APP_CONFIG.tutorialVideoUrl}
        thumbnailSrc={logoSrc}
        animationStyle="from-center"
        className="hidden"
      />

      {tutorialOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md"
          onClick={() => setTutorialOpen(false)}
        >
          <div
            className="relative mx-4 aspect-video w-full max-w-4xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="absolute -top-12 right-0 rounded-full bg-neutral-900/50 p-2 text-white ring-1 backdrop-blur-md"
              onClick={() => setTutorialOpen(false)}
            >
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <div className="size-full overflow-hidden rounded-2xl border-2 border-white">
              <iframe
                src={APP_CONFIG.tutorialVideoUrl}
                title="Tutorial"
                className="size-full rounded-2xl"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          </div>
        </div>
      )}

      {isDeveloperMode && (
        <SidebarHeader className="border-b px-4 h-14">
          <div className="flex items-center justify-between gap-2">
            <img
              src={logoSrc}
              alt={APP_CONFIG.name}
              className="h-7 w-auto object-contain shrink-0"
            />
            <div className="flex items-center gap-1">
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => setProjectDialogOpen(true)}
                  >
                    <FolderPlus className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  New Project
                </TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => setBucketDialogOpen(true)}
                  >
                    <Plus className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  New Bucket
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </SidebarHeader>
      )}

      {isDeveloperMode ? (
        <>
          <SidebarContent className="no-scrollbar">
            {navItems.map((group) => (
              <SidebarGroup key={group.title}>
                <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={
                            item.href === '/'
                              ? pathname === '/'
                              : pathname === item.href || pathname.startsWith(item.href + '/')
                          }
                        >
                          <Link href={item.href}>
                            <item.icon className="size-4" />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>

          <SidebarFooter className="border-t px-4 py-3 space-y-3">
            <div className="flex items-center justify-center gap-1">
              {footerActions.map((item) => (
                <Tooltip key={item.label} delayDuration={300}>
                  <TooltipTrigger asChild>
                    {'href' in item ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent"
                        asChild
                      >
                        <Link href={item.href}>
                          <item.icon className="size-4" />
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          'h-8 w-8 p-0 text-muted-foreground hover:bg-accent',
                          item.action === 'reset'
                            ? 'hover:text-destructive'
                            : 'hover:text-foreground',
                        )}
                        onClick={() => handleFooterClick(item.action)}
                      >
                        <item.icon className="size-4" />
                      </Button>
                    )}
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>

            <span className="flex items-center justify-center">
              <GitHubStarsButton repo={APP_CONFIG.githubRepo} size="sm" />
            </span>
          </SidebarFooter>
        </>
      ) : (
        <>
          <SidebarContent className="overflow-hidden p-0">
            <div className="flex min-h-0 flex-1">
              <div className="flex w-19 flex-col items-center border-r bg-muted/20 px-2 py-3">
                <Tooltip delayDuration={250}>
                  <TooltipTrigger asChild>
                    <Link
                      href="/?view=analytics"
                      className="flex size-12 items-center justify-center rounded-2xl border bg-background/80 p-2 transition-colors hover:bg-muted"
                    >
                      <img
                        src={logoSrc}
                        alt={APP_CONFIG.name}
                        className="h-7 w-auto object-contain shrink-0"
                      />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    Analytics overview
                  </TooltipContent>
                </Tooltip>

                <div className="flex-1 overflow-y-auto">
                  {projects.length > 0 ? (
                    <div className="mt-3 flex flex-col items-center gap-2">
                      {projects.map((project) => {
                        const isActive = project.id === selectedProjectId;

                        return (
                          <ContextMenu key={project.id}>
                            <Tooltip delayDuration={250}>
                              <TooltipTrigger asChild>
                                <ContextMenuTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={() => handleProjectSelect(project.id)}
                                    className={cn(
                                      'rounded-2xl p-1.5 transition-colors',
                                      isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted',
                                    )}
                                  >
                                    {getProjectGlyph(project)}
                                  </button>
                                </ContextMenuTrigger>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="text-xs">
                                {project.name}
                              </TooltipContent>
                            </Tooltip>

                            <ContextMenuContent>
                              <ContextMenuLabel>{project.name}</ContextMenuLabel>
                              <ContextMenuSeparator />
                              <ContextMenuGroup>
                                <ContextMenuItem onClick={() => handleProjectSelect(project.id)}>
                                  Open Project
                                </ContextMenuItem>
                                <ContextMenuItem onClick={() => setEditingProject(project)}>
                                  <Pencil />
                                  Edit Project
                                </ContextMenuItem>
                              </ContextMenuGroup>
                            </ContextMenuContent>
                          </ContextMenu>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-6 flex items-start justify-center">
                      <Tooltip delayDuration={250}>
                        <TooltipTrigger asChild>
                          <div className="rounded-2xl border border-dashed bg-background/70 p-3 text-muted-foreground">
                            <Folders className="size-5" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs">
                          No projects yet
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  className="mx-auto mt-3 size-10 rounded-2xl"
                  onClick={() => setProjectDialogOpen(true)}
                >
                  <Plus className="size-4" />
                </Button>
              </div>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex-1 overflow-y-auto p-3">
                  {selectedProjectId ? (
                    projectBuckets.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {projectBuckets.map((bucket) => {
                          const isActive = selectedBucketId === bucket.id;
                          const bucketInventory = inventory[bucket.id];
                          const fileCount = bucketInventory?.fileCount ?? 0;
                          const totalSize = bucketInventory?.totalSizeBytes ?? 0;
                          const activity = buildSidebarActivity(bucketInventory?.files ?? []);

                          return (
                            <div
                              key={bucket.id}
                              className={cn(
                                'group rounded-2xl px-3 py-3 transition-all duration-200',
                                isActive
                                  ? 'bg-linear-to-r from-primary/14 via-primary/8 to-transparent shadow-sm'
                                  : 'hover:bg-muted/35',
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleBucketSelect(bucket)}
                                  className="min-w-0 flex-1 text-left"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p
                                        className={cn(
                                          'truncate text-sm font-medium',
                                          isActive ? 'text-foreground' : 'text-foreground/90',
                                        )}
                                      >
                                        {bucket.name}
                                      </p>
                                      <p className="mt-1 text-xs text-muted-foreground">
                                        {fileCount} files · {formatStorage(totalSize)}
                                      </p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                      <div className="hidden sm:block">
                                        <p className="mb-1 text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                                          Activity
                                        </p>
                                        <div className="h-5 w-16 opacity-85">
                                          <Sparklines data={activity} height={20} min={0}>
                                            <SparklinesLine
                                              color="var(--primary)"
                                              style={{
                                                fill: 'var(--primary)',
                                                fillOpacity: 0.12,
                                                strokeWidth: 1.5,
                                              }}
                                            />
                                          </Sparklines>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={cn(
                                    'size-7 shrink-0 text-muted-foreground transition-opacity hover:text-destructive',
                                    'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
                                  )}
                                  onClick={() => setDeleteTarget(bucket)}
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed p-4 text-center">
                        <p className="text-sm font-medium">No buckets yet</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Create a bucket to start managing storage for this project.
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="rounded-xl border border-dashed p-4 text-center">
                      <p className="text-sm font-medium">Select a project</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Pick a project from the rail to reveal its buckets.
                      </p>
                    </div>
                  )}
                </div>

                <div className="border-t p-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setBucketDialogOpen(true)}
                    disabled={!selectedProjectId}
                  >
                    <Plus data-icon="inline-start" />
                    New Bucket
                  </Button>
                </div>
              </div>
            </div>
          </SidebarContent>

          {simplifiedFooter}
        </>
      )}

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset All Local Data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all local data (buckets, projects, files, environments, and system
              state) and redirect you to the onboarding flow. This does <strong>not</strong> delete
              anything from AWS — only the local JSON metadata is cleared.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReset} disabled={resetting}>
              {resetting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Resetting…
                </>
              ) : (
                'Reset Everything'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreateProjectDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        onSubmit={handleCreateProject}
        loading={creatingProject}
      />

      <CreateBucketDialog
        open={bucketDialogOpen}
        onOpenChange={setBucketDialogOpen}
        onSubmit={handleCreateBucket}
        projects={projects}
        loading={creatingBucket}
        environments={environments}
        defaultProjectId={selectedProjectId ?? undefined}
      />

      <DeleteBucketDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        bucket={deleteTarget}
        fileCount={deleteTarget ? (inventory[deleteTarget.id]?.fileCount ?? 0) : 0}
        onComplete={() => {
          const deletedBucketProjectId = deleteTarget?.projectId ?? null;

          if (deleteTarget?.id === selectedBucketId) {
            setSelectedBucketId(null);
          }
          refetchBuckets();
          setDeleteTarget(null);
          if (!isDeveloperMode && deletedBucketProjectId) {
            setSelectedProjectId(deletedBucketProjectId);
            router.push(`/projects/${deletedBucketProjectId}`);
          }
        }}
      />

      <ProjectEditorDialog
        open={!!editingProject}
        onOpenChange={(open) => {
          if (!open) {
            setEditingProject(null);
          }
        }}
        project={editingProject}
        loading={updatingProject}
        onSubmit={handleProjectUpdate}
      />
    </Sidebar>
  );
}
