// Bucket tile — progress ring, file type bar, context menu, country flags, themed
'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Trash2,
  Rocket,
  AlertTriangle,
  Loader2,
  Eye,
  Copy,
  Check,
  CloudUpload,
  Upload,
  FolderOpen,
  Calendar,
} from 'lucide-react';
import { CircleFlag } from 'react-circle-flags';
import { getRegionAlpha2 } from '@/lib/region-flags';
import type { Bucket, BucketAnalytics } from '@/lib/types';
import { toast } from 'sonner';

// ── Types ───────────────────────────────────────────────────────────────────

export interface BucketCardProps {
  bucket: Bucket;
  projectName?: string;
  fileCount: number;
  totalSizeBytes: number;
  analytics?: BucketAnalytics;
  fileTypeBreakdown?: { type: string; count: number; color: string }[];
  onDelete: (id: string) => void;
  onFullDelete?: (bucket: Bucket) => void;
  onDeploy: (bucket: Bucket) => void;
  onConnectCDN?: (bucket: Bucket) => void;
  onConnectProject?: (bucket: Bucket) => void;
  onFileDrop?: (bucket: Bucket, files: File[]) => void;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}

function getUsagePercent(totalSizeBytes: number): number {
  const cap = 10 * 1024 * 1024 * 1024;
  return Math.min((totalSizeBytes / cap) * 100, 100);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '\u2014';
  }
}

const statusConfig: Record<string, { label: string; dotClass: string }> = {
  active: { label: 'Active', dotClass: 'bg-emerald-500' },
  deploying: { label: 'Deploying', dotClass: 'bg-amber-400 animate-pulse' },
  failed: { label: 'Failed', dotClass: 'bg-red-500' },
  pending: { label: 'Pending', dotClass: 'bg-muted-foreground/50' },
  deleting: { label: 'Deleting', dotClass: 'bg-muted-foreground/50 animate-pulse' },
};

// ── Progress Ring ───────────────────────────────────────────────────────────

