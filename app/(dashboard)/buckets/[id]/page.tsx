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
  Settings2,
  Loader2,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageTransition } from "@/components/page-transition";
import {
  StorageBarChart,
  StoragePieChart,
  CostBarChart,
  RequestsBarChart,
} from "@/features/infrastructure/components/storage-charts";
import { FilesTable } from "@/features/files/components/files-table";
import { SetupTab } from "@/features/buckets/components/setup-tab";
import { ComponentsPreviewTab } from "@/features/buckets/components/components-preview-tab";
import { DeleteBucketDialog } from "@/features/buckets/components/delete-bucket-dialog";
import { UploadDialog } from "@/features/files/components/upload-dialog";
import { useFiles, useDeleteFile } from "@/features/files/hooks/use-files";
import { useAnalytics } from "@/features/infrastructure/hooks/use-analytics";
import type { Bucket } from "@/lib/types";

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
  const { files, refetch: refetchFiles } = useFiles(undefined, bucket?.s3BucketName);
  const { deleteFile } = useDeleteFile();
  const { bucketAnalytics } = useAnalytics();

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
    } else {
      toast.error("Failed to delete file");
    }
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
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
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
        <Tabs defaultValue="analytics" className="space-y-4">
          <TabsList>
            <TabsTrigger value="analytics" className="gap-1.5">
              <BarChart3 className="size-3.5" /> Analytics
            </TabsTrigger>
            <TabsTrigger value="files" className="gap-1.5">
              <FileUp className="size-3.5" /> Files ({files.length})
            </TabsTrigger>
            <TabsTrigger value="setup" className="gap-1.5">
              <Code2 className="size-3.5" /> Setup
            </TabsTrigger>
            <TabsTrigger value="components" className="gap-1.5">
              <Eye className="size-3.5" /> Components
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics">
            {thisBucketAnalytics.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <StorageBarChart bucketAnalytics={thisBucketAnalytics} />
                <CostBarChart bucketAnalytics={thisBucketAnalytics} />
                <RequestsBarChart bucketAnalytics={thisBucketAnalytics} />
                <StoragePieChart bucketAnalytics={thisBucketAnalytics} />
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No analytics data yet. Upload some files to see charts.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="files">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Files in this Bucket</CardTitle>
                {bucket.status === "active" && (
                  <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
                    <FileUp className="mr-1.5 size-3.5" /> Upload
                  </Button>
                )}
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
          onUploadComplete={() => refetchFiles()}
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
