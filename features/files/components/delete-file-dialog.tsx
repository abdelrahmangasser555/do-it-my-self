// File delete confirmation dialog with S3 + metadata cleanup
"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import type { FileRecord } from "@/lib/types";

interface DeleteFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: FileRecord | null;
  onConfirm: (id: string) => Promise<boolean>;
}

export function DeleteFileDialog({
  open,
  onOpenChange,
  file,
  onConfirm,
}: DeleteFileDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!file) return;
    setLoading(true);
    const success = await onConfirm(file.id);
    setLoading(false);
    if (success) onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete File</AlertDialogTitle>
          <AlertDialogDescription>
            This will delete the file from S3 and remove its metadata record.
            {file && (
              <span className="mt-1 block font-mono text-xs">
                {file.objectKey}
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 size-4" />
            )}
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
