'use client';

import { use, useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Database,
  Copy,
  Check,
  BarChart3,
  FileUp,
  Code2,
  Loader2,
  FolderTree,
  Cloud,
  RefreshCw,
  DollarSign,
  FolderPlus,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  Lock,
  Trash2,
} from 'lucide-react';
import { CircleFlag } from 'react-circle-flags';
import { Sparklines, SparklinesLine } from 'react-sparklines';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Alert, AlertDescription, AlertTitle, AlertAction } from '@/components/ui/alert';
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
import { FileTypeRod } from '@/features/buckets/components/bucket-card';
import { getRegionAlpha2, getRegionCountry } from '@/lib/region-flags';
import type { Bucket } from '@/lib/types';

function formatTotalSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

const FILE_TYPE_COLORS: Record<string, string> = {
  image: 'var(--chart-1)',
  video: 'var(--chart-2)',
  audio: 'var(--chart-3)',
  document: 'var(--chart-4)',
  archive: 'var(--chart-5)',
  code: '#8b5cf6',
  other: '#94a3b8',
};

function buildFileTypeBreakdown(
  files: { key: string }[],
): { type: string; count: number; color: string }[] {
  const counts: Record<string, number> = {};
  for (const f of files) {
    const ext = f.key.split('.').pop()?.toLowerCase() ?? '';
    let type = 'other';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif'].includes(ext)) type = 'image';
    else if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext)) type = 'video';
    else if (['mp3', 'wav', 'ogg', 'flac'].includes(ext)) type = 'audio';
    else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'md'].includes(ext)) type = 'document';
    else if (['zip', 'tar', 'gz', 'rar', '7z'].includes(ext)) type = 'archive';
    else if (['js', 'ts', 'jsx', 'tsx', 'json', 'css', 'html', 'py', 'go', 'rb'].includes(ext))
      type = 'code';
    counts[type] = (counts[type] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([type, count]) => ({ type, count, color: FILE_TYPE_COLORS[type] ?? '#94a3b8' }))
    .sort((a, b) => b.count - a.count);
}

