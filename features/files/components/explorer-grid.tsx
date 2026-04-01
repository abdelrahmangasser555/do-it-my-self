// Windows Explorer-like grid view for files and folders
'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink } from 'lucide-react';
import { FaWhatsapp, FaTelegram, FaTwitter } from 'react-icons/fa';
import { MdEmail } from 'react-icons/md';
import { FileIcon, FolderIcon } from './file-icons';
import { ExplorerContextMenu } from './explorer-context-menu';
import type { MergedS3File } from '@/features/files/hooks/use-files';
import { toast } from 'sonner';

// ── Types ───────────────────────────────────────────────────────────────────

interface FolderNode {
  name: string;
  path: string;
  files: MergedS3File[];
  folders: Map<string, FolderNode>;
}

interface ExplorerGridProps {
  files: MergedS3File[];
  currentPath: string;
  bucketName: string;
  region?: string;
  onNavigate: (path: string) => void;
  onDeleteFile: (key: string) => void;
  onCreateFolder: (path: string) => void;
  onMoveFile: (sourceKey: string, destKey: string) => void;
  onUpload: (prefix: string) => void;
  onDownload: (file: MergedS3File) => void;
}

interface CostTarget {
  name: string;
  sizeBytes: number;
  fileCount: number;
  hasCdn: boolean;
}

interface ShareTarget {
  name: string;
  url: string | null;
  path: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function buildFolderTree(files: MergedS3File[]): FolderNode {
  const root: FolderNode = { name: '', path: '', files: [], folders: new Map() };
  for (const file of files) {
    const parts = file.key.split('/');
    let current = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!part) continue; // skip empty segments from trailing slash
      if (!current.folders.has(part)) {
        current.folders.set(part, {
          name: part,
          path: parts.slice(0, i + 1).join('/') + '/',
          files: [],
          folders: new Map(),
        });
      }
      current = current.folders.get(part)!;
    }
    // Folder markers (zero-byte keys ending with /) are fully handled by the
    // traversal loop above — no need to add them as files.
    if (file.key.endsWith('/') && file.size === 0) continue;
    current.files.push(file);
  }
  return root;
}

function getNodeAtPath(root: FolderNode, path: string): FolderNode | null {
  if (!path || path === '/') return root;
  const segments = path.replace(/\/$/, '').split('/').filter(Boolean);
  let node = root;
  for (const seg of segments) {
    const child = node.folders.get(seg);
    if (!child) return null;
    node = child;
  }
  return node;
}

function computeFolderSize(node: FolderNode): number {
  let total = node.files.reduce((s, f) => s + f.size, 0);
  for (const child of node.folders.values()) total += computeFolderSize(child);
  return total;
}

function countAllFiles(node: FolderNode): number {
  let count = node.files.length;
  for (const child of node.folders.values()) count += countAllFiles(child);
  return count;
}

function predictCost(sizeBytes: number, fileCount: number, hasCdn: boolean) {
  const sizeGB = sizeBytes / 1_073_741_824;
  const storagePerMonth = sizeGB * 0.023; // S3 Standard $0.023/GB
  const getRequestCost = ((fileCount * 1_000) / 1_000) * 0.0004; // 1k GETs/file
  const cdnTransferPerMonth = hasCdn ? sizeGB * 0.085 * 1_000 : 0; // 1k accesses * transfer
  return {
    sizeGB,
    storagePerMonth,
    cdnTransferPerMonth,
    getRequestCost,
    total: storagePerMonth + cdnTransferPerMonth + getRequestCost,
  };
}

function fmtCost(n: number): string {
  if (n < 0.001) return '<$0.001';
  return `$${n.toFixed(n < 0.01 ? 4 : n < 1 ? 3 : 2)}`;
}

// ── Cost Prediction Dialog ──────────────────────────────────────────────────

