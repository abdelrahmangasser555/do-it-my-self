// Expandable folder tree view for S3 bucket files
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileIcon,
  Upload,
  Cloud,
  Database,
  HardDrive,
  Clock,
  Key,
  Tag,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import type { MergedS3File } from "@/features/files/hooks/use-files";

// ── Tree data structure ─────────────────────────────────────────────────────

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children: TreeNode[];
  file?: MergedS3File;
  totalSize: number;
  fileCount: number;
}

function buildTree(files: MergedS3File[]): TreeNode {
  // ── Step 1: classify each S3 object ────────────────────────────────────
  // Folder markers are zero-byte objects whose key ends with "/" (e.g. "images/")
  // or whose normalized key exactly collides with a folder prefix produced by
  // real files below it (e.g. an object keyed "images" when "images/file.jpg" also exists).

  // First pass: collect all folder prefixes that have real file children
  const populatedFolders = new Set<string>();
  for (const f of files) {
    if (f.key.endsWith("/")) continue; // skip markers in this pass
    const parts = f.key.split("/").filter(Boolean);
    for (let i = 0; i < parts.length - 1; i++) {
      populatedFolders.add(parts.slice(0, i + 1).join("/"));
    }
  }

  // Classify each object:
  //   "marker"  → folder marker that should NOT become a file node
  //               (either explicit trailing-slash key, or key matches a populated folder prefix)
  //   "empty"   → explicit trailing-slash marker with NO child files → render as empty folder
  //   "file"    → real content — added to the tree normally
  const contentFiles: MergedS3File[] = [];
  const emptyFolderPaths: string[] = [];

  for (const f of files) {
    const normalizedKey = f.key.replace(/\/+$/, ""); // strip trailing slash
    const isExplicitMarker = f.key.endsWith("/");
    const shadowsFolder = populatedFolders.has(normalizedKey);

    if (isExplicitMarker || shadowsFolder) {
      // Only keep it as an "empty folder" if it has no children
      if (isExplicitMarker && !populatedFolders.has(normalizedKey) && normalizedKey) {
        emptyFolderPaths.push(normalizedKey);
      }
      // Either way, do NOT treat it as a file node
      continue;
    }

    contentFiles.push(f);
  }

  // ── Step 2: build tree from real content files ──────────────────────────
  const root: TreeNode = {
    name: "/",
    path: "",
    isFolder: true,
    children: [],
    totalSize: 0,
    fileCount: 0,
  };

  // Helper: ensure a folder path exists in the tree and return the leaf node
  function ensureFolder(folderPath: string): TreeNode {
    const parts = folderPath.split("/").filter(Boolean);
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const path = parts.slice(0, i + 1).join("/");
      let folder = current.children.find((c) => c.isFolder && c.name === part);
      if (!folder) {
        folder = { name: part, path, isFolder: true, children: [], totalSize: 0, fileCount: 0 };
        current.children.push(folder);
      }
      current = folder;
    }
    return current;
  }

  for (const file of contentFiles) {
    const parts = file.key.split("/").filter(Boolean);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const currentPath = parts.slice(0, i + 1).join("/");

      if (isLast) {
        // File node
        current.children.push({
          name: part,
          path: currentPath,
          isFolder: false,
          children: [],
          file,
          totalSize: file.size,
          fileCount: 1,
        });
        // Propagate size upward through all ancestor folders
        root.totalSize += file.size;
        root.fileCount++;
        let parent: TreeNode = root;
        for (const pp of parts.slice(0, -1)) {
          const found = parent.children.find((c) => c.isFolder && c.name === pp);
          if (found) {
            found.totalSize += file.size;
            found.fileCount++;
            parent = found;
          }
        }
      } else {
        // Folder node — find or create
        let folder = current.children.find((c) => c.isFolder && c.name === part);
        if (!folder) {
          folder = { name: part, path: currentPath, isFolder: true, children: [], totalSize: 0, fileCount: 0 };
          current.children.push(folder);
        }
        current = folder;
      }
    }
  }

  // ── Step 3: inject empty folders (externally created, no children) ──────
  for (const folderPath of emptyFolderPaths) {
    ensureFolder(folderPath); // no-op if already exists
  }

  // ── Step 4: sort — folders first, then files, alphabetically ───────────
  function sortChildren(node: TreeNode) {
    node.children.sort((a, b) => {
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const child of node.children) {
      if (child.isFolder) sortChildren(child);
    }
  }
  sortChildren(root);

  return root;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getMimeFromKey(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif",
    webp: "image/webp", svg: "image/svg+xml", pdf: "application/pdf",
    json: "application/json", xml: "application/xml", csv: "text/csv",
    txt: "text/plain", html: "text/html", css: "text/css",
    js: "application/javascript", ts: "application/typescript",
    zip: "application/zip", mp4: "video/mp4", mp3: "audio/mpeg",
  };
  return map[ext] || "application/octet-stream";
}

// ── Tree node component ─────────────────────────────────────────────────────