function buildActivitySparkline(
  files: { lastModified: string; size?: number }[],
  days = 14,
): number[] {
  const now = Date.now();
  const data = new Array(days).fill(0);
  for (const f of files) {
    const age = (now - new Date(f.lastModified).getTime()) / (1000 * 60 * 60 * 24);
    const idx = days - 1 - Math.floor(age);
    if (idx >= 0 && idx < days) {
      const sizeKB = (f.size ?? 0) / 1024;
      const weight = sizeKB > 0 ? Math.min(Math.sqrt(sizeKB), 8) : 1;
      data[idx] += weight;
    }
  }
  return data;
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

  // ── Derived data for one-liner ──────────────────────────────────────────────
  const fileTypeBreakdown = useMemo(() => buildFileTypeBreakdown(s3Files), [s3Files]);
  const activityData = useMemo(() => buildActivitySparkline(s3Files), [s3Files]);
  const hasActivity = useMemo(() => activityData.some((v) => v > 0), [activityData]);

  // Cost for this bucket
  const thisBucketExpense = useMemo(
    () => (bucket ? bucketExpenses.find((e) => e.bucketId === bucket.id) : undefined),
    [bucket, bucketExpenses],
  );
  const estCostPerMonth = thisBucketExpense
    ? Object.values(thisBucketExpense.costBreakdown).reduce((s, v) => s + v, 0)
    : 0;

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
      <div className="space-y-5">
        {/* ── One-liner header ── */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-3 rounded-xl border border-border/50 bg-card/60 px-4 py-3"
        >
          {/* Back + bucket identity */}
          <Link
            href="/buckets"
            className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors shrink-0"
          >
            <ArrowLeft className="size-3.5" />
          </Link>

          <div className="flex items-center gap-2 min-w-0">
            <Database className="size-3.5 text-primary shrink-0" />
            <div className="min-w-0">
              <span className="text-xs font-semibold truncate">{bucket.name}</span>
              <span className="ml-1.5 font-mono text-[10px] text-muted-foreground truncate hidden sm:inline">
                {bucket.s3BucketName}
              </span>
            </div>
          </div>

          {/* Status */}
          <Badge
            variant={bucket.status === 'active' ? 'success' : 'secondary'}
            className="text-[10px] px-1.5 py-0 h-4 shrink-0"
          >
            <span
              className={`mr-1 size-1.5 rounded-full inline-block ${
                bucket.status === 'active'
                  ? 'bg-emerald-400'
                  : bucket.status === 'deploying'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-muted-foreground/60'
              }`}
            />
            {bucket.status}
          </Badge>

          <div className="h-5 w-px bg-border/50 hidden sm:block shrink-0" />

          {/* Region flag with hover */}
          {bucket.region && (
            <HoverCard openDelay={300} closeDelay={100}>
              <HoverCardTrigger asChild>
                <motion.div
                  whileHover={{ y: -3 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  className="cursor-default shrink-0"
                >
                  <CircleFlag
                    countryCode={getRegionAlpha2(bucket.region)}
                    height={20}
                    width={20}
                    className="rounded-full ring-1 ring-border"
                  />
                </motion.div>
              </HoverCardTrigger>
              <HoverCardContent side="bottom" align="start" className="w-52 p-3">
                <div className="flex items-center gap-2.5 mb-2">
                  <CircleFlag countryCode={getRegionAlpha2(bucket.region)} height={28} width={28} />
                  <div>
                    <p className="text-xs font-semibold">{getRegionCountry(bucket.region)}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{bucket.region}</p>
                  </div>
                </div>
                {bucket.cloudFrontDomain && (
                  <div className="border-t pt-2 mt-1">
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">
                      CloudFront
                    </p>
                    <CopyValue value={bucket.cloudFrontDomain} />
                  </div>
                )}
              </HoverCardContent>
            </HoverCard>
          )}

          <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
            <span className="font-semibold text-foreground text-xs tabular-nums">
              {s3Loading ? '…' : formatTotalSize(totalSize)}
            </span>
            <span>·</span>
            <span className="tabular-nums">{totalFiles} files</span>
          </div>

          <div className="h-5 w-px bg-border/50 hidden sm:block shrink-0" />

          {/* Encryption */}
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
            <Lock className="size-2.5" />
            <span className="uppercase font-medium">{bucket.config?.encryption || 's3'}</span>
          </div>

          {/* Compatibility dot */}
          {compatibility.checked && (
            <HoverCard openDelay={300} closeDelay={100}>
              <HoverCardTrigger asChild>
                <div className="flex items-center gap-1 cursor-default shrink-0">
                  {compatibility.compatible ? (
                    <CheckCircle2 className="size-3 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="size-3 text-amber-500" />
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {compatibility.compatible ? 'Compatible' : 'CORS issue'}
                  </span>
                </div>
              </HoverCardTrigger>
              <HoverCardContent side="bottom" className="w-56 p-3">
                {compatibility.compatible ? (
                  <p className="text-xs text-emerald-600">Browser uploads are enabled</p>
                ) : (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-amber-600">Not browser-compatible</p>
                    {compatibility.issues.map((issue, i) => (
                      <p key={i} className="text-[10px] text-muted-foreground">
                        • {issue}
                      </p>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 mt-1 text-[10px] w-full"
                      onClick={handleMakeCompatible}
                      disabled={compatibility.fixing}
                    >
                      {compatibility.fixing ? (
                        <Loader2 className="size-2.5 animate-spin mr-1" />
                      ) : (
                        <Wrench className="size-2.5 mr-1" />
                      )}
                      Fix CORS
                    </Button>
                  </div>
                )}
              </HoverCardContent>
            </HoverCard>
          )}

          <div className="h-5 w-px bg-border/50 hidden sm:block shrink-0" />

          {/* File type rod */}
          {fileTypeBreakdown.length > 0 && (
            <div className="w-24 shrink-0 space-y-0.5">
              <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                Types
              </p>
              <FileTypeRod breakdown={fileTypeBreakdown} />
            </div>
          )}

          {/* Activity sparkline */}
          <div className="shrink-0 space-y-0.5">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Activity
            </p>
            <div style={{ width: 72, height: 20 }} className="opacity-80">
              <Sparklines
                data={hasActivity ? activityData : new Array(14).fill(0)}
                height={20}
                min={0}
              >
                <SparklinesLine
                  color="#22c55e"
                  style={{ fill: '#22c55e', fillOpacity: 0.18, strokeWidth: 1.5 }}
                />
              </Sparklines>
            </div>
          </div>

          {/* Est cost */}
          {estCostPerMonth > 0 && (
            <>
              <div className="h-5 w-px bg-border/50 hidden sm:block shrink-0" />
              <div className="shrink-0">
                <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                  Est/mo
                </p>
                <p className="text-xs font-semibold tabular-nums text-foreground">
                  $
                  {estCostPerMonth < 0.01 ? estCostPerMonth.toFixed(4) : estCostPerMonth.toFixed(2)}
                </p>
              </div>
            </>
          )}

          <div className="flex-1" />

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setSyncOpen(true)}
            >
              <RefreshCw className="size-3 mr-1" />
              Status
            </Button>
            {bucket.status === 'active' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setCreateFolderOpen(true)}
                >
                  <FolderPlus className="size-3 mr-1" />
                  Folder
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setUploadOpen(true)}
                  disabled={!compatibility.compatible && compatibility.checked}
                  title={
                    !compatibility.compatible && compatibility.checked
                      ? 'Fix CORS first'
                      : undefined
                  }
                >
                  <FileUp className="size-3 mr-1" />
                  Upload
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="size-3" />
                </Button>
              </>
            )}
          </div>
        </motion.div>

        {/* Compatibility alert — only when broken and not yet acknowledged */}
        {compatibility.checked && !compatibility.compatible && bucket.status === 'active' && (
          <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle>Bucket not fully compatible with browser uploads</AlertTitle>
            <AlertDescription>
              <ul className="mt-1 space-y-0.5">
                {compatibility.issues.map((issue, i) => (
                  <li key={i} className="text-xs">
                    • {issue}
                  </li>
                ))}
              </ul>
            </AlertDescription>
            <AlertAction>
              <Button
                size="sm"
                variant="outline"
                className="border-amber-400/60 hover:bg-amber-100 dark:hover:bg-amber-900"
                onClick={handleMakeCompatible}
                disabled={compatibility.fixing}
              >
                {compatibility.fixing ? (
                  <Loader2 className="size-3 animate-spin mr-1.5" />
                ) : (
                  <Wrench className="size-3 mr-1.5" />
                )}
                Make Compatible
              </Button>
              <div className="text-[11px] text-amber-700/70 dark:text-amber-400/70 ml-1">
                ⚠ Review before applying to production buckets
              </div>
            </AlertAction>
          </Alert>
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
                    {/* <p className="text-xs text-muted-foreground mt-1">
                      Falling back to metadata view. The bucket may not be accessible.
                    </p>
                    <FilesTable files={files} onDelete={handleDeleteFile} /> */}
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
