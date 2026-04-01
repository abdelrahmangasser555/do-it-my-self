'use client';

import { use, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
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
  HardDrive,
  FolderTree,
  Cloud,
  RefreshCw,
  DollarSign,
  FolderPlus,
  AlertTriangle,
  CheckCircle2,
  Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageTransition } from '@/components/page-transition';
import {
  StorageBarChart,
  StoragePieChart,
  CostBarChart,
  RequestsBarChart,
  FileTypeDistributionChart,
  FileSizeRangeChart,
} from '@/features/infrastructure/components/storage-charts';
import { FilesTable, S3FilesTable } from '@/features/files/components/files-table';
import { FolderStructureView } from '@/features/files/components/folder-structure';
import { SetupTab } from '@/features/buckets/components/setup-tab';
import { DeleteBucketDialog } from '@/features/buckets/components/delete-bucket-dialog';
import { UploadDialog } from '@/features/files/components/upload-dialog';
import { CreateFolderDialog } from '@/features/files/components/create-folder-dialog';
import { MoveFileDialog } from '@/features/files/components/move-file-dialog';
import { useFiles, useDeleteFile, useS3Files } from '@/features/files/hooks/use-files';
import { useAnalytics } from '@/features/infrastructure/hooks/use-analytics';
import { useExpenses } from '@/features/infrastructure/hooks/use-expenses';
import { CostBreakdownTable } from '@/features/infrastructure/components/cost-tables';
import { SyncStatusDialog } from '@/features/infrastructure/components/sync-status-dialog';
import type { Bucket } from '@/lib/types';

function formatTotalSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
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

