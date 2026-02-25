// Hook for file operations - fetch, upload (presigned URL), delete
"use client";

import { useState, useEffect, useCallback } from "react";
import type { FileRecord } from "@/lib/types";

export function useFiles(projectId?: string, bucketName?: string) {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (projectId) params.set("projectId", projectId);
      if (bucketName) params.set("bucketName", bucketName);
      const res = await fetch(`/api/files?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch files");
      const data = await res.json();
      setFiles(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [projectId, bucketName]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  return { files, loading, error, refetch: fetchFiles };
}

export function useGeneratePresignedUrl() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateUrl = async (data: {
    projectId: string;
    bucketName: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    linkedModel?: string;
    linkedModelId?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate URL");
      }
      return await res.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { generateUrl, loading, error };
}

export function useDeleteFile() {
  const [loading, setLoading] = useState(false);

  /** Full delete — removes from S3 and the local metadata record. */
  const deleteFile = async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      const res = await fetch(`/api/files?id=${id}`, { method: "DELETE" });
      return res.ok;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Soft delete — removes only the local tracking record.
   * The file remains in S3 and will re-appear as "External / Direct" on the next sync.
   */
  const deleteMetadataOnly = async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      const res = await fetch(`/api/files?id=${id}&skipS3=true`, { method: "DELETE" });
      return res.ok;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { deleteFile, deleteMetadataOnly, loading };
}

// ── S3 real files hook ──────────────────────────────────────────────────────

export interface MergedS3File {
  key: string;
  size: number;
  lastModified: string;
  etag?: string;
  storageClass?: string;
  uploadedFromSystem: boolean;
  metadata?: FileRecord;
  cdnUrl?: string;
}

export interface S3FilesResponse {
  files: MergedS3File[];
  totalSize: number;
  totalFiles: number;
  systemUploaded: number;
  bucketName: string;
}

export function useS3Files(bucketName?: string, region?: string) {
  const [data, setData] = useState<S3FilesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchS3Files = useCallback(async () => {
    if (!bucketName) return;
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ bucketName });
      if (region) params.set("region", region);
      const res = await fetch(`/api/files/s3?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to list S3 files");
      }
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [bucketName, region]);

  useEffect(() => {
    fetchS3Files();
  }, [fetchS3Files]);

  return {
    s3Files: data?.files ?? [],
    totalSize: data?.totalSize ?? 0,
    totalFiles: data?.totalFiles ?? 0,
    systemUploaded: data?.systemUploaded ?? 0,
    loading,
    error,
    refetch: fetchS3Files,
  };
}
