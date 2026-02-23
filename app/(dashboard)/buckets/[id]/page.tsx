// Bucket detail page with tabs: Overview, Analytics, Files, Setup
"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  Database,
  Shield,
  Globe,
  Copy,
  Check,
  BarChart3,
  FileUp,
  Code2,
  Loader2,
  Eye,
  HardDrive,
  FolderTree,
  Cloud,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageTransition } from "@/components/page-transition";
import {
  StorageBarChart,
  StoragePieChart,
  CostBarChart,
  RequestsBarChart,
  FileTypeDistributionChart,
  FileSizeRangeChart,
} from "@/features/infrastructure/components/storage-charts";
import { FilesTable, S3FilesTable } from "@/features/files/components/files-table";
import { FolderStructureView } from "@/features/files/components/folder-structure";
import { SetupTab } from "@/features/buckets/components/setup-tab";
import { ComponentsPreviewTab } from "@/features/buckets/components/components-preview-tab";
import { DeleteBucketDialog } from "@/features/buckets/components/delete-bucket-dialog";
import { UploadDialog } from "@/features/files/components/upload-dialog";
import { useFiles, useDeleteFile, useS3Files } from "@/features/files/hooks/use-files";
import { useAnalytics } from "@/features/infrastructure/hooks/use-analytics";
import type { Bucket } from "@/lib/types";

function formatTotalSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function CopyValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  if (!value) return <span className="text-muted-foreground">—</span>;
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="group flex items-center gap-1.5 font-mono text-xs hover:text-primary"
    >
      {value}
      {copied ? (
        <Check className="size-3 text-green-500" />
      ) : (
        <Copy className="size-3 opacity-0 group-hover:opacity-100" />
      )}
    </button>
  );
}

