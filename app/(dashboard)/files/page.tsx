// Files listing page — live S3 data with folder-based layout
"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageTransition } from "@/components/page-transition";
import { S3FilesTable } from "@/features/files/components/files-table";
import { GlobalFolderView } from "@/features/files/components/folder-structure";
import { useFiles, useDeleteFile } from "@/features/files/hooks/use-files";
import type { Bucket } from "@/lib/types";
import type { MergedS3File } from "@/features/files/hooks/use-files";
import {
  RefreshCw,
  Database,
  FolderTree,
  Loader2,
  HardDrive,
  FileUp,
  Cloud,
} from "lucide-react";

interface BucketS3Data {
  bucketId: string;
  bucketName: string;
  region?: string;
  displayName: string;
  files: MergedS3File[];
  totalSize: number;
  totalFiles: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default function FilesPage() {
  const { files: metadataFiles, loading: metaLoading, refetch: refetchMeta } = useFiles();
  const { deleteMetadataOnly } = useDeleteFile();
  const [bucketData, setBucketData] = useState<BucketS3Data[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [view, setView] = useState<"folder" | "table">("folder");

  const fetchAllS3 = useCallback(async () => {
    try {
      setLoading(true);
      // Get all buckets
      const bucketsRes = await fetch("/api/buckets");
      if (!bucketsRes.ok) throw new Error("Failed to load buckets");
      const buckets: Bucket[] = await bucketsRes.json();

      // Fetch S3 files for each active bucket in parallel
      const activeBuckets = buckets.filter((b) => b.status === "active");
      const results = await Promise.allSettled(
        activeBuckets.map(async (bucket) => {
          const params = new URLSearchParams({ bucketName: bucket.s3BucketName });
          if (bucket.region) params.set("region", bucket.region);
          const res = await fetch(`/api/files/s3?${params.toString()}`);
          if (!res.ok) return null;
          const data = await res.json();
          return {
            bucketId: bucket.id,
            bucketName: bucket.s3BucketName,
            region: bucket.region,
            displayName: bucket.name,
            files: data.files as MergedS3File[],
            totalSize: data.totalSize as number,
            totalFiles: data.totalFiles as number,
          };
        })
      );

      const data: BucketS3Data[] = results.flatMap((r) =>
        r.status === "fulfilled" && r.value !== null ? [r.value] : []
      );

      setBucketData(data);
      setSyncedAt(new Date().toISOString());
    } catch {
      toast.error("Failed to sync files from S3");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllS3();
  }, [fetchAllS3]);

  const handleSync = () => {
    fetchAllS3();
    refetchMeta();
    toast.info("Syncing files from AWS...");
  };

  /** Soft-delete: removes only the tracking record; file stays in S3 and reappears as External on next sync */
  const handleDeleteMetadata = async (id: string) => {
    const success = await deleteMetadataOnly(id);
    if (success) {
      toast.success("Tracking record removed — file remains in S3");
      refetchMeta();
      fetchAllS3();
    } else {
      toast.error("Failed to remove tracking record");
    }
  };

  /** Hard-delete factory: permanently removes a file from S3 for the given bucket */
  const makeDeleteS3Handler = (bd: BucketS3Data) => async (key: string) => {
    try {
      const res = await fetch("/api/files/s3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          bucketName: bd.bucketName,
          region: bd.region,
          key,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete file from S3");
      }
      toast.success("File permanently deleted from S3");
      refetchMeta();
      fetchAllS3();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete file from S3");
    }
  };

  // Aggregate all files across buckets
  const allS3Files = bucketData.flatMap((b) => b.files);
  const totalSize = bucketData.reduce((s, b) => s + b.totalSize, 0);
  const totalFiles = bucketData.reduce((s, b) => s + b.totalFiles, 0);

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Files</h1>
            <p className="text-muted-foreground">
              Live view of all files across all S3 buckets.
            </p>
            {syncedAt && (
              <p className="text-xs text-muted-foreground mt-1">
                Last synced: {new Date(syncedAt).toLocaleString()}
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 size-3.5 ${loading ? "animate-spin" : ""}`} />
            Sync
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Cloud className="size-3.5" /> Total Files
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {loading ? "..." : totalFiles}
              </p>
              <p className="text-xs text-muted-foreground">across {bucketData.length} buckets</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
                <HardDrive className="size-3.5" /> Total Storage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {loading ? "..." : formatBytes(totalSize)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
                <FileUp className="size-3.5" /> Metadata Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {metaLoading ? "..." : metadataFiles.length}
              </p>
              <p className="text-xs text-muted-foreground">local tracking records</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>All Files</CardTitle>
              <CardDescription>
                Live data from S3. Grouped by bucket and folder.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-md border">
                <Button
                  variant={view === "folder" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 rounded-r-none"
                  onClick={() => setView("folder")}
                >
                  <FolderTree className="size-3.5" />
                </Button>
                <Button
                  variant={view === "table" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 rounded-l-none"
                  onClick={() => setView("table")}
                >
                  <Database className="size-3.5" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Syncing files from S3...
                </span>
              </div>
            ) : view === "folder" ? (
              <GlobalFolderView buckets={bucketData} />
            ) : (
              <div className="space-y-6">
                {bucketData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Cloud className="mb-3 size-10" />
                    <p className="text-sm">No files found in any S3 bucket.</p>
                  </div>
                ) : (
                  bucketData.map((bd) => (
                    <div key={bd.bucketId} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Database className="size-4 text-primary" />
                        <h3 className="text-sm font-semibold">{bd.displayName}</h3>
                        <Badge variant="outline" className="text-xs">
                          {bd.totalFiles} files
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatBytes(bd.totalSize)}
                        </span>
                      </div>
                      <S3FilesTable
                        files={bd.files}
                        onDeleteMetadata={handleDeleteMetadata}
                        onDeleteS3={makeDeleteS3Handler(bd)}
                      />
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
