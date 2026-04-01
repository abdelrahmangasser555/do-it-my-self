// Files page — Windows Explorer-style file browser
'use client';

import { PageTransition } from '@/components/page-transition';
import { FileExplorer } from '@/features/files/components/file-explorer';

export default function FilesPage() {
  return (
    <PageTransition>
      <div className="space-y-4">
        <FileExplorer />
      </div>
    </PageTransition>
  );
}
