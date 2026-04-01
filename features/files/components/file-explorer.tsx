// Main file explorer — bucket selector, breadcrumb, search, grid, drag-drop upload
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  RefreshCw,
  Search,
  ChevronRight,
  HardDrive,
  Database,
  Upload,
  Loader2,
  Home,
  FolderUp,
  Cloud,
  FileUp,
  Filter,
  CalendarIcon,
  X,
} from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { DateRange } from 'react-day-picker';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ExplorerGrid } from './explorer-grid';
import { FileIcon } from './file-icons';
import type { MergedS3File } from '@/features/files/hooks/use-files';
import type { Bucket } from '@/lib/types';

// ── Types ───────────────────────────────────────────────────────────────────

interface BucketS3Data {
  bucketId: string;
  bucketName: string;
  region?: string;
  displayName: string;
  files: MergedS3File[];
  totalSize: number;
  totalFiles: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}

function getFileTypeLabel(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'].includes(ext))
    return 'Images';
  if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext)) return 'Videos';
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) return 'Audio';
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'].includes(ext))
    return 'Documents';
  if (['js', 'ts', 'tsx', 'jsx', 'json', 'html', 'css', 'md', 'xml', 'yml', 'yaml'].includes(ext))
    return 'Code';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'Archives';
  return 'Other';
}

function mergeDateAndTime(
  date: Date | undefined,
  time: string,
  endOfRange = false,
): Date | undefined {
  if (!date) return undefined;
  const [hours, minutes] = time.split(':').map((value) => Number.parseInt(value, 10));
  const nextDate = new Date(date);
  nextDate.setHours(
    Number.isNaN(hours) ? 0 : hours,
    Number.isNaN(minutes) ? 0 : minutes,
    endOfRange ? 59 : 0,
    endOfRange ? 999 : 0,
  );
  return nextDate;
}

// ── Main Component ──────────────────────────────────────────────────────────

