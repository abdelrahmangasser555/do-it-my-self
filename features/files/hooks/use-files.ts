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

  return { deleteFile, loading };
}