export default function BucketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [bucket, setBucket] = useState<Bucket | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [filesView, setFilesView] = useState<"table" | "folder">("table");
  const { files, refetch: refetchFiles } = useFiles(undefined, bucket?.s3BucketName);
  const { deleteFile } = useDeleteFile();
  const { bucketAnalytics } = useAnalytics();
  const {
    s3Files,
    totalSize,
    totalFiles,
    systemUploaded,
    loading: s3Loading,
    error: s3Error,
    refetch: refetchS3,
  } = useS3Files(bucket?.s3BucketName, bucket?.region);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/buckets?id=${id}`);
        if (!res.ok) throw new Error();
        setBucket(await res.json());
      } catch {
        toast.error("Bucket not found");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleDeleteFile = async (fileId: string) => {
    const success = await deleteFile(fileId);
    if (success) {
      toast.success("File deleted");
      refetchFiles();
      refetchS3();
    } else {
      toast.error("Failed to delete file");
    }
  };

  const handleUploadComplete = () => {
    refetchFiles();
    refetchS3();
  };

  // Filter analytics for this bucket only
  const thisBucketAnalytics = bucket
    ? bucketAnalytics.filter((ba) => ba.bucketId === bucket.id || ba.bucketName === bucket.s3BucketName)
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!bucket) {
    return (
      <PageTransition>
        <div className="space-y-4">
          <Link href="/buckets" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="size-4" /> Back to Buckets
          </Link>
          <p className="text-muted-foreground">Bucket not found.</p>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <Link
              href="/buckets"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="size-4" /> Back to Buckets
            </Link>
            <div className="flex items-center gap-3 mt-2">
              <Database className="size-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{bucket.name}</h1>
                <p className="font-mono text-sm text-muted-foreground">
                  {bucket.s3BucketName}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={bucket.status === "active" ? "default" : "secondary"}>
              {bucket.status}
            </Badge>
            {bucket.status === "active" && (
              <>
                <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
                  <FileUp className="mr-1.5 size-3.5" /> Upload Files
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                  Full Delete
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Overview cards */}
        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Globe className="size-3.5" /> Region
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{bucket.region}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Shield className="size-3.5" /> Encryption
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold uppercase">
                {bucket.config?.encryption || "s3"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
                <HardDrive className="size-3.5" /> Total Size
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">
                {s3Loading ? "..." : formatTotalSize(totalSize)}
              </p>
              <p className="text-xs text-muted-foreground">{totalFiles} files ({systemUploaded} from system)</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                CloudFront
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CopyValue value={bucket.cloudFrontDomain} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                Config
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1.5">
              {bucket.config?.versioning && <Badge variant="outline">Versioning</Badge>}
              {bucket.config?.backupEnabled && <Badge variant="outline">Backup</Badge>}
              <Badge variant="outline">{bucket.config?.maxFileSizeMB || 100} MB max</Badge>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="files" className="space-y-4">
          <TabsList>
            <TabsTrigger value="files" className="gap-1.5">
              <Cloud className="size-3.5" /> S3 Files ({totalFiles})
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5">
              <BarChart3 className="size-3.5" /> Analytics
            </TabsTrigger>
            <TabsTrigger value="metadata" className="gap-1.5">
              <FileUp className="size-3.5" /> Metadata ({files.length})
            </TabsTrigger>
            <TabsTrigger value="setup" className="gap-1.5">
              <Code2 className="size-3.5" /> Setup
            </TabsTrigger>
            <TabsTrigger value="components" className="gap-1.5">
              <Eye className="size-3.5" /> Components
            </TabsTrigger>
          </TabsList>

          <TabsContent value="files">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle>S3 Bucket Contents</CardTitle>
                  <CardDescription>
                    Actual files in the S3 bucket. Files uploaded from this system are tagged.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-md border">
                    <Button
                      variant={filesView === "table" ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 rounded-r-none"
                      onClick={() => setFilesView("table")}
                    >
                      <Database className="size-3.5" />
                    </Button>
                    <Button
                      variant={filesView === "folder" ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 rounded-l-none"
                      onClick={() => setFilesView("folder")}
                    >
                      <FolderTree className="size-3.5" />
                    </Button>
                  </div>
                  <Button variant="ghost" size="sm" onClick={refetchS3} disabled={s3Loading}>
                    <RefreshCw className={`size-3.5 ${s3Loading ? "animate-spin" : ""}`} />
                  </Button>
                  {bucket.status === "active" && (
                    <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
                      <FileUp className="mr-1.5 size-3.5" /> Upload
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {s3Loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading S3 files...</span>
                  </div>
                ) : s3Error ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-destructive">{s3Error}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Falling back to metadata view. The bucket may not be accessible.
                    </p>
                    <FilesTable files={files} onDelete={handleDeleteFile} />
                  </div>
                ) : filesView === "folder" ? (
                  <FolderStructureView files={s3Files} />
                ) : (
                  <S3FilesTable files={s3Files} onDeleteMetadata={handleDeleteFile} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid gap-4 md:grid-cols-2">
              {/* File type & size distribution from real S3 data */}
              <FileTypeDistributionChart s3Files={s3Files} />
              <FileSizeRangeChart s3Files={s3Files} />
              {/* Existing analytics charts */}
              {thisBucketAnalytics.length > 0 && (
                <>
                  <StorageBarChart bucketAnalytics={thisBucketAnalytics} />
                  <CostBarChart bucketAnalytics={thisBucketAnalytics} />
                  <RequestsBarChart bucketAnalytics={thisBucketAnalytics} />
                  <StoragePieChart bucketAnalytics={thisBucketAnalytics} />
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="metadata">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle>File Metadata Records</CardTitle>
                  <CardDescription>
                    Local metadata records for files uploaded through the system. Shows linking status.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <FilesTable files={files} onDelete={handleDeleteFile} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="setup">
            <SetupTab bucket={bucket} />
          </TabsContent>

          <TabsContent value="components">
            <ComponentsPreviewTab bucket={bucket} />
          </TabsContent>
        </Tabs>

        {/* Upload dialog */}
        <UploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          bucket={bucket}
          projectId={bucket.projectId}
          onUploadComplete={handleUploadComplete}
        />

        {/* Delete dialog */}
        <DeleteBucketDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          bucket={bucket}
          fileCount={files.length}
          onComplete={() => {
            setDeleteOpen(false);
            toast.success("Bucket fully deleted");
            window.location.href = "/buckets";
          }}
        />
      </div>
    </PageTransition>
  );
}
