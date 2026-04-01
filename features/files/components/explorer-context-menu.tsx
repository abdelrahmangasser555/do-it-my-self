// Right-click context menu for files and folders in the explorer
'use client';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Download,
  Trash2,
  Copy,
  ExternalLink,
  FolderPlus,
  FileUp,
  DollarSign,
  Share2,
} from 'lucide-react';

interface ExplorerContextMenuProps {
  children: React.ReactNode;
  type: 'file' | 'folder' | 'background';
  cdnUrl?: string;
  /** For folder type: display name shown in the header */
  folderName?: string;
  /** For folder type: total size of all files inside (bytes) */
  folderTotalSize?: number;
  /** For folder type: total file count inside */
  folderFileCount?: number;
  onDownload?: () => void;
  onDelete?: () => void;
  onCopyPath?: () => void;
  onCreateFolder?: () => void;
  onUpload?: () => void;
  onPredictCost?: () => void;
  onShare?: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}

export function ExplorerContextMenu({
  children,
  type,
  cdnUrl,
  folderName,
  folderTotalSize,
  folderFileCount,
  onDownload,
  onDelete,
  onCopyPath,
  onCreateFolder,
  onUpload,
  onPredictCost,
  onShare,
}: ExplorerContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        {type === 'background' && (
          <>
            {onCreateFolder && (
              <ContextMenuItem onClick={onCreateFolder}>
                <FolderPlus className="mr-2 size-3.5" /> New Folder
              </ContextMenuItem>
            )}
            {onUpload && (
              <ContextMenuItem onClick={onUpload}>
                <FileUp className="mr-2 size-3.5" /> Upload Files
              </ContextMenuItem>
            )}
          </>
        )}

        {type === 'file' && (
          <>
            {onDownload && (
              <ContextMenuItem onClick={onDownload}>
                <Download className="mr-2 size-3.5" /> Download
              </ContextMenuItem>
            )}
            {cdnUrl && (
              <ContextMenuItem onClick={() => window.open(cdnUrl, '_blank')}>
                <ExternalLink className="mr-2 size-3.5" /> Open CDN Link
              </ContextMenuItem>
            )}
            {onCopyPath && (
              <ContextMenuItem onClick={onCopyPath}>
                <Copy className="mr-2 size-3.5" /> Copy Path
              </ContextMenuItem>
            )}
            {onShare && (
              <ContextMenuItem onClick={onShare}>
                <Share2 className="mr-2 size-3.5" /> Share
              </ContextMenuItem>
            )}
            {onPredictCost && (
              <ContextMenuItem onClick={onPredictCost}>
                <DollarSign className="mr-2 size-3.5" /> Predict Cost
              </ContextMenuItem>
            )}
            <ContextMenuSeparator />
            {onDelete && (
              <ContextMenuItem variant="destructive" onClick={onDelete}>
                <Trash2 className="mr-2 size-3.5" /> Delete
              </ContextMenuItem>
            )}
          </>
        )}

        {type === 'folder' && (
          <>
            {/* Folder header with name + stats */}
            {folderName && (
              <>
                <ContextMenuLabel className="flex flex-col gap-0.5 py-1.5">
                  <span className="font-semibold text-foreground truncate max-w-44">
                    {folderName}
                  </span>
                  <span className="text-[10px] font-normal text-muted-foreground">
                    {folderFileCount ?? 0} files
                    {folderTotalSize !== undefined && folderTotalSize > 0
                      ? ` · ${formatBytes(folderTotalSize)}`
                      : ''}
                  </span>
                </ContextMenuLabel>
                <ContextMenuSeparator />
              </>
            )}
            {onCopyPath && (
              <ContextMenuItem onClick={onCopyPath}>
                <Copy className="mr-2 size-3.5" /> Copy Path
              </ContextMenuItem>
            )}
            {onShare && (
              <ContextMenuItem onClick={onShare}>
                <Share2 className="mr-2 size-3.5" /> Share Folder Link
              </ContextMenuItem>
            )}
            {onPredictCost && (
              <ContextMenuItem onClick={onPredictCost}>
                <DollarSign className="mr-2 size-3.5" /> Predict Cost
              </ContextMenuItem>
            )}
            {onCreateFolder && (
              <ContextMenuItem onClick={onCreateFolder}>
                <FolderPlus className="mr-2 size-3.5" /> New Subfolder
              </ContextMenuItem>
            )}
            {onUpload && (
              <ContextMenuItem onClick={onUpload}>
                <FileUp className="mr-2 size-3.5" /> Upload Here
              </ContextMenuItem>
            )}
            <ContextMenuSeparator />
            {onDelete && (
              <ContextMenuItem variant="destructive" onClick={onDelete}>
                <Trash2 className="mr-2 size-3.5" /> Delete Folder
              </ContextMenuItem>
            )}
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
