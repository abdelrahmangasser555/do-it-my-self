// Code snippet generators for setup flows — organized by framework
import type { Bucket } from '@/lib/types';

export interface AwsCredentials {
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
}

// ── Shared Helpers ──────────────────────────────────────────────────────────

export function generateEnvSnippet(bucket: Bucket, creds?: AwsCredentials): string {
  const keyId = creds?.accessKeyId || 'YOUR_AWS_ACCESS_KEY_ID';
  const secret = creds?.secretAccessKey || 'YOUR_AWS_SECRET_ACCESS_KEY';
  return `# .env.local — S3 bucket credentials for ${bucket.name}
NEXT_PUBLIC_S3_BUCKET=${bucket.s3BucketName}
NEXT_PUBLIC_CLOUDFRONT_DOMAIN=${bucket.cloudFrontDomain || 'your-distribution.cloudfront.net'}
AWS_REGION=${bucket.region}
AWS_ACCESS_KEY_ID=${keyId}
AWS_SECRET_ACCESS_KEY=${secret}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// NEXT.JS SNIPPETS
// ═══════════════════════════════════════════════════════════════════════════

export function nextjsInstall(): string {
  return `npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner uuid

# Or with pnpm / yarn
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner uuid`;
}

export function nextjsUploadApi(bucket: Bucket): string {
  const cf = bucket.cloudFrontDomain || 'your-distribution.cloudfront.net';
  return `// app/api/storage/upload/route.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

const s3 = new S3Client({ region: process.env.AWS_REGION || "${bucket.region}" });
const BUCKET = process.env.NEXT_PUBLIC_S3_BUCKET || "${bucket.s3BucketName}";
const CF_DOMAIN = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN || "${cf}";
const MAX_FILE_SIZE_MB = ${bucket.config?.maxFileSizeMB ?? 100};

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { fileName, contentType, fileSize, model, modelId, folder } = body;

  // Validate file size
  if (fileSize > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return NextResponse.json(
      { error: \`File exceeds max size of \${MAX_FILE_SIZE_MB} MB\` },
      { status: 400 }
    );
  }

  const prefix = folder ? \`\${folder}/\` : "uploads/";
  const objectKey = \`\${prefix}\${uuidv4()}-\${fileName}\`;
  const cdnUrl = \`https://\${CF_DOMAIN}/\${objectKey}\`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: objectKey,
    ContentType: contentType,
    Metadata: {
      ...(model && { "x-model": model }),
      ...(modelId && { "x-model-id": modelId }),
      "x-uploaded-at": new Date().toISOString(),
    },
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

  return NextResponse.json({
    uploadUrl,
    objectKey,
    cdnUrl,
    fileId: objectKey,
    metadata: { model: model || null, modelId: modelId || null },
  });
}`;
}

export function nextjsDeleteApi(bucket: Bucket): string {
  return `// app/api/storage/delete/route.ts
import { S3Client, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";

const s3 = new S3Client({ region: process.env.AWS_REGION || "${bucket.region}" });
const BUCKET = process.env.NEXT_PUBLIC_S3_BUCKET || "${bucket.s3BucketName}";

// Delete a single file by its object key
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const objectKey = searchParams.get("key");
  const model = searchParams.get("model");
  const modelId = searchParams.get("modelId");

  // Delete by specific key
  if (objectKey) {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: objectKey }));
    return NextResponse.json({ success: true, deleted: 1 });
  }

  // Delete all files linked to a specific model instance
  if (model && modelId) {
    const prefix = \`uploads/\`;
    const list = await s3.send(
      new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix })
    );

    const toDelete = (list.Contents || []).filter((obj) => {
      // In practice, you'd query your database for files linked to this model.
      // This is a simplified example using S3 metadata.
      return true; // Replace with actual filtering logic
    });

    for (const obj of toDelete) {
      if (obj.Key) {
        await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: obj.Key }));
      }
    }

    return NextResponse.json({ success: true, deleted: toDelete.length });
  }

  return NextResponse.json({ error: "Provide 'key' or 'model' + 'modelId'" }, { status: 400 });
}`;
}

export function nextjsHooks(bucket: Bucket): string {
  const cf = bucket.cloudFrontDomain || 'your-distribution.cloudfront.net';
  return `// hooks/use-storage.ts — Custom hooks for S3 file operations
"use client";

import { useState, useCallback } from "react";

// ── Types ───────────────────────────────────────────────────────────────

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  objectKey: string;
  cdnUrl: string;
  progress: number;
  status: "pending" | "uploading" | "complete" | "error";
  error?: string;
  model?: string;
  modelId?: string;
}

export interface UseUploadOptions {
  model?: string;
  modelId?: string;
  folder?: string;
  maxFileSizeMB?: number;
  onUploadComplete?: (file: UploadedFile) => void;
  onUploadError?: (file: UploadedFile, error: string) => void;
}

// ── useUpload Hook ──────────────────────────────────────────────────────

export function useUpload(options: UseUploadOptions = {}) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const createFile = useCallback(
    async (file: File): Promise<UploadedFile | null> => {
      const maxSize = (options.maxFileSizeMB || ${bucket.config?.maxFileSizeMB ?? 100}) * 1024 * 1024;

      const entry: UploadedFile = {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type,
        objectKey: "",
        cdnUrl: "",
        progress: 0,
        status: "pending",
        model: options.model,
        modelId: options.modelId,
      };

      if (file.size > maxSize) {
        entry.status = "error";
        entry.error = \`File exceeds \${options.maxFileSizeMB || ${bucket.config?.maxFileSizeMB ?? 100}} MB limit\`;
        setFiles((prev) => [...prev, entry]);
        options.onUploadError?.(entry, entry.error);
        return entry;
      }

      setFiles((prev) => [...prev, entry]);
      setIsUploading(true);

      try {
        // Step 1: Get presigned URL
        const res = await fetch("/api/storage/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type,
            fileSize: file.size,
            model: options.model,
            modelId: options.modelId,
            folder: options.folder,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to get upload URL");
        }

        const { uploadUrl, objectKey, cdnUrl } = await res.json();
        entry.objectKey = objectKey;
        entry.cdnUrl = cdnUrl;

        // Step 2: Upload to S3 with progress tracking
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const progress = Math.round((e.loaded / e.total) * 100);
              setFiles((prev) =>
                prev.map((f) => (f.id === entry.id ? { ...f, progress } : f))
              );
            }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(\`Upload failed with status \${xhr.status}\`));
            }
          };
          xhr.onerror = () => reject(new Error("Network error during upload"));
          xhr.open("PUT", uploadUrl);
          xhr.setRequestHeader("Content-Type", file.type);
          xhr.send(file);
        });

        const completed = { ...entry, progress: 100, status: "complete" as const };
        setFiles((prev) =>
          prev.map((f) => (f.id === entry.id ? completed : f))
        );
        options.onUploadComplete?.(completed);
        return completed;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Upload failed";
        const failed = { ...entry, status: "error" as const, error: errorMsg };
        setFiles((prev) =>
          prev.map((f) => (f.id === entry.id ? failed : f))
        );
        options.onUploadError?.(failed, errorMsg);
        return failed;
      } finally {
        setIsUploading(false);
      }
    },
    [options]
  );

  const uploadMultiple = useCallback(
    async (fileList: File[]) => {
      const results: UploadedFile[] = [];
      for (const file of fileList) {
        const result = await createFile(file);
        if (result) results.push(result);
      }
      return results;
    },
    [createFile]
  );

  const deleteByFileId = useCallback(
    async (objectKey: string): Promise<boolean> => {
      try {
        const res = await fetch(\`/api/storage/delete?key=\${encodeURIComponent(objectKey)}\`, {
          method: "DELETE",
        });
        if (res.ok) {
          setFiles((prev) => prev.filter((f) => f.objectKey !== objectKey));
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    []
  );

  const deleteByModelId = useCallback(
    async (model: string, modelId: string): Promise<boolean> => {
      try {
        const params = new URLSearchParams({ model, modelId });
        const res = await fetch(\`/api/storage/delete?\${params}\`, {
          method: "DELETE",
        });
        if (res.ok) {
          setFiles((prev) =>
            prev.filter((f) => !(f.model === model && f.modelId === modelId))
          );
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    []
  );

  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
  }, []);

  return {
    files,
    isUploading,
    createFile,
    uploadMultiple,
    deleteByFileId,
    deleteByModelId,
    removeFile,
    clearFiles,
  };
}

// ── useFileList Hook ────────────────────────────────────────────────────
// Fetches and manages a list of files from the bucket

export function useFileList(model?: string, modelId?: string) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (model) params.set("model", model);
      if (modelId) params.set("modelId", modelId);
      const res = await fetch(\`/api/storage/files?\${params}\`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [model, modelId]);

  return { files, loading, refresh };
}`;
}

export function nextjsComponentShadcn(bucket: Bucket): string {
  const maxMB = bucket.config?.maxFileSizeMB ?? 100;
  return `// components/storage/file-upload.tsx — shadcn/ui file upload component
"use client";

import { useCallback, useRef } from "react";
import { Upload, X, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useUpload, type UseUploadOptions, type UploadedFile } from "@/hooks/use-storage";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

interface FileUploadProps {
  model?: string;
  modelId?: string;
  folder?: string;
  allowDownload?: boolean;
  allowOpenPreview?: boolean;
  disabled?: boolean;
  maxFileSizeMB?: number;
  onUploadComplete?: (file: UploadedFile) => void;
  className?: string;
}

export function FileUpload({
  model,
  modelId,
  folder,
  allowDownload = true,
  allowOpenPreview = true,
  disabled = false,
  maxFileSizeMB = ${maxMB},
  onUploadComplete,
  className,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { files, isUploading, createFile, removeFile } = useUpload({
    model,
    modelId,
    folder,
    maxFileSizeMB,
    onUploadComplete,
  });

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return;
      e.preventDefault();
      Array.from(e.dataTransfer.files).forEach(createFile);
    },
    [createFile, disabled]
  );

  const handleSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      Array.from(e.target.files || []).forEach(createFile);
      e.target.value = "";
    },
    [createFile]
  );

  return (
    <div className={cn("space-y-4", className)}>
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors",
          disabled
            ? "cursor-not-allowed opacity-50"
            : "cursor-pointer border-muted-foreground/25 hover:border-muted-foreground/50"
        )}
      >
        <div className="rounded-full bg-muted p-3">
          <Upload className="size-5 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">
            {disabled ? "Upload disabled" : "Drop files here or click to browse"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Max: {maxFileSizeMB} MB</p>
          {model && (
            <Badge variant="outline" className="mt-2 text-[10px]">
              Linking to {model}{modelId ? \`:\${modelId}\` : ""}
            </Badge>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleSelect}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div key={file.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
              <FileText className="size-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <span className="text-xs text-muted-foreground ml-2 shrink-0">
                    {formatBytes(file.size)}
                  </span>
                </div>
                {file.status === "uploading" && <Progress value={file.progress} className="mt-1.5 h-1" />}
                {file.status === "error" && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="size-3" /> {file.error}
                  </p>
                )}
                {file.status === "complete" && (
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-green-500 flex items-center gap-1">
                      <CheckCircle2 className="size-3" /> Uploaded
                    </p>
                    {allowOpenPreview && file.cdnUrl && (
                      <a
                        href={file.cdnUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        Preview
                      </a>
                    )}
                  </div>
                )}
              </div>
              {!disabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 shrink-0"
                  onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                >
                  <X className="size-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}`;
}

export function nextjsAvatarShadcn(bucket: Bucket): string {
  return `// components/storage/avatar-upload.tsx — shadcn/ui avatar upload
"use client";

import { useCallback, useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUpload, type UploadedFile } from "@/hooks/use-storage";

interface AvatarUploadProps {
  model?: string;
  modelId?: string;
  currentUrl?: string;
  allowDownload?: boolean;
  allowOpenPreview?: boolean;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  shape?: "circle" | "rounded";
  onUploadComplete?: (file: UploadedFile) => void;
  className?: string;
}

const SIZES = { sm: "size-16", md: "size-24", lg: "size-32" };

export function AvatarUpload({
  model,
  modelId,
  currentUrl,
  disabled = false,
  size = "md",
  shape = "circle",
  onUploadComplete,
  className,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState(currentUrl || "");
  const { isUploading, createFile } = useUpload({
    model,
    modelId,
    folder: "avatars",
    onUploadComplete: (file) => {
      setPreviewUrl(file.cdnUrl);
      onUploadComplete?.(file);
    },
  });

  const handleSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        // Show local preview immediately
        setPreviewUrl(URL.createObjectURL(file));
        createFile(file);
      }
      e.target.value = "";
    },
    [createFile]
  );

  return (
    <div
      className={cn(
        "relative inline-block",
        SIZES[size],
        shape === "circle" ? "rounded-full" : "rounded-lg",
        "overflow-hidden border-2 border-dashed border-muted-foreground/25",
        !disabled && "cursor-pointer hover:border-primary/50",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onClick={() => !disabled && !isUploading && inputRef.current?.click()}
    >
      {previewUrl ? (
        <img src={previewUrl} alt="Avatar" className="size-full object-cover" />
      ) : (
        <div className="size-full bg-muted flex items-center justify-center">
          <Camera className="size-1/3 text-muted-foreground" />
        </div>
      )}

      {isUploading && (
        <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
          <Loader2 className="size-5 animate-spin" />
        </div>
      )}

      {!disabled && !isUploading && (
        <div className="absolute inset-0 bg-background/0 hover:bg-background/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <Camera className="size-5 text-foreground" />
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />
    </div>
  );
}`;
}

export function nextjsButtonUploadShadcn(bucket: Bucket): string {
  return `// components/storage/button-upload.tsx — shadcn/ui button upload (no drop zone)
"use client";

import { useCallback, useRef } from "react";
import { Upload, X, FileText, CheckCircle2, AlertCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useUpload, type UploadedFile } from "@/hooks/use-storage";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

interface ButtonUploadProps {
  model?: string;
  modelId?: string;
  folder?: string;
  allowDownload?: boolean;
  allowOpenPreview?: boolean;
  disabled?: boolean;
  multiple?: boolean;
  accept?: string;
  label?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  onUploadComplete?: (file: UploadedFile) => void;
  className?: string;
}

export function ButtonUpload({
  model,
  modelId,
  folder,
  allowDownload = true,
  allowOpenPreview = true,
  disabled = false,
  multiple = true,
  accept,
  label = "Upload Files",
  variant = "outline",
  onUploadComplete,
  className,
}: ButtonUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { files, isUploading, createFile, removeFile } = useUpload({
    model,
    modelId,
    folder,
    onUploadComplete,
  });

  const handleSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      Array.from(e.target.files || []).forEach(createFile);
      e.target.value = "";
    },
    [createFile]
  );

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <Button
          variant={variant}
          size="sm"
          disabled={disabled || isUploading}
          onClick={() => inputRef.current?.click()}
        >
          <Plus className="size-3.5 mr-1.5" />
          {label}
        </Button>
        {model && (
          <Badge variant="outline" className="text-[10px]">
            {model}{modelId ? \`:\${modelId}\` : ""}
          </Badge>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={handleSelect}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((file) => (
            <div key={file.id} className="flex items-center gap-2 text-sm">
              <FileText className="size-3.5 text-muted-foreground shrink-0" />
              <span className="truncate flex-1">{file.name}</span>
              <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>
              {file.status === "uploading" && (
                <div className="w-16">
                  <Progress value={file.progress} className="h-1" />
                </div>
              )}
              {file.status === "complete" && (
                <CheckCircle2 className="size-3.5 text-green-500" />
              )}
              {file.status === "error" && (
                <AlertCircle className="size-3.5 text-red-500" />
              )}
              {!disabled && (
                <button onClick={() => removeFile(file.id)} className="text-muted-foreground hover:text-foreground">
                  <X className="size-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}`;
}

export function nextjsFilesTableShadcn(): string {
  return `// components/storage/files-table.tsx — shadcn/ui files display table
"use client";

import { useEffect, useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Download, Trash2, Unlink, Link2 } from "lucide-react";

interface StorageFile {
  objectKey: string;
  cdnUrl: string;
  size: number;
  mimeType: string;
  model?: string;
  modelId?: string;
  createdAt: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

interface FilesTableProps {
  files?: StorageFile[];
  model?: string;
  modelId?: string;
  allowDownload?: boolean;
  allowOpenPreview?: boolean;
  allowDelete?: boolean;
  disabled?: boolean;
  onDelete?: (objectKey: string) => void;
  className?: string;
}

export function FilesTable({
  files: propFiles,
  model,
  modelId,
  allowDownload = true,
  allowOpenPreview = true,
  allowDelete = false,
  disabled = false,
  onDelete,
  className,
}: FilesTableProps) {
  const [files, setFiles] = useState<StorageFile[]>(propFiles || []);
  const [loading, setLoading] = useState(!propFiles);

  useEffect(() => {
    if (propFiles) { setFiles(propFiles); return; }
    // Auto-fetch files if not provided
    const params = new URLSearchParams();
    if (model) params.set("model", model);
    if (modelId) params.set("modelId", modelId);
    setLoading(true);
    fetch(\`/api/storage/files?\${params}\`)
      .then((r) => r.json())
      .then((d) => setFiles(d.files || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [propFiles, model, modelId]);

  if (loading) return <p className="text-sm text-muted-foreground py-4">Loading files...</p>;
  if (files.length === 0) return <p className="text-sm text-muted-foreground py-4">No files found.</p>;

  return (
    <Table className={className}>
      <TableHeader>
        <TableRow>
          <TableHead>File</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Size</TableHead>
          <TableHead>Linked Model</TableHead>
          <TableHead>Date</TableHead>
          {(allowDownload || allowOpenPreview || allowDelete) && <TableHead className="w-24" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {files.map((file) => (
          <TableRow key={file.objectKey}>
            <TableCell className="font-medium text-sm truncate max-w-48">
              {file.objectKey.split("/").pop()}
            </TableCell>
            <TableCell>
              <Badge variant="outline" className="text-[10px]">
                {file.mimeType.split("/")[1] || file.mimeType}
              </Badge>
            </TableCell>
            <TableCell className="text-sm">{formatBytes(file.size)}</TableCell>
            <TableCell>
              {file.model ? (
                <Badge className="gap-1 bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px]">
                  <Link2 className="size-2.5" /> {file.model}:{file.modelId}
                </Badge>
              ) : (
                <Badge className="gap-1 bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
                  <Unlink className="size-2.5" /> Orphan
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {new Date(file.createdAt).toLocaleDateString()}
            </TableCell>
            {(allowDownload || allowOpenPreview || allowDelete) && (
              <TableCell>
                <div className="flex items-center gap-1">
                  {allowOpenPreview && file.cdnUrl && (
                    <Button variant="ghost" size="sm" className="h-7 px-2" asChild>
                      <a href={file.cdnUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="size-3.5" />
                      </a>
                    </Button>
                  )}
                  {allowDownload && file.cdnUrl && (
                    <Button variant="ghost" size="sm" className="h-7 px-2" asChild>
                      <a href={file.cdnUrl} download>
                        <Download className="size-3.5" />
                      </a>
                    </Button>
                  )}
                  {allowDelete && !disabled && onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-destructive"
                      onClick={() => onDelete(file.objectKey)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}`;
}

export function nextjsComponentPlain(bucket: Bucket): string {
  const maxMB = bucket.config?.maxFileSizeMB ?? 100;
  return `// components/storage/file-upload.tsx — Plain JSX component (no shadcn dependency)
"use client";

import { useCallback, useRef } from "react";
import { useUpload, type UploadedFile } from "@/hooks/use-storage";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

interface FileUploadProps {
  model?: string;
  modelId?: string;
  folder?: string;
  allowDownload?: boolean;
  allowOpenPreview?: boolean;
  disabled?: boolean;
  maxFileSizeMB?: number;
  onUploadComplete?: (file: UploadedFile) => void;
  className?: string;
}

export function FileUpload({
  model, modelId, folder, disabled = false,
  allowOpenPreview = true, maxFileSizeMB = ${maxMB},
  onUploadComplete, className,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { files, createFile, removeFile } = useUpload({
    model, modelId, folder, maxFileSizeMB, onUploadComplete,
  });

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return;
      e.preventDefault();
      Array.from(e.dataTransfer.files).forEach(createFile);
    },
    [createFile, disabled]
  );

  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => !disabled && inputRef.current?.click()}
        style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: "0.75rem", padding: "2rem", border: "2px dashed #d1d5db", borderRadius: "0.5rem",
          cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
        }}
      >
        <span style={{ fontSize: "2rem" }}>📁</span>
        <p style={{ fontSize: "0.875rem", fontWeight: 500 }}>
          {disabled ? "Upload disabled" : "Drop files here or click to browse"}
        </p>
        <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>Max: {maxFileSizeMB} MB</p>
        {model && (
          <span style={{ fontSize: "0.65rem", padding: "2px 6px", border: "1px solid #e5e7eb", borderRadius: "4px" }}>
            Linking to {model}{modelId ? \`:\${modelId}\` : ""}
          </span>
        )}
        <input ref={inputRef} type="file" multiple onChange={(e) => {
          Array.from(e.target.files || []).forEach(createFile);
          e.target.value = "";
        }} style={{ display: "none" }} disabled={disabled} />
      </div>

      {files.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {files.map((file) => (
            <div key={file.id} style={{
              display: "flex", alignItems: "center", gap: "0.75rem",
              padding: "0.75rem", border: "1px solid #e5e7eb", borderRadius: "0.5rem",
            }}>
              <span>📄</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.875rem", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>
                  <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>{formatBytes(file.size)}</span>
                </div>
                {file.status === "uploading" && (
                  <div style={{ marginTop: "0.375rem", height: "4px", background: "#e5e7eb", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{ width: \`\${file.progress}%\`, height: "100%", background: "#3b82f6", transition: "width 0.3s" }} />
                  </div>
                )}
                {file.status === "error" && <p style={{ fontSize: "0.75rem", color: "#ef4444", marginTop: "0.25rem" }}>❌ {file.error}</p>}
                {file.status === "complete" && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "#22c55e" }}>✅ Uploaded</span>
                    {allowOpenPreview && file.cdnUrl && (
                      <a href={file.cdnUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.75rem", color: "#3b82f6" }}>
                        Preview
                      </a>
                    )}
                  </div>
                )}
              </div>
              {!disabled && (
                <button onClick={() => removeFile(file.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.875rem" }}>✕</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}`;
}

export function nextjsExampleUsage(bucket: Bucket): string {
  return `// app/example/page.tsx — Full example showing all storage components
"use client";

import { useState } from "react";
import { FileUpload } from "@/components/storage/file-upload";
import { AvatarUpload } from "@/components/storage/avatar-upload";
import { ButtonUpload } from "@/components/storage/button-upload";
import { FilesTable } from "@/components/storage/files-table";
import type { UploadedFile } from "@/hooks/use-storage";

export default function StorageExamplePage() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "2rem" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "2rem" }}>
        Storage Integration Examples
      </h1>

      {/* Example 1: File Upload with Model Linking */}
      <section style={{ marginBottom: "3rem" }}>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.5rem" }}>
          1. File Upload (Linked to a Model)
        </h2>
        <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1rem" }}>
          Files are linked to "Product" model with ID "prod_123". This prevents orphan files.
        </p>
        <FileUpload
          model="Product"
          modelId="prod_123"
          folder="products"
          onUploadComplete={(file) => {
            console.log("Uploaded:", file.cdnUrl);
            setUploadedFiles((prev) => [...prev, file]);
          }}
        />
      </section>

      {/* Example 2: Avatar Upload */}
      <section style={{ marginBottom: "3rem" }}>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.5rem" }}>
          2. Avatar Upload
        </h2>
        <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1rem" }}>
          Single image upload for user profile or product avatar.
        </p>
        <div style={{ display: "flex", gap: "1.5rem" }}>
          <AvatarUpload
            model="User"
            modelId="user_456"
            size="lg"
            shape="circle"
            onUploadComplete={(file) => console.log("Avatar:", file.cdnUrl)}
          />
          <AvatarUpload
            model="Product"
            modelId="prod_123"
            size="lg"
            shape="rounded"
            onUploadComplete={(file) => console.log("Product image:", file.cdnUrl)}
          />
        </div>
      </section>

      {/* Example 3: Button Upload (for table rows, forms) */}
      <section style={{ marginBottom: "3rem" }}>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.5rem" }}>
          3. Button Upload (for Forms & Tables)
        </h2>
        <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1rem" }}>
          Compact upload button for inline usage in forms or data tables.
        </p>
        <ButtonUpload
          model="Invoice"
          modelId="inv_789"
          folder="documents"
          label="Attach Files"
          accept=".pdf,.doc,.docx"
          onUploadComplete={(file) => console.log("Attached:", file.cdnUrl)}
        />
      </section>

      {/* Example 4: Orphan Upload (no model linking) */}
      <section style={{ marginBottom: "3rem" }}>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.5rem" }}>
          4. Orphan Upload (No Model Linking)
        </h2>
        <p style={{ fontSize: "0.875rem", color: "#ef4444", marginBottom: "1rem" }}>
          ⚠ Files uploaded without model/modelId become orphans. You can manage them from the dashboard.
        </p>
        <FileUpload
          folder="misc"
          onUploadComplete={(file) => console.log("Orphan file:", file.cdnUrl)}
        />
      </section>

      {/* Example 5: Files Table */}
      <section style={{ marginBottom: "3rem" }}>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.5rem" }}>
          5. Files Table
        </h2>
        <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1rem" }}>
          Display all files for a specific model instance. Shows orphan status.
        </p>
        <FilesTable
          model="Product"
          modelId="prod_123"
          allowDownload
          allowOpenPreview
          allowDelete
          onDelete={(key) => console.log("Delete:", key)}
        />
      </section>

      {/* Example 6: Read-Only / Disabled State */}
      <section style={{ marginBottom: "3rem" }}>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.5rem" }}>
          6. Disabled State (Read-Only)
        </h2>
        <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1rem" }}>
          All components support a disabled prop for read-only mode.
        </p>
        <FileUpload model="Product" modelId="prod_123" disabled />
      </section>
    </div>
  );
}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// NODE.JS SNIPPETS
// ═══════════════════════════════════════════════════════════════════════════

export function nodejsInstall(): string {
  return `npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner express uuid cors

# Or with pnpm / yarn
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner express uuid cors`;
}

export function nodejsEnv(bucket: Bucket, creds?: AwsCredentials): string {
  const keyId = creds?.accessKeyId || 'YOUR_AWS_ACCESS_KEY_ID';
  const secret = creds?.secretAccessKey || 'YOUR_AWS_SECRET_ACCESS_KEY';
  return `# .env
S3_BUCKET=${bucket.s3BucketName}
CLOUDFRONT_DOMAIN=${bucket.cloudFrontDomain || 'your-distribution.cloudfront.net'}
AWS_REGION=${bucket.region}
AWS_ACCESS_KEY_ID=${keyId}
AWS_SECRET_ACCESS_KEY=${secret}
PORT=3001`;
}

export function nodejsUploadApi(bucket: Bucket): string {
  const cf = bucket.cloudFrontDomain || 'your-distribution.cloudfront.net';
  return `// routes/storage.js — Express.js S3 upload + delete API
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { v4: uuidv4 } = require("uuid");
const express = require("express");
require("dotenv").config();

const router = express.Router();
const s3 = new S3Client({ region: process.env.AWS_REGION || "${bucket.region}" });
const BUCKET = process.env.S3_BUCKET || "${bucket.s3BucketName}";
const CF_DOMAIN = process.env.CLOUDFRONT_DOMAIN || "${cf}";
const MAX_FILE_SIZE_MB = ${bucket.config?.maxFileSizeMB ?? 100};

// POST /api/storage/upload — Get presigned upload URL
router.post("/upload", async (req, res) => {
  try {
    const { fileName, contentType, fileSize, model, modelId, folder } = req.body;

    if (fileSize > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return res.status(400).json({
        error: \`File exceeds max size of \${MAX_FILE_SIZE_MB} MB\`,
      });
    }

    const prefix = folder ? \`\${folder}/\` : "uploads/";
    const objectKey = \`\${prefix}\${uuidv4()}-\${fileName}\`;
    const cdnUrl = \`https://\${CF_DOMAIN}/\${objectKey}\`;

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: objectKey,
      ContentType: contentType,
      Metadata: {
        ...(model && { "x-model": model }),
        ...(modelId && { "x-model-id": modelId }),
        "x-uploaded-at": new Date().toISOString(),
      },
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

    res.json({
      uploadUrl,
      objectKey,
      cdnUrl,
      fileId: objectKey,
      metadata: { model: model || null, modelId: modelId || null },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/storage/delete — Delete file from S3
router.delete("/delete", async (req, res) => {
  try {
    const { key } = req.query;

    if (!key) {
      return res.status(400).json({ error: "Provide 'key' query parameter" });
    }

    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;`;
}

export function nodejsExample(): string {
  return `// server.js — Minimal Express server using the storage routes
const express = require("express");
const cors = require("cors");
const storageRoutes = require("./routes/storage");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Mount storage routes
app.use("/api/storage", storageRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(\`Storage API running on http://localhost:\${PORT}\`);
});

// Usage examples with curl:
//
// Upload:
// curl -X POST http://localhost:3001/api/storage/upload \\
//   -H "Content-Type: application/json" \\
//   -d '{"fileName":"photo.jpg","contentType":"image/jpeg","fileSize":1024000,"model":"User","modelId":"usr_123"}'
//
// Delete:
// curl -X DELETE "http://localhost:3001/api/storage/delete?key=uploads/abc-photo.jpg"`;
}

// ═══════════════════════════════════════════════════════════════════════════
// PYTHON SNIPPETS
// ═══════════════════════════════════════════════════════════════════════════

export function pythonInstall(): string {
  return `pip install boto3 flask flask-cors python-dotenv uuid

# Or add to requirements.txt:
# boto3
# flask
# flask-cors
# python-dotenv`;
}

export function pythonEnv(bucket: Bucket, creds?: AwsCredentials): string {
  const keyId = creds?.accessKeyId || 'YOUR_AWS_ACCESS_KEY_ID';
  const secret = creds?.secretAccessKey || 'YOUR_AWS_SECRET_ACCESS_KEY';
  return `# .env
S3_BUCKET=${bucket.s3BucketName}
CLOUDFRONT_DOMAIN=${bucket.cloudFrontDomain || 'your-distribution.cloudfront.net'}
AWS_REGION=${bucket.region}
AWS_ACCESS_KEY_ID=${keyId}
AWS_SECRET_ACCESS_KEY=${secret}`;
}

export function pythonUploadApi(bucket: Bucket): string {
  const cf = bucket.cloudFrontDomain || 'your-distribution.cloudfront.net';
  return `# app.py — Flask S3 upload/delete API
import os
import uuid
import boto3
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

s3 = boto3.client("s3", region_name=os.getenv("AWS_REGION", "${bucket.region}"))
BUCKET = os.getenv("S3_BUCKET", "${bucket.s3BucketName}")
CF_DOMAIN = os.getenv("CLOUDFRONT_DOMAIN", "${cf}")
MAX_FILE_SIZE_MB = ${bucket.config?.maxFileSizeMB ?? 100}


@app.route("/api/storage/upload", methods=["POST"])
def upload():
    """Generate a presigned URL for direct S3 upload."""
    data = request.json
    file_name = data["fileName"]
    content_type = data["contentType"]
    file_size = data.get("fileSize", 0)
    model = data.get("model")
    model_id = data.get("modelId")
    folder = data.get("folder", "uploads")

    if file_size > MAX_FILE_SIZE_MB * 1024 * 1024:
        return jsonify({"error": f"File exceeds {MAX_FILE_SIZE_MB} MB limit"}), 400

    object_key = f"{folder}/{uuid.uuid4()}-{file_name}"
    cdn_url = f"https://{CF_DOMAIN}/{object_key}"

    # Build metadata for model linking
    metadata = {"x-uploaded-at": str(uuid.uuid4())}
    if model:
        metadata["x-model"] = model
    if model_id:
        metadata["x-model-id"] = model_id

    upload_url = s3.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": BUCKET,
            "Key": object_key,
            "ContentType": content_type,
            "Metadata": metadata,
        },
        ExpiresIn=3600,
    )

    return jsonify({
        "uploadUrl": upload_url,
        "objectKey": object_key,
        "cdnUrl": cdn_url,
        "fileId": object_key,
        "metadata": {"model": model, "modelId": model_id},
    })


@app.route("/api/storage/delete", methods=["DELETE"])
def delete_file():
    """Delete a file from S3 by its object key."""
    key = request.args.get("key")
    if not key:
        return jsonify({"error": "Provide 'key' query parameter"}), 400

    s3.delete_object(Bucket=BUCKET, Key=key)
    return jsonify({"success": True})


if __name__ == "__main__":
    app.run(port=3001, debug=True)`;
}

export function pythonUtilFunctions(bucket: Bucket): string {
  const cf = bucket.cloudFrontDomain || 'your-distribution.cloudfront.net';
  return `# storage_utils.py — Utility functions for S3 operations
import os
import uuid
import boto3
from typing import Optional

s3 = boto3.client("s3", region_name=os.getenv("AWS_REGION", "${bucket.region}"))
BUCKET = os.getenv("S3_BUCKET", "${bucket.s3BucketName}")
CF_DOMAIN = os.getenv("CLOUDFRONT_DOMAIN", "${cf}")


def create_upload_url(
    file_name: str,
    content_type: str,
    model: Optional[str] = None,
    model_id: Optional[str] = None,
    folder: str = "uploads",
) -> dict:
    """Generate a presigned upload URL and return file metadata."""
    object_key = f"{folder}/{uuid.uuid4()}-{file_name}"
    cdn_url = f"https://{CF_DOMAIN}/{object_key}"

    metadata = {"x-uploaded-at": str(uuid.uuid4())}
    if model:
        metadata["x-model"] = model
    if model_id:
        metadata["x-model-id"] = model_id

    upload_url = s3.generate_presigned_url(
        "put_object",
        Params={"Bucket": BUCKET, "Key": object_key, "ContentType": content_type, "Metadata": metadata},
        ExpiresIn=3600,
    )

    return {"uploadUrl": upload_url, "objectKey": object_key, "cdnUrl": cdn_url}


def delete_file(object_key: str) -> bool:
    """Delete a single file from S3."""
    try:
        s3.delete_object(Bucket=BUCKET, Key=object_key)
        return True
    except Exception:
        return False


def delete_by_model(model: str, model_id: str) -> int:
    """Delete all files linked to a specific model instance. Returns count deleted."""
    # Note: In production, query your database for the object keys
    # linked to this model instead of scanning S3 metadata directly.
    deleted = 0
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=BUCKET, Prefix="uploads/"):
        for obj in page.get("Contents", []):
            try:
                head = s3.head_object(Bucket=BUCKET, Key=obj["Key"])
                meta = head.get("Metadata", {})
                if meta.get("x-model") == model and meta.get("x-model-id") == model_id:
                    s3.delete_object(Bucket=BUCKET, Key=obj["Key"])
                    deleted += 1
            except Exception:
                continue
    return deleted`;
}

export function pythonExample(): string {
  return `# example_usage.py — Example of using the storage utilities
from storage_utils import create_upload_url, delete_file, delete_by_model
import requests

# 1. Upload a file linked to a model
result = create_upload_url(
    file_name="profile.jpg",
    content_type="image/jpeg",
    model="User",
    model_id="user_123",
    folder="avatars"
)
print(f"Upload URL: {result['uploadUrl']}")
print(f"CDN URL: {result['cdnUrl']}")
print(f"Object Key: {result['objectKey']}")

# Upload the actual file to the presigned URL
with open("profile.jpg", "rb") as f:
    requests.put(
        result["uploadUrl"],
        data=f,
        headers={"Content-Type": "image/jpeg"}
    )

# 2. Upload an orphan file (no model linking)
orphan = create_upload_url("document.pdf", "application/pdf", folder="misc")
print(f"⚠ Orphan file CDN URL: {orphan['cdnUrl']}")

# 3. Delete a specific file
delete_file(result["objectKey"])

# 4. Delete all files linked to a User
count = delete_by_model("User", "user_123")
print(f"Deleted {count} files linked to User:user_123")`;
}

// ═══════════════════════════════════════════════════════════════════════════
// JAVA SNIPPETS
// ═══════════════════════════════════════════════════════════════════════════

export function javaInstall(): string {
  return `<!-- pom.xml — Add these dependencies -->
<dependencies>
    <dependency>
        <groupId>software.amazon.awssdk</groupId>
        <artifactId>s3</artifactId>
        <version>2.25.0</version>
    </dependency>
    <dependency>
        <groupId>software.amazon.awssdk</groupId>
        <artifactId>s3-transfer-manager</artifactId>
        <version>2.25.0</version>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
</dependencies>`;
}

export function javaProperties(bucket: Bucket, creds?: AwsCredentials): string {
  const keyId = creds?.accessKeyId || 'YOUR_AWS_ACCESS_KEY_ID';
  const secret = creds?.secretAccessKey || 'YOUR_AWS_SECRET_ACCESS_KEY';
  return `# application.properties
aws.s3.bucket=${bucket.s3BucketName}
aws.s3.region=${bucket.region}
aws.cloudfront.domain=${bucket.cloudFrontDomain || 'your-distribution.cloudfront.net'}
aws.access-key=${keyId}
aws.secret-key=${secret}
storage.max-file-size-mb=${bucket.config?.maxFileSizeMB ?? 100}`;
}

export function javaUploadApi(bucket: Bucket): string {
  return `// StorageController.java — Spring Boot S3 upload + delete
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.regions.Region;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import java.time.Duration;
import java.util.*;

@RestController
@RequestMapping("/api/storage")
public class StorageController {

    @Value("\${aws.s3.bucket}") private String bucket;
    @Value("\${aws.s3.region}") private String region;
    @Value("\${aws.cloudfront.domain}") private String cfDomain;
    @Value("\${storage.max-file-size-mb}") private long maxFileSizeMB;

    @PostMapping("/upload")
    public Map<String, Object> upload(@RequestBody Map<String, Object> body) {
        String fileName = (String) body.get("fileName");
        String contentType = (String) body.get("contentType");
        long fileSize = ((Number) body.getOrDefault("fileSize", 0)).longValue();
        String model = (String) body.get("model");
        String modelId = (String) body.get("modelId");
        String folder = (String) body.getOrDefault("folder", "uploads");

        if (fileSize > maxFileSizeMB * 1024 * 1024) {
            throw new RuntimeException("File exceeds " + maxFileSizeMB + " MB limit");
        }

        String objectKey = folder + "/" + UUID.randomUUID() + "-" + fileName;
        String cdnUrl = "https://" + cfDomain + "/" + objectKey;

        Map<String, String> metadata = new HashMap<>();
        metadata.put("x-uploaded-at", new Date().toString());
        if (model != null) metadata.put("x-model", model);
        if (modelId != null) metadata.put("x-model-id", modelId);

        S3Presigner presigner = S3Presigner.builder()
                .region(Region.of(region)).build();

        PutObjectRequest putRequest = PutObjectRequest.builder()
                .bucket(bucket).key(objectKey).contentType(contentType)
                .metadata(metadata).build();

        String uploadUrl = presigner.presignPutObject(
                PutObjectPresignRequest.builder()
                        .signatureDuration(Duration.ofHours(1))
                        .putObjectRequest(putRequest).build()
        ).url().toString();

        return Map.of(
            "uploadUrl", uploadUrl,
            "objectKey", objectKey,
            "cdnUrl", cdnUrl,
            "fileId", objectKey,
            "metadata", Map.of("model", model != null ? model : "", "modelId", modelId != null ? modelId : "")
        );
    }

    @DeleteMapping("/delete")
    public Map<String, Object> delete(@RequestParam String key) {
        S3Client s3 = S3Client.builder().region(Region.of(region)).build();
        s3.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build());
        return Map.of("success", true);
    }
}`;
}

export function javaExample(): string {
  return `// ExampleUsage.java — Using the storage API from a Java client
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class ExampleUsage {
    private static final String API_BASE = "http://localhost:8080/api/storage";
    private static final HttpClient client = HttpClient.newHttpClient();

    public static void main(String[] args) throws Exception {
        // 1. Upload with model linking
        String uploadBody = """
            {
                "fileName": "report.pdf",
                "contentType": "application/pdf",
                "fileSize": 1024000,
                "model": "Invoice",
                "modelId": "inv_001",
                "folder": "documents"
            }
            """;

        HttpRequest uploadReq = HttpRequest.newBuilder()
                .uri(URI.create(API_BASE + "/upload"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(uploadBody))
                .build();

        HttpResponse<String> uploadRes = client.send(uploadReq,
                HttpResponse.BodyHandlers.ofString());
        System.out.println("Upload response: " + uploadRes.body());

        // 2. Delete a file
        HttpRequest deleteReq = HttpRequest.newBuilder()
                .uri(URI.create(API_BASE + "/delete?key=documents/abc-report.pdf"))
                .DELETE()
                .build();

        HttpResponse<String> deleteRes = client.send(deleteReq,
                HttpResponse.BodyHandlers.ofString());
        System.out.println("Delete response: " + deleteRes.body());
    }
}`;
}