export function FileExplorer() {
  // ── State ──────────────────────────────────────────────────────────────
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [selectedBucketId, setSelectedBucketId] = useState<string>('');
  const [bucketData, setBucketData] = useState<BucketS3Data[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [modifiedFromTime, setModifiedFromTime] = useState('00:00');
  const [modifiedToTime, setModifiedToTime] = useState('23:59');
  const [selectedFileTypes, setSelectedFileTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    key: string;
    bucketName: string;
    region?: string;
  } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const dragCounterRef = useRef(0);

  const selectedBucket = buckets.find((b) => b.id === selectedBucketId);
  const selectedData = bucketData.find((bd) => bd.bucketId === selectedBucketId);
  const availableFileTypes = useMemo(() => {
    const fileTypes = new Set<string>();
    for (const bucket of bucketData) {
      for (const file of bucket.files) {
        if (!file.key.endsWith('/')) fileTypes.add(getFileTypeLabel(file.key));
      }
    }
    return Array.from(fileTypes).sort();
  }, [bucketData]);

  // ── Fetch ──────────────────────────────────────────────────────────────

  const fetchBuckets = useCallback(async () => {
    try {
      const res = await fetch('/api/buckets');
      if (!res.ok) throw new Error('Failed to load buckets');
      const data: Bucket[] = await res.json();
      setBuckets(data);
      // Auto-select first active bucket
      const first = data.find((b) => b.status === 'active');
      if (first && !selectedBucketId) setSelectedBucketId(first.id);
    } catch {
      toast.error('Failed to load buckets');
    }
  }, [selectedBucketId]);

  const fetchS3Data = useCallback(async () => {
    try {
      setLoading(true);
      const activeBuckets = buckets.filter((b) => b.status === 'active');
      const results = await Promise.allSettled(
        activeBuckets.map(async (bucket) => {
          const params = new URLSearchParams({ bucketName: bucket.s3BucketName });
          if (bucket.region) params.set('region', bucket.region);
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
        }),
      );
      setBucketData(results.flatMap((r) => (r.status === 'fulfilled' && r.value ? [r.value] : [])));
      setSyncedAt(new Date().toISOString());
    } catch {
      toast.error('Failed to sync S3');
    } finally {
      setLoading(false);
    }
  }, [buckets]);

  useEffect(() => {
    fetchBuckets();
  }, [fetchBuckets]);
  useEffect(() => {
    if (buckets.length > 0) fetchS3Data();
  }, [buckets.length, fetchS3Data]);

  const handleSync = () => {
    fetchS3Data();
    toast.info('Syncing files from AWS...');
  };

  // ── Search across all buckets ──────────────────────────────────────────

  const matchesFilters = useCallback(
    (file: MergedS3File) => {
      if (file.key.endsWith('/')) return false;

      if (selectedFileTypes.length > 0 && !selectedFileTypes.includes(getFileTypeLabel(file.key))) {
        return false;
      }

      const lastModified = new Date(file.lastModified);
      const fromDateTime = mergeDateAndTime(dateRange?.from, modifiedFromTime);
      const toDateTime = mergeDateAndTime(dateRange?.to, modifiedToTime, true);

      if (fromDateTime && lastModified < fromDateTime) return false;
      if (toDateTime && lastModified > toDateTime) return false;

      return true;
    },
    [dateRange, modifiedFromTime, modifiedToTime, selectedFileTypes],
  );

  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    const results: (MergedS3File & { _bucket: string; _bucketName: string; _region?: string })[] =
      [];
    for (const bd of bucketData) {
      for (const f of bd.files) {
        if (f.key.toLowerCase().includes(q) && matchesFilters(f)) {
          results.push({
            ...f,
            _bucket: bd.displayName,
            _bucketName: bd.bucketName,
            _region: bd.region,
          });
        }
      }
    }
    return results;
  }, [search, bucketData, matchesFilters]);

  const filteredSelectedFiles = useMemo(() => {
    return (selectedData?.files ?? []).filter(matchesFilters);
  }, [matchesFilters, selectedData?.files]);

  const visibleResultCount = search ? (searchResults?.length ?? 0) : filteredSelectedFiles.length;

  // ── Breadcrumb ─────────────────────────────────────────────────────────

  const breadcrumbs = useMemo(() => {
    const parts = currentPath.replace(/\/$/, '').split('/').filter(Boolean);
    const crumbs = [{ label: selectedBucket?.name ?? 'Root', path: '' }];
    for (let i = 0; i < parts.length; i++) {
      crumbs.push({ label: parts[i], path: parts.slice(0, i + 1).join('/') + '/' });
    }
    return crumbs;
  }, [currentPath, selectedBucket]);

  // ── S3 Actions ─────────────────────────────────────────────────────────

  const handleCreateFolder = async (folderPath: string) => {
    if (!selectedBucket) return;
    try {
      const res = await fetch('/api/files/s3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-folder',
          bucketName: selectedBucket.s3BucketName,
          region: selectedBucket.region,
          folderPath,
        }),
      });
      if (!res.ok) throw new Error('Failed to create folder');
      toast.success(`Folder created: ${folderPath}`);
      fetchS3Data();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create folder');
    }
  };

  const handleMoveFile = async (sourceKey: string, destKey: string) => {
    if (!selectedBucket) return;
    try {
      const res = await fetch('/api/files/s3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'move',
          bucketName: selectedBucket.s3BucketName,
          region: selectedBucket.region,
          sourceKey,
          destinationKey: destKey,
        }),
      });
      if (!res.ok) throw new Error('Failed to move file');
      toast.success(`Moved to ${destKey}`);
      fetchS3Data();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to move file');
    }
  };

  const confirmDelete = (key: string) => {
    if (!selectedBucket) return;
    setDeleteTarget({
      key,
      bucketName: selectedBucket.s3BucketName,
      region: selectedBucket.region,
    });
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch('/api/files/s3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          bucketName: deleteTarget.bucketName,
          region: deleteTarget.region,
          key: deleteTarget.key,
        }),
      });
      if (!res.ok) throw new Error('Delete failed');
      toast.success('Deleted from S3');
      fetchS3Data();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
    setDeleteTarget(null);
  };

  const handleDownload = async (file: MergedS3File) => {
    if (!selectedBucket) return;
    try {
      const params = new URLSearchParams({
        bucketName: selectedBucket.s3BucketName,
        objectKey: file.key,
      });
      if (selectedBucket.region) params.set('region', selectedBucket.region);
      const res = await fetch(`/api/files/download?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to get download URL');
      const { url } = await res.json();
      window.open(url, '_blank');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Download failed');
    }
  };

  // ── Upload via file picker or drag-drop ────────────────────────────────

  const uploadFiles = useCallback(
    async (fileList: File[], prefix: string) => {
      if (!selectedBucket) return;
      const project = selectedBucket.projectId;

      setIsUploading(true);
      let uploaded = 0;
      let failed = 0;

      for (const file of fileList) {
        try {
          const res = await fetch('/api/files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: file.name,
              fileSize: file.size,
              mimeType: file.type || 'application/octet-stream',
              projectId: project,
              bucketName: selectedBucket.s3BucketName,
              folderPrefix: prefix.replace(/^\/+|\/+$/g, ''),
            }),
          });
          if (!res.ok) {
            failed++;
            continue;
          }
          const { uploadUrl } = await res.json();
          const uploadRes = await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type || 'application/octet-stream' },
          });
          if (uploadRes.ok) uploaded++;
          else failed++;
        } catch {
          failed++;
        }
      }
      setIsUploading(false);
      if (uploaded > 0) {
        toast.success(`Uploaded ${uploaded} file${uploaded !== 1 ? 's' : ''}`);
        fetchS3Data();
      }
      if (failed > 0) toast.error(`${failed} upload${failed !== 1 ? 's' : ''} failed`);
    },
    [selectedBucket, fetchS3Data],
  );

  const triggerFileUpload = (prefix: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = () => {
      const files = Array.from(input.files ?? []);
      if (files.length > 0) uploadFiles(files, prefix);
    };
    input.click();
  };

  // ── Drag-drop on the explorer area ─────────────────────────────────────

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current++;
      if (selectedBucket?.status === 'active') setIsDragOver(true);
    },
    [selectedBucket],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragOver(false);
      const dropped = Array.from(e.dataTransfer.files);
      if (dropped.length > 0) uploadFiles(dropped, currentPath);
    },
    [currentPath, uploadFiles],
  );

  // ── Totals ─────────────────────────────────────────────────────────────

  const totalFiles = bucketData.reduce((s, b) => s + b.totalFiles, 0);
  const totalSize = bucketData.reduce((s, b) => s + b.totalSize, 0);
  const activeBuckets = buckets.filter((b) => b.status === 'active');
  const hasFilters = !!(dateRange?.from || dateRange?.to) || selectedFileTypes.length > 0;

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Bucket selector */}
          <Select
            value={selectedBucketId}
            onValueChange={(v) => {
              setSelectedBucketId(v);
              setCurrentPath('');
              setSearch('');
            }}
          >
            <SelectTrigger className="w-52 h-9">
              <SelectValue placeholder="Select a bucket" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Buckets</SelectLabel>
                {activeBuckets.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          {/* Summary badges */}
          <Badge variant="outline" className="text-xs gap-1">
            <Cloud className="size-3" /> {activeBuckets.length} buckets
          </Badge>
          <Badge variant="outline" className="text-xs gap-1">
            <HardDrive className="size-3" /> {formatBytes(totalSize)}
          </Badge>
          <Badge variant="outline" className="text-xs gap-1">
            {totalFiles} files
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <InputGroup className="w-80">
            <InputGroupInput
              placeholder="Search files across all buckets..."
              className="h-9 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupAddon align="inline-end">{visibleResultCount} results</InputGroupAddon>
          </InputGroup>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2">
                <CalendarIcon className="size-3.5" />
                Modified Range
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="end">
              <div className="flex flex-col gap-3">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={1}
                  className="rounded-md"
                />
                <div className="grid grid-cols-2 gap-2 border-t pt-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] text-muted-foreground font-medium">From time</span>
                    <Input
                      type="time"
                      value={modifiedFromTime}
                      onChange={(e) => setModifiedFromTime(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] text-muted-foreground font-medium">To time</span>
                    <Input
                      type="time"
                      value={modifiedToTime}
                      onChange={(e) => setModifiedToTime(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                {(dateRange?.from || dateRange?.to) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 justify-start text-xs"
                    onClick={() => {
                      setDateRange(undefined);
                      setModifiedFromTime('00:00');
                      setModifiedToTime('23:59');
                    }}
                  >
                    <X className="size-3.5 mr-1" /> Clear range
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2">
                <Filter className="size-3.5" />
                File Types{selectedFileTypes.length > 0 ? ` (${selectedFileTypes.length})` : ''}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Filter By Type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {availableFileTypes.map((fileType) => (
                  <DropdownMenuCheckboxItem
                    key={fileType}
                    checked={selectedFileTypes.includes(fileType)}
                    onCheckedChange={(checked) => {
                      setSelectedFileTypes((current) =>
                        checked
                          ? [...current, fileType]
                          : current.filter((value) => value !== fileType),
                      );
                    }}
                  >
                    {fileType}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
              {selectedFileTypes.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setSelectedFileTypes([])}
                  >
                    <X className="size-3.5" /> Clear types
                  </Button>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => triggerFileUpload(currentPath)}
            disabled={!selectedBucket}
          >
            <FileUp className="mr-1.5 size-3.5" /> Upload
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={handleSync}
            disabled={loading}
          >
            <RefreshCw className={`mr-1.5 size-3.5 ${loading ? 'animate-spin' : ''}`} /> Sync
          </Button>
        </div>
      </div>

      {hasFilters && !search && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">{filteredSelectedFiles.length} matching files</Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              setDateRange(undefined);
              setModifiedFromTime('00:00');
              setModifiedToTime('23:59');
              setSelectedFileTypes([]);
            }}
          >
            <X className="size-3.5" /> Clear filters
          </Button>
        </div>
      )}

      {/* Breadcrumb bar */}
      {selectedBucket && !search && (
        <div className="flex items-center gap-1 text-sm">
          {currentPath && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => {
                const parts = currentPath.replace(/\/$/, '').split('/').filter(Boolean);
                parts.pop();
                setCurrentPath(parts.length > 0 ? parts.join('/') + '/' : '');
              }}
            >
              <FolderUp className="size-3.5" />
            </Button>
          )}
          {breadcrumbs.map((crumb, i) => (
            <div key={crumb.path} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="size-3 text-muted-foreground" />}
              <button
                onClick={() => setCurrentPath(crumb.path)}
                className={`px-1.5 py-0.5 rounded text-xs transition-colors hover:bg-accent ${
                  i === breadcrumbs.length - 1
                    ? 'font-semibold text-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                {i === 0 ? <Home className="size-3.5 inline-block mr-1" /> : null}
                {crumb.label}
              </button>
            </div>
          ))}
          {syncedAt && (
            <span className="ml-auto text-[10px] text-muted-foreground">
              Synced {new Date(syncedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
      )}

      {/* Content area */}
      <div
        className="relative rounded-xl border border-border/50 bg-card min-h-100"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        <AnimatePresence>
          {isDragOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary/5 backdrop-blur-sm"
            >
              <Upload className="size-8 text-primary mb-2 animate-bounce" />
              <p className="text-sm font-medium text-primary">Drop files to upload</p>
              {currentPath && <p className="text-xs text-primary/60 mt-1">to /{currentPath}</p>}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload spinner */}
        <AnimatePresence>
          {isUploading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 flex flex-col items-center justify-center rounded-xl bg-background/80 backdrop-blur-sm"
            >
              <Loader2 className="size-6 animate-spin text-primary mb-2" />
              <p className="text-sm font-medium">Uploading...</p>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading S3 files...</span>
          </div>
        ) : search ? (
          /* ── Search Results ─────────────────────────────────────── */
          <div className="p-3 space-y-1">
            <p className="text-xs text-muted-foreground mb-3">
              {searchResults?.length ?? 0} results for &quot;{search}&quot;
            </p>
            {searchResults && searchResults.length > 0 ? (
              <div className="space-y-0.5">
                {searchResults.slice(0, 50).map((file) => {
                  const fileName = file.key.split('/').pop() || file.key;
                  return (
                    <div
                      key={`${file._bucketName}:${file.key}`}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent/50 transition-colors cursor-default group"
                    >
                      <FileIcon fileName={fileName} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{fileName}</p>
                        <p className="text-[10px] text-muted-foreground truncate font-mono">
                          {file.key}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[9px] shrink-0">
                        {file._bucket}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatBytes(file.size)}
                      </span>
                      {file.cdnUrl && (
                        <button
                          onClick={() => window.open(file.cdnUrl, '_blank')}
                          className="text-[10px] text-blue-500 hover:underline shrink-0"
                        >
                          CDN
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Search className="size-8 mb-2" />
                <p className="text-sm">No files match your search</p>
              </div>
            )}
          </div>
        ) : !selectedBucket ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <Database className="size-10 mb-3" />
            <p className="text-sm">Select a bucket to browse files</p>
          </div>
        ) : (
          /* ── Explorer Grid ──────────────────────────────────────── */
          <ExplorerGrid
            files={filteredSelectedFiles}
            currentPath={currentPath}
            bucketName={selectedBucket.s3BucketName}
            region={selectedBucket.region}
            onNavigate={setCurrentPath}
            onDeleteFile={confirmDelete}
            onCreateFolder={handleCreateFolder}
            onMoveFile={handleMoveFile}
            onUpload={triggerFileUpload}
            onDownload={handleDownload}
          />
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => {
          if (!v) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete from S3?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{' '}
              <span className="font-mono font-semibold">{deleteTarget?.key}</span> from S3. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