function CostPredictionDialog({
  target,
  onClose,
}: {
  target: CostTarget | null;
  onClose: () => void;
}) {
  if (!target) return null;
  const est = predictCost(target.sizeBytes, target.fileCount, target.hasCdn);

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-fit">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold truncate flex items-center gap-1.5">
            <span className="text-muted-foreground">Cost estimate —</span> {target.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-muted-foreground">
            <span>Size</span>
            <span className="text-foreground font-mono">
              {formatBytes(target.sizeBytes)} ({est.sizeGB.toFixed(6)} GB)
            </span>
            <span>Files</span>
            <span className="text-foreground">{target.fileCount}</span>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <p className="text-muted-foreground font-medium">Monthly estimate</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">S3 storage</span>
                <span className="font-mono text-foreground">{fmtCost(est.storagePerMonth)}</span>
              </div>
              {target.hasCdn && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">CloudFront transfer (1k req)</span>
                  <span className="font-mono text-foreground">
                    {fmtCost(est.cdnTransferPerMonth)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">S3 GET requests (1k/file)</span>
                <span className="font-mono text-foreground">{fmtCost(est.getRequestCost)}</span>
              </div>
            </div>
            <div className="border-t pt-2 flex items-center justify-between font-semibold">
              <span>Total / month</span>
              <span className="font-mono text-emerald-500">{fmtCost(est.total)}</span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Assumes 1,000 monthly accesses per file via CloudFront and S3 Standard storage. Actual
            costs vary by region and access pattern.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Share Dialog ─────────────────────────────────────────────────────────────

function ShareDialog({ target, onClose }: { target: ShareTarget | null; onClose: () => void }) {
  if (!target) return null;
  const shareUrl = target.url ?? target.path;
  const encoded = encodeURIComponent(shareUrl);
  const label = encodeURIComponent(target.name);
  const noCdnUrl = !target.url;

  const platforms = [
    {
      name: 'WhatsApp',
      icon: <FaWhatsapp className="size-5" style={{ color: '#25D366' }} />,
      href: `https://api.whatsapp.com/send?text=${label}%20${encoded}`,
    },
    {
      name: 'Telegram',
      icon: <FaTelegram className="size-5" style={{ color: '#229ED9' }} />,
      href: `https://t.me/share/url?url=${encoded}&text=${label}`,
    },
    {
      name: 'Twitter',
      icon: <FaTwitter className="size-5 text-foreground" />,
      href: `https://twitter.com/intent/tweet?url=${encoded}&text=${label}`,
    },
    {
      name: 'Email',
      icon: <MdEmail className="size-5 text-muted-foreground" />,
      href: `mailto:?subject=${label}&body=${encoded}`,
    },
  ];

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold truncate flex items-center gap-1.5">
            <span className="text-muted-foreground">Share —</span> {target.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {noCdnUrl && (
            <p className="text-[10px] text-amber-500 bg-amber-500/10 rounded-md px-2.5 py-1.5">
              No CDN URL — sharing the S3 object key path. Connect a CloudFront distribution for a
              public link.
            </p>
          )}
          {/* URL row */}
          <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
            <ExternalLink className="size-3.5 text-muted-foreground shrink-0" />
            <span className="text-[11px] font-mono truncate text-muted-foreground flex-1">
              {shareUrl}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                toast.success('Link copied');
              }}
            >
              <Copy className="size-3" />
            </Button>
          </div>
          {/* Platform grid */}
          <div className="grid grid-cols-4 gap-2">
            {platforms.map((p) => (
              <button
                key={p.name}
                onClick={() => window.open(p.href, '_blank', 'noopener,noreferrer')}
                className="flex flex-col items-center gap-1.5 rounded-xl border bg-card p-3 text-[10px] text-muted-foreground hover:bg-accent transition-colors"
              >
                {p.icon}
                <span>{p.name}</span>
              </button>
            ))}
          </div>
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <Button
              variant="outline"
              className="w-full h-8 text-xs gap-1.5"
              onClick={() =>
                navigator.share({ title: target.name, url: shareUrl }).catch(() => null)
              }
            >
              More options
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Draggable File ──────────────────────────────────────────────────────────

function DraggableFile({
  file,
  onDelete,
  onDownload,
  onCopyPath,
  onPredictCost,
  onShare,
}: {
  file: MergedS3File;
  onDelete: () => void;
  onDownload: () => void;
  onCopyPath: () => void;
  onPredictCost: () => void;
  onShare: () => void;
}) {
  const fileName = file.key.split('/').pop() || file.key;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: file.key,
    data: { type: 'file', file },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
      }
    : undefined;

  const costEst = predictCost(file.size, 1, !!file.cdnUrl);

  return (
    <ExplorerContextMenu
      type="file"
      cdnUrl={file.cdnUrl}
      onDownload={onDownload}
      onDelete={onDelete}
      onCopyPath={onCopyPath}
      onPredictCost={onPredictCost}
      onShare={onShare}
    >
      <div>
        <HoverCard openDelay={400} closeDelay={100}>
          <HoverCardTrigger asChild>
            <motion.div
              ref={setNodeRef}
              style={style}
              {...attributes}
              {...listeners}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: isDragging ? 0.4 : 1, scale: 1 }}
              className="group flex flex-col items-center gap-1.5 rounded-lg p-3 cursor-default select-none transition-colors hover:bg-accent/50 focus:outline-none focus:ring-1 focus:ring-ring w-25"
              onDoubleClick={() => file.cdnUrl && window.open(file.cdnUrl, '_blank')}
            >
              <FileIcon fileName={fileName} size="md" cdnUrl={file.cdnUrl} />
              <span
                className="text-[11px] text-center leading-tight truncate w-full text-foreground"
                title={fileName}
              >
                {fileName}
              </span>
              <span className="text-[9px] text-muted-foreground">{formatBytes(file.size)}</span>
            </motion.div>
          </HoverCardTrigger>
          <HoverCardContent side="right" align="start" className="w-64 text-xs space-y-1.5">
            <p className="font-semibold truncate">{fileName}</p>
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-muted-foreground">
              <span>Path</span>
              <span className="truncate font-mono text-foreground">{file.key}</span>
              <span>Size</span>
              <span className="text-foreground">{formatBytes(file.size)}</span>
              <span>Modified</span>
              <span className="text-foreground">{formatDate(file.lastModified)}</span>
              {file.storageClass && (
                <>
                  <span>Class</span>
                  <span className="text-foreground">{file.storageClass}</span>
                </>
              )}
              {file.etag && (
                <>
                  <span>ETag</span>
                  <span className="truncate font-mono text-foreground">
                    {file.etag.replace(/"/g, '')}
                  </span>
                </>
              )}
              {file.cdnUrl && (
                <>
                  <span>CDN</span>
                  <span className="truncate text-blue-500">{file.cdnUrl}</span>
                </>
              )}
              <span>Est. cost</span>
              <span className="text-emerald-500 font-mono">{fmtCost(costEst.total)}/mo</span>
            </div>
            {file.uploadedFromSystem && (
              <div className="flex items-center gap-1 text-emerald-500 text-[10px] pt-1">
                <span className="size-1.5 rounded-full bg-emerald-500" /> Uploaded from system
              </div>
            )}
          </HoverCardContent>
        </HoverCard>
      </div>
    </ExplorerContextMenu>
  );
}

// ── Droppable Folder ────────────────────────────────────────────────────────

function DroppableFolder({
  name,
  path,
  fileCount,
  folderTotalSize,
  onNavigate,
  onDelete,
  onCopyPath,
  onCreateFolder,
  onUpload,
  onPredictCost,
  onShare,
}: {
  name: string;
  path: string;
  fileCount: number;
  folderTotalSize: number;
  onNavigate: () => void;
  onDelete: () => void;
  onCopyPath: () => void;
  onCreateFolder: () => void;
  onUpload: () => void;
  onPredictCost: () => void;
  onShare: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `folder:${path}`,
    data: { type: 'folder', path },
  });

  return (
    <ExplorerContextMenu
      type="folder"
      folderName={name}
      folderTotalSize={folderTotalSize}
      folderFileCount={fileCount}
      onDelete={onDelete}
      onCopyPath={onCopyPath}
      onCreateFolder={onCreateFolder}
      onUpload={onUpload}
      onPredictCost={onPredictCost}
      onShare={onShare}
    >
      <div>
        <motion.div
          ref={setNodeRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`group flex flex-col items-center gap-1.5 rounded-lg p-3 cursor-default select-none transition-colors hover:bg-accent/50 w-25 ${
            isOver ? 'bg-primary/10 ring-1 ring-primary/30' : ''
          }`}
          onDoubleClick={onNavigate}
        >
          <FolderIcon size="md" />
          <span
            className="text-[11px] text-center leading-tight truncate w-full text-foreground"
            title={name}
          >
            {name}
          </span>
          <span className="text-[9px] text-muted-foreground">{fileCount} items</span>
        </motion.div>
      </div>
    </ExplorerContextMenu>
  );
}

// ── Main Grid ───────────────────────────────────────────────────────────────

export function ExplorerGrid({
  files,
  currentPath,
  bucketName: _bucketName,
  region: _region,
  onNavigate,
  onDeleteFile,
  onCreateFolder,
  onMoveFile,
  onUpload,
  onDownload,
}: ExplorerGridProps) {
  const [activeDrag, setActiveDrag] = useState<MergedS3File | null>(null);
  const [costTarget, setCostTarget] = useState<CostTarget | null>(null);
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const tree = useMemo(() => buildFolderTree(files), [files]);
  const currentNode = useMemo(() => getNodeAtPath(tree, currentPath), [tree, currentPath]);

  const folders = currentNode ? Array.from(currentNode.folders.values()) : [];
  const currentFiles = currentNode?.files ?? [];

  // Count total items in a folder recursively
  function countItems(node: FolderNode): number {
    let count = node.files.length;
    for (const child of node.folders.values()) count += countItems(child);
    return count;
  }

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === 'file') setActiveDrag(data.file as MergedS3File);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over || !active) return;

    const overData = over.data.current;
    const activeData = active.data.current;
    if (!overData || !activeData) return;

    if (activeData.type === 'file' && overData.type === 'folder') {
      const sourceKey = active.id as string;
      const fileName = sourceKey.split('/').pop() || sourceKey;
      const destFolder = overData.path as string;
      const destKey = destFolder + fileName;
      if (sourceKey !== destKey) {
        onMoveFile(sourceKey, destKey);
      }
    }
  };

  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    toast.success('Path copied');
  };

  const promptCreateFolder = () => {
    const name = prompt('Folder name:');
    if (name?.trim()) {
      const folderPath = currentPath ? `${currentPath}${name.trim()}/` : `${name.trim()}/`;
      onCreateFolder(folderPath);
    }
  };

  const promptCreateSubfolder = (parentPath: string) => {
    const name = prompt('Subfolder name:');
    if (name?.trim()) {
      onCreateFolder(`${parentPath}${name.trim()}/`);
    }
  };

  const isEmpty = folders.length === 0 && currentFiles.length === 0;

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <ExplorerContextMenu
          type="background"
          onCreateFolder={promptCreateFolder}
          onUpload={() => onUpload(currentPath)}
        >
          <div className="min-h-75 p-2">
            {isEmpty ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <FolderIcon size="lg" />
                <p className="mt-3 text-sm">This folder is empty</p>
                <p className="text-xs mt-1">Right-click to create a folder or upload files</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1 content-start">
                <AnimatePresence mode="popLayout">
                  {folders.map((folder) => {
                    const folderSize = computeFolderSize(folder);
                    const folderFiles = countAllFiles(folder);
                    return (
                      <DroppableFolder
                        key={`folder:${folder.path}`}
                        name={folder.name}
                        path={folder.path}
                        fileCount={folderFiles}
                        folderTotalSize={folderSize}
                        onNavigate={() => onNavigate(folder.path)}
                        onDelete={() => onDeleteFile(folder.path)}
                        onCopyPath={() => handleCopyPath(folder.path)}
                        onCreateFolder={() => promptCreateSubfolder(folder.path)}
                        onUpload={() => onUpload(folder.path)}
                        onPredictCost={() =>
                          setCostTarget({
                            name: folder.name,
                            sizeBytes: folderSize,
                            fileCount: folderFiles,
                            hasCdn: currentFiles.some((f) => !!f.cdnUrl),
                          })
                        }
                        onShare={() =>
                          setShareTarget({ name: folder.name, url: null, path: folder.path })
                        }
                      />
                    );
                  })}
                  {currentFiles.map((file) => (
                    <DraggableFile
                      key={file.key}
                      file={file}
                      onDelete={() => onDeleteFile(file.key)}
                      onDownload={() => onDownload(file)}
                      onCopyPath={() => handleCopyPath(file.key)}
                      onPredictCost={() =>
                        setCostTarget({
                          name: file.key.split('/').pop() || file.key,
                          sizeBytes: file.size,
                          fileCount: 1,
                          hasCdn: !!file.cdnUrl,
                        })
                      }
                      onShare={() =>
                        setShareTarget({
                          name: file.key.split('/').pop() || file.key,
                          url: file.cdnUrl ?? null,
                          path: file.key,
                        })
                      }
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </ExplorerContextMenu>

        <DragOverlay>
          {activeDrag && (
            <div className="flex flex-col items-center gap-1 opacity-80 pointer-events-none">
              <FileIcon fileName={activeDrag.key.split('/').pop() || ''} size="md" />
              <span className="text-[10px] text-foreground font-medium truncate max-w-20">
                {activeDrag.key.split('/').pop()}
              </span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <CostPredictionDialog target={costTarget} onClose={() => setCostTarget(null)} />
      <ShareDialog target={shareTarget} onClose={() => setShareTarget(null)} />
    </>
  );
}