export default function BucketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') ?? 'files';

  const [bucket, setBucket] = useState<Bucket | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [moveFileKey, setMoveFileKey] = useState<string | null>(null);
  const [filesView, setFilesView] = useState<'table' | 'folder'>('table');
  const [compatibility, setCompatibility] = useState<{
    compatible: boolean;
    issues: string[];
    corsOk: boolean;
    iamOk: boolean;
    checked: boolean;
    fixing: boolean;
  }>({ compatible: true, issues: [], corsOk: true, iamOk: true, checked: false, fixing: false });
  const { files, refetch: refetchFiles } = useFiles(undefined, bucket?.s3BucketName);
  const { deleteFile, deleteMetadataOnly } = useDeleteFile();
  const { bucketAnalytics } = useAnalytics();
  const { buckets: bucketExpenses, loading: expensesLoading } = useExpenses(undefined, bucket?.id);
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
        const data: Bucket = await res.json();
        setBucket(data);
        // Run compatibility check for active buckets
        if (data.status === 'active') {
          const params = new URLSearchParams({ bucketName: data.s3BucketName });
          if (data.region) params.set('region', data.region);
          const compat = await fetch(`/api/buckets/compatibility?${params.toString()}`);
          if (compat.ok) {
            const c = await compat.json();
            setCompatibility((prev) => ({ ...prev, ...c, checked: true }));
          }
        }
      } catch {
        toast.error('Bucket not found');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleMakeCompatible = async () => {
    if (!bucket) return;
    setCompatibility((prev) => ({ ...prev, fixing: true }));
    try {
      const res = await fetch('/api/buckets/compatibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucketName: bucket.s3BucketName, region: bucket.region }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(`Failed to apply CORS: ${err.error}`);
        return;
      }
      toast.success('CORS policy applied — bucket is now compatible');
      // Re-check
      const params = new URLSearchParams({ bucketName: bucket.s3BucketName });
      if (bucket.region) params.set('region', bucket.region);
      const compat = await fetch(`/api/buckets/compatibility?${params.toString()}`);
      if (compat.ok) {
        const c = await compat.json();
        setCompatibility((prev) => ({ ...prev, ...c, checked: true, fixing: false }));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unknown error');
      setCompatibility((prev) => ({ ...prev, fixing: false }));
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    const success = await deleteFile(fileId);
    if (success) {
      toast.success('File deleted');
      refetchFiles();
      refetchS3();
    } else {
      toast.error('Failed to delete file');
    }
  };

  /** Soft-delete: removes only the local tracking record; file stays in S3 */
  const handleRemoveTracking = async (metadataId: string) => {
    const success = await deleteMetadataOnly(metadataId);
    if (success) {
      toast.success('Tracking record removed — file remains in S3');
      refetchFiles();
      refetchS3();
    } else {
      toast.error('Failed to remove tracking record');
    }
  };

  /** Hard-delete: permanently removes the file from S3 and clears any tracking record */
  const handleDeleteS3 = async (key: string) => {
    if (!bucket) return;
    try {
      const res = await fetch('/api/files/s3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          bucketName: bucket.s3BucketName,
          region: bucket.region,
          key,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete file from S3');
      }
      toast.success('File permanently deleted from S3');
      refetchFiles();
      refetchS3();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete file from S3');
    }
  };

  const handleUploadComplete = () => {
    refetchFiles();
    refetchS3();
  };

  // Extract existing folders from S3 file keys
  const existingFolders = [
    ...new Set(
      s3Files
        .map((f) => {
          const parts = f.key.split('/');
          return parts.length > 1 ? parts.slice(0, -1).join('/') : '';
        })
        .filter(Boolean),
    ),
  ];

  // Filter analytics for this bucket only
  const thisBucketAnalytics = bucket
    ? bucketAnalytics.filter(
        (ba) => ba.bucketId === bucket.id || ba.bucketName === bucket.s3BucketName,
      )
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
          <Link
            href="/buckets"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
          >
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
                <p className="font-mono text-sm text-muted-foreground">{bucket.s3BucketName}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={bucket.status === 'active' ? 'default' : 'secondary'}>
              {bucket.status}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => setSyncOpen(true)}>
              <RefreshCw className="mr-1.5 size-3.5" /> Check Status
            </Button>
            {bucket.status === 'active' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUploadOpen(true)}
                  disabled={!compatibility.compatible && compatibility.checked}
                  title={
                    !compatibility.compatible && compatibility.checked
                      ? 'Bucket not compatible — fix CORS first'
                      : undefined
                  }
                >
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
              <p className="text-lg font-semibold uppercase">{bucket.config?.encryption || 's3'}</p>
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
                {s3Loading ? '...' : formatTotalSize(totalSize)}
              </p>
              <p className="text-xs text-muted-foreground">
                {totalFiles} files ({systemUploaded} from system)
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">CloudFront</CardTitle>
            </CardHeader>
            <CardContent>
              <CopyValue value={bucket.cloudFrontDomain} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Config</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1.5">
              {bucket.config?.versioning && <Badge variant="outline">Versioning</Badge>}
              {bucket.config?.backupEnabled && <Badge variant="outline">Backup</Badge>}
              <Badge variant="outline">{bucket.config?.maxFileSizeMB || 100} MB max</Badge>
            </CardContent>
          </Card>
        </motion.div>

        {/* Compatibility alert */}
        {compatibility.checked && !compatibility.compatible && bucket.status === 'active' && (
          <Alert
            variant="destructive"
            className="border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200"
          >
            <AlertTriangle className="size-4" />
            <AlertTitle className="flex items-center justify-between">
              <span>Bucket not fully compatible with browser uploads</span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 border-amber-500/40 hover:bg-amber-500/20"
                onClick={handleMakeCompatible}
                disabled={compatibility.fixing}
              >
                {compatibility.fixing ? (
                  <Loader2 className="size-3 animate-spin mr-1" />
                ) : (
                  <Wrench className="size-3 mr-1" />
                )}
                Make Compatible
              </Button>
            </AlertTitle>
            <AlertDescription className="mt-1 space-y-1">
              {compatibility.issues.map((issue, i) => (
                <p key={i} className="text-xs">
                  • {issue}
                </p>
              ))}
              <p className="text-xs opacity-70 mt-2">
                ⚠ If this bucket is used in production, review changes carefully before applying.
              </p>
            </AlertDescription>
          </Alert>
        )}
        {compatibility.checked && compatibility.compatible && bucket.status === 'active' && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" />
            Bucket is compatible with browser uploads
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue={defaultTab} className="space-y-4">
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
            <TabsTrigger value="expenses" className="gap-1.5">
              <DollarSign className="size-3.5" /> Expenses
            </TabsTrigger>
          </TabsList>

          <TabsContent value="files">
            <Card className="relative">
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
                      variant={filesView === 'table' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 rounded-r-none"
                      onClick={() => setFilesView('table')}
                    >
                      <Database className="size-3.5" />
                    </Button>
                    <Button
                      variant={filesView === 'folder' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 rounded-l-none"
                      onClick={() => setFilesView('folder')}
                    >
                      <FolderTree className="size-3.5" />
                    </Button>
                  </div>
                  <Button variant="ghost" size="sm" onClick={refetchS3} disabled={s3Loading}>
                    <RefreshCw className={`size-3.5 ${s3Loading ? 'animate-spin' : ''}`} />
                  </Button>
                  {bucket.status === 'active' && (
                    <div className="flex items-center gap-1.5 absolute right-4 top-5">
                      <Button variant="outline" size="sm" onClick={() => setCreateFolderOpen(true)}>
                        <FolderPlus className="mr-1.5 size-3.5" /> New Folder
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setUploadOpen(true)}
                        disabled={!compatibility.compatible && compatibility.checked}
                        title={
                          !compatibility.compatible && compatibility.checked
                            ? 'Fix CORS first'
                            : undefined
                        }
                      >
                        <FileUp className="mr-1.5 size-3.5" /> Upload
                      </Button>
                    </div>
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
                ) : filesView === 'folder' ? (
                  <FolderStructureView files={s3Files} />
                ) : (
                  <S3FilesTable
                    files={s3Files}
                    onDeleteMetadata={handleRemoveTracking}
                    onDeleteS3={handleDeleteS3}
                    onMove={(key) => setMoveFileKey(key)}
                  />
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
                    Local metadata records for files uploaded through the system. Shows linking
                    status.
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

          <TabsContent value="expenses">
            <div className="space-y-4">
              {expensesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading cost data...</span>
                </div>
              ) : bucketExpenses.length > 0 ? (
                <CostBreakdownTable
                  breakdown={bucketExpenses[0].costBreakdown}
                  title={`Cost Breakdown — ${bucket.name}`}
                />
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No cost data available for this bucket.
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Upload dialog */}
        <UploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          bucket={bucket}
          projectId={bucket.projectId}
          onUploadComplete={handleUploadComplete}
          existingFolders={existingFolders}
        />

        {/* Create folder dialog */}
        <CreateFolderDialog
          open={createFolderOpen}
          onOpenChange={setCreateFolderOpen}
          bucketName={bucket.s3BucketName}
          region={bucket.region}
          existingFolders={existingFolders}
          onCreated={() => {
            refetchS3();
            setCreateFolderOpen(false);
          }}
        />

        {/* Move file dialog */}
        <MoveFileDialog
          open={!!moveFileKey}
          onOpenChange={(open) => {
            if (!open) setMoveFileKey(null);
          }}
          bucketName={bucket.s3BucketName}
          region={bucket.region}
          sourceKey={moveFileKey ?? ''}
          existingFolders={existingFolders}
          onMoved={() => {
            refetchS3();
            refetchFiles();
            setMoveFileKey(null);
          }}
        />

        {/* Delete dialog */}
        <DeleteBucketDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          bucket={bucket}
          fileCount={files.length}
          onComplete={() => {
            setDeleteOpen(false);
            toast.success('Bucket fully deleted');
            window.location.href = '/buckets';
          }}
        />

        {/* Sync dialog */}
        <SyncStatusDialog
          open={syncOpen}
          onOpenChange={setSyncOpen}
          bucketId={bucket.id}
          onSynced={() => {
            // Reload bucket data
            window.location.reload();
          }}
        />
      </div>
    </PageTransition>
  );
}
