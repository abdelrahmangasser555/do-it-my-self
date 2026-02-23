// Presentational table for listing file metadata records
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
import { MoreHorizontal, Trash2, ExternalLink, FileUp } from "lucide-react";
import type { FileRecord } from "@/lib/types";

interface FilesTableProps {
  files: FileRecord[];
  onDelete: (id: string) => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function FilesTable({ files, onDelete }: FilesTableProps) {
  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <FileUp className="mb-3 size-10" />
        <p className="text-sm">No files uploaded yet.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Object Key</TableHead>
          <TableHead>MIME Type</TableHead>
          <TableHead>Size</TableHead>
          <TableHead>Linked Model</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {files.map((file) => (
          <TableRow key={file.id}>
            <TableCell className="max-w-[250px] truncate font-mono text-xs">
              {file.objectKey}
            </TableCell>
            <TableCell>
              <Badge variant="outline">{file.mimeType}</Badge>
            </TableCell>
            <TableCell>{formatBytes(file.size)}</TableCell>
            <TableCell>
              {file.linkedModel ? (
                <span className="text-sm">
                  {file.linkedModel}:{file.linkedModelId}
                </span>
              ) : (
                <Badge variant="secondary">Orphan</Badge>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {new Date(file.createdAt).toLocaleDateString()}
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-xs">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {file.cloudFrontUrl && (
                    <DropdownMenuItem asChild>
                      <a
                        href={file.cloudFrontUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="mr-2 size-4" />
                        Open CDN URL
                      </a>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onDelete(file.id)}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Delete Record
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
