// Direct file upload dialog for active buckets
"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileUp,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  File as FileIcon,
} from "lucide-react";
import type { Bucket } from "@/lib/types";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bucket: Bucket;
  projectId: string;
  onUploadComplete?: () => void;
}

interface UploadFile {
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
  cdnUrl?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function UploadDialog({
  open,
  onOpenChange,
  bucket,
  projectId,
  onUploadComplete,
}: UploadDialogProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const maxMB = bucket.config?.maxFileSizeMB ?? 100;

  const addFiles = useCallback(
    (fileList: FileList) => {
      const newFiles: UploadFile[] = Array.from(fileList).map((file) => ({
        file,
        status: "pending" as const,
        progress: 0,
        error:
          file.size > maxMB * 1024 * 1024
            ? `File exceeds ${maxMB} MB limit`
            : undefined,
      }));
      // Mark oversized files as error immediately
      newFiles.forEach((f) => {
        if (f.error) f.status = "error";
      });
      setFiles((prev) => [...prev, ...newFiles]);
    },
    [maxMB]
  );

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadAll = async () => {
    setUploading(true);
    const pendingFiles = files.filter((f) => f.status === "pending");

    for (let i = 0; i < pendingFiles.length; i++) {
      const uploadFile = pendingFiles[i];
      const fileIndex = files.indexOf(uploadFile);

      // Update status to uploading
      setFiles((prev) => {
        const next = [...prev];
        next[fileIndex] = { ...next[fileIndex], status: "uploading", progress: 0 };
        return next;
      });

      try {
        // Get presigned URL
        const res = await fetch("/api/files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            bucketName: bucket.s3BucketName,
            fileName: uploadFile.file.name,
            fileSize: uploadFile.file.size,
            mimeType: uploadFile.file.type || "application/octet-stream",
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to get upload URL");
        }

        const { uploadUrl, cloudFrontUrl } = await res.json();

        // Upload to S3 with progress
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100);
              setFiles((prev) => {
                const next = [...prev];
                next[fileIndex] = { ...next[fileIndex], progress: pct };
                return next;
              });
            }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setFiles((prev) => {
                const next = [...prev];
                next[fileIndex] = {
                  ...next[fileIndex],
                  status: "success",
                  progress: 100,
                  cdnUrl: cloudFrontUrl,
                };
                return next;
              });
              resolve();
            } else {
              reject(new Error(`Upload returned ${xhr.status}`));
            }
          };
          xhr.onerror = () => reject(new Error("Network error during upload"));
          xhr.open("PUT", uploadUrl);
          xhr.setRequestHeader("Content-Type", uploadFile.file.type || "application/octet-stream");
          xhr.send(uploadFile.file);
        });
      } catch (err) {
        setFiles((prev) => {
          const next = [...prev];
          next[fileIndex] = {
            ...next[fileIndex],
            status: "error",
            error: err instanceof Error ? err.message : "Upload failed",
          };
          return next;
        });
      }
    }

    setUploading(false);
    onUploadComplete?.();
  };

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const successCount = files.filter((f) => f.status === "success").length;
  const errorCount = files.filter((f) => f.status === "error").length;

  const handleClose = (isOpen: boolean) => {
    if (!uploading) {
      if (!isOpen) setFiles([]);
      onOpenChange(isOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="size-5" />
            Upload Files
          </DialogTitle>
          <DialogDescription>
            Upload files directly to <span className="font-mono text-xs">{bucket.s3BucketName}</span>.
            Max file size: {maxMB} MB.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop zone */}
          <div
            onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
            className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
              dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
            }`}
          >
            <Upload className="mb-2 size-8 text-muted-foreground" />
            <p className="text-sm font-medium">Drop files here or click to browse</p>
            <p className="mt-1 text-xs text-muted-foreground">Max {maxMB} MB per file</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => inputRef.current?.click()}>
              <FileUp className="mr-1.5 size-3.5" /> Select Files
            </Button>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
            />
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="max-h-60 space-y-2 overflow-y-auto">
              <AnimatePresence>
                {files.map((f, i) => (
                  <motion.div
                    key={`${f.file.name}-${i}`}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">{f.file.name}</p>
                        <span className="text-xs text-muted-foreground shrink-0">{formatBytes(f.file.size)}</span>
                      </div>
                      {f.status === "uploading" && <Progress value={f.progress} className="h-1.5" />}
                      {f.status === "error" && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <XCircle className="size-3" /> {f.error}
                        </p>
                      )}
                      {f.status === "success" && (
                        <div className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="size-3 shrink-0" /> Uploaded
                          {f.cdnUrl && (
                            <a
                              href={f.cdnUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-[10px] text-muted-foreground hover:text-primary truncate block max-w-[250px]"
                              title={f.cdnUrl}
                            >
                              {f.cdnUrl.length > 60
                                ? `${f.cdnUrl.slice(0, 30)}...${f.cdnUrl.slice(-25)}`
                                : f.cdnUrl}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                    {f.status === "pending" && !uploading && (
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={() => removeFile(i)}>
                        <X className="size-3.5" />
                      </Button>
                    )}
                    {f.status === "uploading" && (
                      <Loader2 className="size-4 animate-spin shrink-0 text-muted-foreground" />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Summary & actions */}
          {files.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                {pendingCount > 0 && <Badge variant="outline">{pendingCount} pending</Badge>}
                {successCount > 0 && <Badge className="bg-green-500/10 text-green-600 border-green-500/20">{successCount} uploaded</Badge>}
                {errorCount > 0 && <Badge variant="destructive">{errorCount} failed</Badge>}
              </div>
              <div className="flex items-center gap-2">
                {!uploading && (
                  <Button variant="ghost" size="sm" onClick={() => setFiles([])}>
                    Clear All
                  </Button>
                )}
                <Button
                  size="sm"
                  disabled={uploading || pendingCount === 0}
                  onClick={uploadAll}
                >
                  {uploading ? (
                    <><Loader2 className="mr-1.5 size-3.5 animate-spin" /> Uploading...</>
                  ) : (
                    <><Upload className="mr-1.5 size-3.5" /> Upload {pendingCount} File{pendingCount !== 1 ? "s" : ""}</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
