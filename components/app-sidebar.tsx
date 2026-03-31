// Dashboard sidebar navigation component
'use client';

import { type ElementType } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
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
  Compass,
  HardDrive,
  Plus,
  FolderPlus,
} from 'lucide-react';
import { useTour } from '@/components/ui/tour';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { APP_CONFIG } from '@/lib/config';
import { toast } from 'sonner';
import { GitHubStarsButton } from '@/components/ui/github-stars-button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CreateProjectDialog } from '@/features/projects/components/create-project-dialog';
import { CreateBucketDialog } from '@/features/buckets/components/create-bucket-dialog';
import { useCreateProject } from '@/features/projects/hooks/use-projects';
import { useCreateBucket } from '@/features/buckets/hooks/use-buckets';
import { useProjects } from '@/features/projects/hooks/use-projects';
import { useEnvironments } from '@/features/environments/hooks/use-environments';

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
type FooterAction = { label: string; icon: ElementType; action: 'tour' | 'reset' };
type FooterItem = FooterLink | FooterAction;

const footerActions: FooterItem[] = [
  { label: 'Settings', icon: Settings, href: '/settings' },
  { label: 'Documentation', icon: BookOpen, href: '/docs/setup-guide' },
  { label: 'Commands', icon: Zap, href: '/commands' },
  { label: 'Start Tour', icon: Compass, action: 'tour' },
  { label: 'Reset Local Data', icon: RotateCcw, action: 'reset' },
];

export function AppSidebar() {
  const pathname = usePathname();
  const tour = useTour();
  const router = useRouter();
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [bucketDialogOpen, setBucketDialogOpen] = useState(false);

  const { createProject, loading: creatingProject } = useCreateProject();
  const { createBucket, loading: creatingBucket } = useCreateBucket();
  const { projects } = useProjects();
  const { environments } = useEnvironments();

  const handleCreateProject = async (data: Parameters<typeof createProject>[0]) => {
    const result = await createProject(data);
    if (result) {
      toast.success(`Project "${result.name}" created`);
      setProjectDialogOpen(false);
    } else {
      toast.error('Failed to create project');
    }
  };

  const handleCreateBucket = async (data: Parameters<typeof createBucket>[0], deploy?: boolean) => {
    const result = await createBucket(data);
    if (result) {
      toast.success(`Bucket "${result.name}" created`);
      setBucketDialogOpen(false);
      if (deploy) {
        router.push('/buckets');
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

  const handleFooterClick = (action: 'tour' | 'reset') => {
    if (action === 'tour') tour.start('product-tour');
    if (action === 'reset') setResetOpen(true);
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 h-14">
        <div className="flex items-center justify-between">
          <HardDrive className="size-5 text-primary shrink-0" />
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
        {/* Icon row */}
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
                    <Link href={(item as FooterLink).href}>
                      <item.icon className="size-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 w-8 p-0 text-muted-foreground hover:bg-accent ${
                      (item as FooterAction).action === 'reset'
                        ? 'hover:text-destructive'
                        : 'hover:text-foreground'
                    }`}
                    onClick={() => handleFooterClick((item as FooterAction).action)}
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

        {/* GitHub stars */}
        <span className="flex items-center justify-center">
          <GitHubStarsButton repo={APP_CONFIG.githubRepo} size="sm" />
        </span>
      </SidebarFooter>

      {/* Reset confirmation dialog */}
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
      />
    </Sidebar>
  );
}
