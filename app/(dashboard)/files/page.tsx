// Files listing page with global view of all uploaded files
"use client";

import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTransition } from "@/components/page-transition";
import { FilesTable } from "@/features/files/components/files-table";
import { useFiles, useDeleteFile } from "@/features/files/hooks/use-files";

export default function FilesPage() {
  const { files, loading, refetch } = useFiles();
  const { deleteFile } = useDeleteFile();

  const handleDelete = async (id: string) => {
    const success = await deleteFile(id);
    if (success) {
      toast.success("File record deleted");
      refetch();
    } else {
      toast.error("Failed to delete file");
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Files</h1>
          <p className="text-muted-foreground">
            All file metadata records across all projects.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Files ({files.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            ) : (
              <FilesTable files={files} onDelete={handleDelete} />
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