function TreeNodeRow({
  node,
  depth,
}: {
  node: TreeNode;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(depth < 1);

  if (!node.isFolder) {
    const file = node.file;
    const mime = file?.metadata?.mimeType || getMimeFromKey(node.name);
    return (
      <HoverCard openDelay={400} closeDelay={100}>
        <HoverCardTrigger asChild>
          <div
            className="flex items-center gap-2 py-1 px-2 hover:bg-muted/50 rounded-sm cursor-default"
            style={{ paddingLeft: `${depth * 20 + 8}px` }}
          >
            <FileIcon className="size-3.5 text-muted-foreground shrink-0" />
            <span className="text-sm truncate">{node.name}</span>
            <span className="text-xs text-muted-foreground ml-auto shrink-0">
              {formatBytes(node.totalSize)}
            </span>
            {file?.uploadedFromSystem && (
              <Badge className="gap-0.5 text-[9px] h-4 bg-green-500/10 text-green-600 border-green-500/20 shrink-0">
                <Upload className="size-2" /> System
              </Badge>
            )}
            {file && !file.uploadedFromSystem && (
              <Badge variant="secondary" className="text-[9px] h-4 shrink-0">
                <Cloud className="mr-0.5 size-2" /> External
              </Badge>
            )}
          </div>
        </HoverCardTrigger>
        {file && (
          <HoverCardContent className="w-72" side="right" align="start">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileIcon className="size-4 text-primary shrink-0" />
                <p className="font-semibold text-sm truncate">{node.name}</p>
              </div>
              <div className="grid gap-1.5 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Key className="size-3 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground shrink-0">Key:</span>
                  <span className="font-mono truncate min-w-0 flex-1">{file.key}</span>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <HardDrive className="size-3 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground shrink-0">Size:</span>
                  <span>{formatBytes(file.size)}</span>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <Tag className="size-3 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground shrink-0">Type:</span>
                  <span>{mime}</span>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <Clock className="size-3 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground shrink-0">Modified:</span>
                  <span>{file.lastModified ? new Date(file.lastModified).toLocaleString() : "\u2014"}</span>
                </div>
                {file.storageClass && (
                  <div className="flex items-center gap-2 min-w-0">
                    <Database className="size-3 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground shrink-0">Storage:</span>
                    <span>{file.storageClass}</span>
                  </div>
                )}
                {file.cdnUrl && (
                  <div className="flex items-center gap-2 min-w-0">
                    <ExternalLink className="size-3 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground shrink-0">CDN:</span>
                    <a href={file.cdnUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate min-w-0 flex-1">{file.cdnUrl}</a>
                  </div>
                )}
              </div>
            </div>
          </HoverCardContent>
        )}
      </HoverCard>
    );
  }

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 py-1 px-2 hover:bg-muted/50 rounded-sm text-left"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        {expanded ? (
          <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
        )}
        {expanded ? (
          <FolderOpen className="size-3.5 text-amber-500 shrink-0" />
        ) : (
          <Folder className="size-3.5 text-amber-500 shrink-0" />
        )}
        <span className="text-sm font-medium">{node.name}/</span>
        <span className="text-xs text-muted-foreground ml-auto shrink-0">
          {node.fileCount} files · {formatBytes(node.totalSize)}
        </span>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            {node.children.map((child) => (
              <TreeNodeRow
                key={`${child.isFolder ? "dir" : "file"}:${child.path}`}
                node={child}
                depth={depth + 1}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

interface FolderStructureViewProps {
  files: MergedS3File[];
}

export function FolderStructureView({ files }: FolderStructureViewProps) {
  const tree = buildTree(files);

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Folder className="mb-3 size-10" />
        <p className="text-sm">No files in this bucket.</p>
      </div>
    );
  }

  // If the root only has children (no files directly), show them directly
  return (
    <div className="rounded-md border p-2 font-mono text-sm">
      <div className="flex items-center gap-2 py-1 px-2 border-b mb-1">
        <Folder className="size-3.5 text-amber-500" />
        <span className="text-sm font-medium">
          / ({tree.fileCount} files · {formatBytes(tree.totalSize)})
        </span>
      </div>
      {tree.children.map((child) => (
        <TreeNodeRow key={`${child.isFolder ? "dir" : "file"}:${child.path}`} node={child} depth={0} />
      ))}
    </div>
  );
}

// ── Global folder view — all buckets ────────────────────────────────────────

interface BucketS3Data {
  bucketId: string;
  bucketName: string;
  displayName: string;
  files: MergedS3File[];
  totalSize: number;
  totalFiles: number;
}

interface GlobalFolderViewProps {
  buckets: BucketS3Data[];
}

export function GlobalFolderView({ buckets }: GlobalFolderViewProps) {
  if (buckets.length === 0 || buckets.every((b) => b.files.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Folder className="mb-3 size-10" />
        <p className="text-sm">No files found in any S3 bucket.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {buckets.map((bucket) => (
        <BucketFolderSection key={bucket.bucketId} bucket={bucket} />
      ))}
    </div>
  );
}

function BucketFolderSection({ bucket }: { bucket: BucketS3Data }) {
  const [expanded, setExpanded] = useState(true);
  const tree = buildTree(bucket.files);

  return (
    <div className="rounded-md border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 hover:bg-muted/50 text-left"
      >
        {expanded ? (
          <ChevronDown className="size-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 text-muted-foreground" />
        )}
        <Database className="size-4 text-primary" />
        <span className="text-sm font-semibold">{bucket.displayName}</span>
        <Badge variant="outline" className="text-[10px] ml-1">
          {bucket.totalFiles} files
        </Badge>
        <span className="text-xs text-muted-foreground ml-auto">
          {formatBytes(bucket.totalSize)}
        </span>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden border-t"
          >
            <div className="p-2 font-mono text-sm">
              {tree.children.map((child) => (
                <TreeNodeRow key={`${child.isFolder ? "dir" : "file"}:${child.path}`} node={child} depth={0} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
