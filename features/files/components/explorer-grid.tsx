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
    // Skip folder markers (zero-size keys ending with /)
    if (file.key.endsWith('/') && file.size === 0) {
      // Just ensure folder exists
      const folderName = parts[parts.length - 2];
      if (folderName && !current.folders.has(folderName)) {
        current.folders.set(folderName, {
          name: folderName,
          path: file.key,
          files: [],
          folders: new Map(),
        });
      }
    } else {
      current.files.push(file);
    }
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

// ── Draggable File ──────────────────────────────────────────────────────────

function DraggableFile({
  file,
  onDelete,
  onDownload,
  onCopyPath,
  onViewInfo,
}: {
  file: MergedS3File;
  onDelete: () => void;
  onDownload: () => void;
  onCopyPath: () => void;
  onViewInfo: () => void;
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

  return (
    <ExplorerContextMenu
      type="file"
      cdnUrl={file.cdnUrl}
      onDownload={onDownload}
      onDelete={onDelete}
      onCopyPath={onCopyPath}
      onViewInfo={onViewInfo}
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
              <FileIcon fileName={fileName} size="md" />
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
  onNavigate,
  onDelete,
  onCopyPath,
  onCreateFolder,
  onUpload,
}: {
  name: string;
  path: string;
  fileCount: number;
  onNavigate: () => void;
  onDelete: () => void;
  onCopyPath: () => void;
  onCreateFolder: () => void;
  onUpload: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `folder:${path}`,
    data: { type: 'folder', path },
  });

  return (
    <ExplorerContextMenu
      type="folder"
      onDelete={onDelete}
      onCopyPath={onCopyPath}
      onCreateFolder={onCreateFolder}
      onUpload={onUpload}
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
  bucketName,
  region,
  onNavigate,
  onDeleteFile,
  onCreateFolder,
  onMoveFile,
  onUpload,
  onDownload,
}: ExplorerGridProps) {
  const [activeDrag, setActiveDrag] = useState<MergedS3File | null>(null);

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
                {folders.map((folder) => (
                  <DroppableFolder
                    key={`folder:${folder.path}`}
                    name={folder.name}
                    path={folder.path}
                    fileCount={countItems(folder)}
                    onNavigate={() => onNavigate(folder.path)}
                    onDelete={() => onDeleteFile(folder.path)}
                    onCopyPath={() => handleCopyPath(folder.path)}
                    onCreateFolder={() => promptCreateSubfolder(folder.path)}
                    onUpload={() => onUpload(folder.path)}
                  />
                ))}
                {currentFiles.map((file) => (
                  <DraggableFile
                    key={file.key}
                    file={file}
                    onDelete={() => onDeleteFile(file.key)}
                    onDownload={() => onDownload(file)}
                    onCopyPath={() => handleCopyPath(file.key)}
                    onViewInfo={() => {
                      toast.info(`${file.key} — ${formatBytes(file.size)}`, {
                        description: `Modified: ${formatDate(file.lastModified)}`,
                      });
                    }}
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
  );
}
