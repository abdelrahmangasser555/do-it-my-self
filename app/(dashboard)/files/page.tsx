// Files page — Windows Explorer-style file browser
'use client';

import { PageTransition } from '@/components/page-transition';
import { FileExplorer } from '@/features/files/components/file-explorer';

export default function FilesPage() {
  return (
    <PageTransition>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Files</h1>
          <p className="text-muted-foreground">Browse and manage files across all S3 buckets.</p>
        </div>
        <FileExplorer />
      </div>
    </PageTransition>
  );
}
