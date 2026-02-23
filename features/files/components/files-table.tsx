// Presentational table for listing file metadata records + S3 merged files
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
import { MoreHorizontal, Trash2, ExternalLink, FileUp, Upload, Cloud } from "lucide-react";
import type { FileRecord } from "@/lib/types";
import type { MergedS3File } from "@/features/files/hooks/use-files";

// ── Legacy metadata view ────────────────────────────────────────────────────

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

// ── S3 merged files view (shows actual bucket contents) ─────────────────────

interface S3FilesTableProps {
  files: MergedS3File[];
  onDeleteMetadata?: (id: string) => void;
}

function getMimeFromKey(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  const mimeMap: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif",
    webp: "image/webp", svg: "image/svg+xml", bmp: "image/bmp", ico: "image/x-icon",
    pdf: "application/pdf", json: "application/json", xml: "application/xml",
    csv: "text/csv", txt: "text/plain", html: "text/html", css: "text/css",
    js: "application/javascript", ts: "application/typescript",
    zip: "application/zip", gz: "application/gzip", tar: "application/x-tar",
    mp4: "video/mp4", webm: "video/webm", avi: "video/x-msvideo",
    mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg",
    doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
  return mimeMap[ext] || "application/octet-stream";
}

function getFileName(key: string): string {
  return key.split("/").pop() ?? key;
}

export function S3FilesTable({ files, onDeleteMetadata }: S3FilesTableProps) {
  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Cloud className="mb-3 size-10" />
        <p className="text-sm">No files found in this S3 bucket.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>File Name</TableHead>
          <TableHead>Object Key</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Size</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Last Modified</TableHead>
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {files.map((file) => {
          const mime = file.metadata?.mimeType || getMimeFromKey(file.key);
          return (
            <TableRow key={file.key}>
              <TableCell className="font-medium text-sm max-w-[180px] truncate">
                {getFileName(file.key)}
              </TableCell>
              <TableCell className="max-w-[220px] truncate font-mono text-xs text-muted-foreground">
                {file.key}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-[10px]">{mime.split("/")[1] || mime}</Badge>
              </TableCell>
              <TableCell className="text-sm">{formatBytes(file.size)}</TableCell>
              <TableCell>
                {file.uploadedFromSystem ? (
                  <Badge className="gap-1 bg-green-500/10 text-green-600 border-green-500/20 text-[10px]">
                    <Upload className="size-2.5" /> Uploaded from System
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">
                    <Cloud className="mr-1 size-2.5" /> External / Direct
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {file.lastModified
                  ? new Date(file.lastModified).toLocaleDateString()
                  : "—"}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-xs">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {file.cdnUrl && (
                      <DropdownMenuItem asChild>
                        <a
                          href={file.cdnUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="mr-2 size-4" />
                          Open CDN URL
                        </a>
                      </DropdownMenuItem>
                    )}
                    {file.uploadedFromSystem && file.metadata && onDeleteMetadata && (
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => onDeleteMetadata(file.metadata!.id)}
                      >
                        <Trash2 className="mr-2 size-4" />
                        Delete Metadata
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
