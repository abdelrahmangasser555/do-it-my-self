// Right-click context menu for files and folders in the explorer
'use client';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Download, Trash2, Copy, ExternalLink, FolderPlus, FileUp, Info } from 'lucide-react';

interface ExplorerContextMenuProps {
  children: React.ReactNode;
  type: 'file' | 'folder' | 'background';
  cdnUrl?: string;
  onDownload?: () => void;
  onDelete?: () => void;
  onCopyPath?: () => void;
  onCreateFolder?: () => void;
  onUpload?: () => void;
  onViewInfo?: () => void;
}

export function ExplorerContextMenu({
  children,
  type,
  cdnUrl,
  onDownload,
  onDelete,
  onCopyPath,
  onCreateFolder,
  onUpload,
  onViewInfo,
}: ExplorerContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
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
            {onViewInfo && (
              <ContextMenuItem onClick={onViewInfo}>
                <Info className="mr-2 size-3.5" /> Properties
              </ContextMenuItem>
            )}
            <ContextMenuSeparator />
            {onDelete && (
              <ContextMenuItem className="text-destructive" onClick={onDelete}>
                <Trash2 className="mr-2 size-3.5" /> Delete
              </ContextMenuItem>
            )}
          </>
        )}
        {type === 'folder' && (
          <>
            {onCopyPath && (
              <ContextMenuItem onClick={onCopyPath}>
                <Copy className="mr-2 size-3.5" /> Copy Path
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
              <ContextMenuItem className="text-destructive" onClick={onDelete}>
                <Trash2 className="mr-2 size-3.5" /> Delete Folder
              </ContextMenuItem>
            )}
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
