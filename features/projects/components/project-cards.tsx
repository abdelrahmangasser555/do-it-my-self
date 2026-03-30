// Card-based project grid with context menu actions
"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  FolderKanban,
  Database,
  Calendar,
  Shield,
  FileUp,
  Trash2,
  ExternalLink,
  MoreHorizontal,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Project, Bucket } from "@/lib/types";

interface ProjectCardsProps {
  projects: Project[];
  buckets: Bucket[];
  onDelete: (id: string) => void;
}

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      delay: i * 0.06,
      ease: [0.25, 0.1, 0.25, 1] as const,
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project, i) => {
          const projectBuckets = getBucketsForProject(project.id);
          const activeBuckets = projectBuckets.filter((b) => b.status === "active");
          const pendingBuckets = projectBuckets.filter((b) => b.status === "pending");
          const totalFiles = projectBuckets.reduce(() => 0, 0); // Files would need a separate count
          const hasBuckets = projectBuckets.length > 0;

          return (
            <ContextMenu key={project.id}>
              <ContextMenuTrigger asChild>
                <motion.div
                  custom={i}
                  initial="hidden"
                  animate="visible"
                  variants={cardVariants}
                >
                  <Link href={`/projects/${project.id}`} className="block group">
                    <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 group-focus-visible:ring-2 group-focus-visible:ring-ring">
                      {/* Top gradient accent */}
                      <div
                        className={`absolute inset-x-0 top-0 h-1 ${
                          project.environment === "prod"
                            ? "bg-gradient-to-r from-blue-500 to-blue-600"
                            : "bg-gradient-to-r from-emerald-500 to-emerald-600"
                        }`}
                      />

                      <CardContent className="pt-5 pb-4 px-5">
                        {/* Header row */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                                project.environment === "prod"
                                  ? "bg-blue-500/10 text-blue-500"
                                  : "bg-emerald-500/10 text-emerald-500"
                              }`}
                            >
                              <FolderKanban className="size-4.5" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                                {project.name}
                              </h3>
                              <Badge
                                variant={project.environment === "prod" ? "default" : "secondary"}
                                className="mt-0.5 text-[10px] px-1.5 py-0"
                              >
                                {project.environment}
                              </Badge>
                            </div>
                          </div>

                          {/* Dropdown for clicking (stops link navigation) */}
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
                                {hasBuckets ? "Has buckets — can't delete" : "Delete Project"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Stats row */}
                        <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-border/50">
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                              <Database className="size-3" />
                            </div>
                            <p className="text-lg font-bold tabular-nums">{projectBuckets.length}</p>
                            <p className="text-[10px] text-muted-foreground">Buckets</p>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                              <Shield className="size-3" />
                            </div>
                            <p className="text-lg font-bold tabular-nums text-green-500">
                              {activeBuckets.length}
                            </p>
                            <p className="text-[10px] text-muted-foreground">Active</p>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                              <FileUp className="size-3" />
                            </div>
                            <p className="text-lg font-bold tabular-nums">{project.maxFileSizeMB}</p>
                            <p className="text-[10px] text-muted-foreground">MB Max</p>
                          </div>
                        </div>

                        {/* Pending indicator */}
                        {pendingBuckets.length > 0 && (
                          <div className="mt-3 flex items-center gap-1.5 text-yellow-500">
                            <div className="size-1.5 rounded-full bg-yellow-500 animate-pulse" />
                            <span className="text-[10px] font-medium">
                              {pendingBuckets.length} pending deployment{pendingBuckets.length > 1 ? "s" : ""}
                            </span>
                          </div>
                        )}

                        {/* Footer */}
                        <div className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <Calendar className="size-2.5" />
                          {new Date(project.createdAt).toLocaleDateString()}
                          <span className="mx-1">·</span>
                          {project.allowedMimeTypes.length} file type{project.allowedMimeTypes.length !== 1 ? "s" : ""}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              </ContextMenuTrigger>

              {/* Right-click context menu */}
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
                  {hasBuckets ? "Has buckets — can't delete" : "Delete Project"}
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
              <strong>{deleteTarget?.name}</strong> has{" "}
              {deleteTarget ? getBucketsForProject(deleteTarget.id).length : 0} bucket(s) inside it.
              You must delete all buckets before you can remove the project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Got it
            </Button>
            {deleteTarget && (
              <Button asChild>
                <Link href={`/projects/${deleteTarget.id}`}>
                  Go to Project
                </Link>
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