function ProgressRing({ percent, size = 80 }: { percent: number; size?: number }) {
  const r = (size - 10) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = (percent / 100) * circumference;
  const hue = percent >= 80 ? 0 : percent >= 50 ? 40 : 142;

  return (
    <svg width={size} height={size} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        className="text-muted/30"
        strokeWidth={5}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={`hsl(${hue}, 72%, 50%)`}
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference - filled}`}
        strokeDashoffset={circumference * 0.25}
        className="transition-all duration-700 ease-out"
      />
    </svg>
  );
}

// ── File Type Bar ───────────────────────────────────────────────────────────

function FileTypeBar({
  breakdown,
}: {
  breakdown: { type: string; count: number; color: string }[];
}) {
  const total = breakdown.reduce((s, b) => s + b.count, 0);
  if (total === 0) return <div className="h-1.5 w-full rounded-full bg-muted/20" />;
  return (
    <div className="space-y-1">
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted/20">
        {breakdown.map((b) => (
          <div
            key={b.type}
            className="h-full transition-all duration-500"
            style={{ width: `${(b.count / total) * 100}%`, backgroundColor: b.color }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {breakdown.slice(0, 4).map((b) => (
          <span key={b.type} className="flex items-center gap-1 text-[9px] text-muted-foreground">
            <span className="size-1.5 rounded-full" style={{ backgroundColor: b.color }} />
            {b.type}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Activity Pulse ──────────────────────────────────────────────────────────

function ActivityPulse({ active }: { active: boolean }) {
  return (
    <div className="h-1 w-full rounded-full overflow-hidden bg-muted/20">
      {active ? (
        <motion.div
          className="h-full rounded-full bg-primary/50"
          style={{ backgroundSize: '200% 100%' }}
          animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
      ) : (
        <div className="h-full w-1/6 rounded-full bg-muted-foreground/10" />
      )}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export function BucketCard({
  bucket,
  projectName,
  fileCount,
  totalSizeBytes,
  analytics,
  fileTypeBreakdown,
  onDelete,
  onFullDelete,
  onDeploy,
  onConnectCDN,
  onConnectProject,
  onFileDrop,
}: BucketCardProps) {
  const [copied, setCopied] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [hovered, setHovered] = useState(false);
  const dragCounterRef = useRef(0);

  const usage = getUsagePercent(analytics?.totalSizeBytes ?? totalSizeBytes);
  const status = statusConfig[bucket.status] ?? statusConfig.pending;
  const alpha2 = getRegionAlpha2(bucket.region);
  const isActive = bucket.status === 'active';
  const needsProjectLink = !bucket.projectId;

  const handleCopy = () => {
    navigator.clipboard.writeText(bucket.s3BucketName);
    setCopied(true);
    toast.success('Copied');
    setTimeout(() => setCopied(false), 1200);
  };

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current++;
      if (isActive && onFileDrop) setIsDragOver(true);
    },
    [isActive, onFileDrop],
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
      if (!isActive || !onFileDrop) return;
      const dropped = Array.from(e.dataTransfer.files);
      if (dropped.length === 0) return;
      setIsUploading(true);
      try {
        await onFileDrop(bucket, dropped);
      } finally {
        setIsUploading(false);
      }
    },
    [bucket, isActive, onFileDrop],
  );

  const triggerUpload = () => {
    if (!onFileDrop) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = () => {
      const files = Array.from(input.files ?? []);
      if (files.length > 0) onFileDrop(bucket, files);
    };
    input.click();
  };

  const card = (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`h-full ${bucket.status === 'deleting' ? 'opacity-40 pointer-events-none' : ''}`}
    >
      <div
        className="relative flex h-full overflow-hidden rounded-xl border border-border/50 bg-card transition-all duration-200 hover:border-border"
        style={{ transform: hovered ? 'scale(1.015)' : 'scale(1)', transition: 'transform 0.2s' }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <AnimatePresence>
          {isDragOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary/5 backdrop-blur-sm"
            >
              <Upload className="size-7 text-primary mb-1.5 animate-bounce" />
              <p className="text-xs font-medium text-primary">Drop files here</p>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {isUploading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-xl bg-background/80 backdrop-blur-sm"
            >
              <Loader2 className="size-5 animate-spin text-primary mb-1.5" />
              <p className="text-xs font-medium">Uploading…</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex h-full w-full flex-col gap-3 p-4">
          {/* Header: flag + name + status */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <CircleFlag countryCode={alpha2} height={18} className="w-12" />
              <div className="min-w-0">
                <Link
                  href={`/buckets/${bucket.id}`}
                  className="block text-sm font-semibold truncate hover:text-primary transition-colors"
                >
                  {bucket.name}
                </Link>
                <span className="text-[10px] text-muted-foreground font-mono">{bucket.region}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`size-1.5 rounded-full ${status.dotClass}`} />
              <span className="text-[10px] text-muted-foreground">{status.label}</span>
            </div>
          </div>

          {needsProjectLink ? (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-2 text-[11px] text-amber-700 dark:text-amber-300">
              <div className="flex items-center justify-between gap-2">
                <span>Connect this bucket to a project to enable uploads.</span>
                {onConnectProject && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10px]"
                    onClick={() => onConnectProject(bucket)}
                  >
                    Connect
                  </Button>
                )}
              </div>
            </div>
          ) : projectName ? (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                {projectName}
              </Badge>
            </div>
          ) : null}

          {/* Center: progress ring + stats */}
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <ProgressRing percent={usage} size={80} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-sm font-bold leading-none">
                  {formatBytes(analytics?.totalSizeBytes ?? totalSizeBytes)}
                </span>
                <span className="text-[8px] text-muted-foreground">{Math.round(usage)}%</span>
              </div>
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Files</span>
                <span className="font-medium">{analytics?.fileCount ?? fileCount}</span>
              </div>
              {analytics && (
                <>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Reads</span>
                    <span className="font-medium">{analytics.readRequests.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Cost/mo</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      ${analytics.estimatedMonthlyCost.toFixed(2)}
                    </span>
                  </div>
                </>
              )}
              {bucket.cloudFrontDomain && (
                <Badge
                  variant="outline"
                  className="text-[9px] h-4 px-1 border-blue-500/20 text-blue-600 dark:text-blue-400"
                >
                  CDN
                </Badge>
              )}
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-3">
            {/* File type distribution bar */}
            {fileTypeBreakdown && fileTypeBreakdown.length > 0 ? (
              <FileTypeBar breakdown={fileTypeBreakdown} />
            ) : (
              <ActivityPulse active={isActive || bucket.status === 'deploying'} />
            )}

            {/* Bottom: created at + copy */}
            <div className="flex items-center justify-between pt-0.5">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Calendar className="size-2.5" />
                <span>{formatDate(bucket.createdAt)}</span>
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-muted-foreground font-mono truncate max-w-36 transition-colors"
                title="Click to copy S3 name"
              >
                {bucket.s3BucketName}
                {copied ? (
                  <Check className="size-2.5 text-emerald-500 shrink-0" />
                ) : (
                  <Copy className="size-2.5 shrink-0" />
                )}
              </button>
            </div>

            {/* Hover actions */}
            <AnimatePresence>
              {hovered && isActive && onFileDrop && !needsProjectLink && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.12 }}
                  className="flex items-center gap-1.5"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] flex-1"
                    onClick={triggerUpload}
                  >
                    <Upload className="mr-1 size-3" /> Upload
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-[10px] flex-1" asChild>
                    <Link href={`/buckets/${bucket.id}`}>
                      <FolderOpen className="mr-1 size-3" /> Open
                    </Link>
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {fileCount === 0 && isActive && !hovered && !needsProjectLink && (
              <p className="text-center text-[10px] text-muted-foreground/40 py-0.5">
                No files yet · Drop to upload
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{card}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem asChild>
          <Link href={`/buckets/${bucket.id}`} className="flex items-center gap-2">
            <Eye className="size-3.5" /> View Details
          </Link>
        </ContextMenuItem>
        {isActive && onFileDrop && (
          <ContextMenuItem onClick={triggerUpload}>
            <Upload className="mr-2 size-3.5" /> Upload Files
          </ContextMenuItem>
        )}
        {bucket.status === 'pending' && (
          <ContextMenuItem onClick={() => onDeploy(bucket)}>
            <Rocket className="mr-2 size-3.5" /> Deploy with CDK
          </ContextMenuItem>
        )}
        {bucket.status === 'failed' && (
          <ContextMenuItem onClick={() => onDeploy(bucket)}>
            <Rocket className="mr-2 size-3.5" /> Retry Deploy
          </ContextMenuItem>
        )}
        {onConnectCDN && isActive && !bucket.cloudFrontDomain && (
          <ContextMenuItem onClick={() => onConnectCDN(bucket)}>
            <CloudUpload className="mr-2 size-3.5" /> Connect CDN
          </ContextMenuItem>
        )}
        {onConnectProject && (
          <ContextMenuItem onClick={() => onConnectProject(bucket)}>
            <FolderOpen className="mr-2 size-3.5" />{' '}
            {needsProjectLink ? 'Connect Project' : 'Change Project'}
          </ContextMenuItem>
        )}
        <ContextMenuItem onClick={handleCopy}>
          <Copy className="mr-2 size-3.5" /> Copy S3 Name
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onClick={() => onDelete(bucket.id)}>
          <Trash2 className="mr-2 size-3.5" /> Remove Metadata
        </ContextMenuItem>
        {onFullDelete && isActive && (
          <ContextMenuItem variant="destructive" onClick={() => onFullDelete(bucket)}>
            <AlertTriangle className="mr-2 size-3.5" /> Full Delete (AWS)
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
