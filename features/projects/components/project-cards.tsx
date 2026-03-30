// Card-based project grid with context menu actions
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  FolderKanban,
  Database,
  Calendar,
  Trash2,
  ExternalLink,
  MoreHorizontal,
  AlertTriangle,
  Zap,
  CircleDot,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Project, Bucket } from '@/lib/types';

interface ProjectCardsProps {
  projects: Project[];
  buckets: Bucket[];
  onDelete: (id: string) => void;
}

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      delay: i * 0.05,
    },
  }),
};

export function ProjectCards({ projects, buckets, onDelete }: ProjectCardsProps) {
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <FolderKanban className="mb-4 size-12 opacity-40" />
        <p className="text-sm font-medium">No projects yet</p>
        <p className="text-xs mt-1">Create your first project to get started.</p>
      </div>
    );
  }

  const getBucketsForProject = (projectId: string) =>
    buckets.filter((b) => b.projectId === projectId);

  const handleDeleteAttempt = (project: Project) => {
    const projectBuckets = getBucketsForProject(project.id);
    if (projectBuckets.length > 0) {
      setDeleteTarget(project);
    } else {
      onDelete(project.id);
    }
  };

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project, i) => {
          const projectBuckets = getBucketsForProject(project.id);
          const activeBuckets = projectBuckets.filter((b) => b.status === 'active');
          const pendingBuckets = projectBuckets.filter((b) => b.status === 'pending');
          const hasBuckets = projectBuckets.length > 0;
          const isProd = project.environment === 'prod';

          return (
            <ContextMenu key={project.id}>
              <ContextMenuTrigger asChild>
                <motion.div
                  custom={i}
                  initial="hidden"
                  animate="visible"
                  variants={cardVariants}
                  className="group relative"
                >
                  {/* Green base layer — stays fixed */}
                  <div className="absolute inset-0 rounded-lg bg-emerald-500/80 translate-x-0.5 translate-y-0.5" />

                  {/* Top card layer — shifts on hover */}
                  <Link href={`/projects/${project.id}`} className="block relative">
                    <div className="relative rounded-lg border border-border bg-card p-4 transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
                            <FolderKanban className="size-4 text-foreground" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-sm truncate">{project.name}</h3>
                            <Badge
                              variant="outline"
                              className={`mt-0.5 text-[10px] px-1.5 py-0 ${
                                isProd
                                  ? 'border-blue-500/30 text-blue-400'
                                  : 'border-emerald-500/30 text-emerald-400'
                              }`}
                            >
                              {project.environment}
                            </Badge>
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.preventDefault()}
                            >
                              <MoreHorizontal className="size-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/projects/${project.id}`}>
                                <ExternalLink className="mr-2 size-3.5" />
                                Open Project
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              disabled={hasBuckets}
                              onClick={(e) => {
                                e.preventDefault();
                                handleDeleteAttempt(project);
                              }}
                            >
                              <Trash2 className="mr-2 size-3.5" />
                              {hasBuckets ? 'Has buckets' : 'Delete'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Stats — compact horizontal row */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground border-t border-border/50 pt-3">
                        <span className="flex items-center gap-1">
                          <Database className="size-3" />
                          <span className="font-medium text-foreground">
                            {projectBuckets.length}
                          </span>
                          bucket{projectBuckets.length !== 1 ? 's' : ''}
                        </span>
                        <span className="flex items-center gap-1">
                          <CircleDot className="size-3 text-green-500" />
                          <span className="font-medium text-foreground">
                            {activeBuckets.length}
                          </span>
                          active
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap className="size-3" />
                          {project.maxFileSizeMB} MB
                        </span>
                      </div>

                      {/* Pending indicator */}
                      {pendingBuckets.length > 0 && (
                        <div className="mt-2 flex items-center gap-1.5 text-yellow-500">
                          <div className="size-1.5 rounded-full bg-yellow-500 animate-pulse" />
                          <span className="text-[10px] font-medium">
                            {pendingBuckets.length} pending
                          </span>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Calendar className="size-2.5" />
                        {new Date(project.createdAt).toLocaleDateString()}
                        <span className="mx-0.5">·</span>
                        {project.allowedMimeTypes.length} type
                        {project.allowedMimeTypes.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              </ContextMenuTrigger>

              <ContextMenuContent className="w-48">
                <ContextMenuItem asChild>
                  <Link href={`/projects/${project.id}`}>
                    <ExternalLink className="mr-2 size-3.5" />
                    Open Project
                  </Link>
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  className="text-destructive focus:text-destructive"
                  disabled={hasBuckets}
                  onClick={() => handleDeleteAttempt(project)}
                >
                  <Trash2 className="mr-2 size-3.5" />
                  {hasBuckets ? "Has buckets — can't delete" : 'Delete Project'}
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
      </div>

      {/* Can't delete dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-yellow-500" />
              Cannot Delete Project
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong> has{' '}
              {deleteTarget ? getBucketsForProject(deleteTarget.id).length : 0} bucket(s). Delete
              all buckets first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Got it
            </Button>
            {deleteTarget && (
              <Button asChild>
                <Link href={`/projects/${deleteTarget.id}`}>Go to Project</Link>
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
