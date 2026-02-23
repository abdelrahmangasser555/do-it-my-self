// Presentational table component for listing all projects
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Trash2, FolderOpen } from "lucide-react";
import type { Project } from "@/lib/types";
import Link from "next/link";

interface ProjectsTableProps {
  projects: Project[];
  onDelete: (id: string) => void;
}

export function ProjectsTable({ projects, onDelete }: ProjectsTableProps) {
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <FolderOpen className="mb-3 size-10" />
        <p className="text-sm">No projects yet. Create your first one.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Environment</TableHead>
          <TableHead>Max File Size</TableHead>
          <TableHead>File Types</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.map((project) => (
          <TableRow key={project.id}>
            <TableCell className="font-medium">
              <Link
                href={`/projects/${project.id}`}
                className="hover:underline"
              >
                {project.name}
              </Link>
            </TableCell>
            <TableCell>
              <Badge
                variant={project.environment === "prod" ? "default" : "secondary"}
              >
                {project.environment}
              </Badge>
            </TableCell>
            <TableCell>{project.maxFileSizeMB} MB</TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {project.allowedMimeTypes.slice(0, 3).map((t) => (
                  <Badge key={t} variant="outline" className="text-xs">
                    {t.split("/")[1]}
                  </Badge>
                ))}
                {project.allowedMimeTypes.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{project.allowedMimeTypes.length - 3}
                  </Badge>
                )}
              </div>
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {new Date(project.createdAt).toLocaleDateString()}
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-xs">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/projects/${project.id}`}>View Details</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onDelete(project.id)}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
