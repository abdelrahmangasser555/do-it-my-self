// Bucket deletion dialog — uses global DeletionContext so deletion continues after dialog closes
'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  Database,
  Cloud,
  FileX,
  HardDrive,
} from 'lucide-react';
import type { Bucket } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useDeletion } from '@/lib/deletion-context';

const STEP_META: { id: string; label: string; icon: React.ElementType }[] = [
  { id: 'files', label: 'Delete all files from S3', icon: FileX },
  { id: 'cloudfront', label: 'Remove CloudFront distribution', icon: Cloud },
  { id: 'bucket', label: 'Delete S3 bucket', icon: Database },
  { id: 'metadata', label: 'Clean up metadata', icon: HardDrive },
];

interface DeleteBucketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bucket: Bucket | null;
  fileCount: number;
  onComplete: () => void;
}

export function DeleteBucketDialog({
  open,
  onOpenChange,
  bucket,
  fileCount,
  onComplete,
}: DeleteBucketDialogProps) {
  const { activeDeletions, startDeletion, clearDeletion } = useDeletion();

  const deletion = bucket ? activeDeletions[bucket.id] : null;
  const deleting = !!deletion && !deletion.complete && !deletion.error;
  const complete = !!deletion?.complete;
  const error = deletion?.error ?? null;

  // When deletion completes, call onComplete (e.g. to refetch)
  useEffect(() => {
    if (complete) {
      onComplete();
    }
  }, [complete]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = () => {
    if (!bucket) return;
    startDeletion(bucket, () => {
      // Background completion — onComplete called via useEffect above only if dialog is open
    });
  };

  const handleClose = () => {
    // If complete, clean up context entry
    if (complete && bucket) clearDeletion(bucket.id);
    onOpenChange(false);
  };

  const progressPercent = (() => {
    if (!deletion) return 0;
    const total = STEP_META.length;
    const done = STEP_META.filter(
      (s) => deletion.steps[s.id]?.status === 'done' || deletion.steps[s.id]?.status === 'error',
    ).length;
    return Math.round((done / total) * 100);
  })();

  return (
    <AlertDialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
    >
      <AlertDialogContent className="sm:max-w-120">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" />
            {complete ? 'Bucket Deleted' : 'Delete Bucket'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {!deletion && (
              <>
                This will <strong>permanently</strong> delete bucket <strong>{bucket?.name}</strong>{' '}
                including <strong>{fileCount}</strong> file(s), its CloudFront distribution, and the
                S3 bucket itself. This cannot be undone.
              </>
            )}
            {deleting && (
              <>
                Deletion in progress — you can close this dialog and it will continue in the
                background.
              </>
            )}
            {complete && 'All resources have been cleaned up.'}
            {error && !complete && 'Deletion encountered an error.'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Step tracker */}
        {deletion && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-3"
          >
            <Progress value={progressPercent} className="h-2" />
            <div className="space-y-2">
              {STEP_META.map((step) => {
                const state = deletion.steps[step.id];
                const Icon = step.icon;
                const isCFRunning = step.id === 'cloudfront' && state?.status === 'running';
                return (
                  <div
                    key={step.id}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors',
                      state?.status === 'done' &&
                        'border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/20',
                      state?.status === 'error' &&
                        'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20',
                      state?.status === 'running' &&
                        'border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/20',
                    )}
                  >
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1 space-y-1">
                      <span>{step.label}</span>
                      {isCFRunning && (
                        <div className="h-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-400 transition-all duration-1000"
                            style={{ width: `${deletion.cloudfrontFakeProgress}%` }}
                          />
                        </div>
                      )}
                    </div>
                    {state?.status === 'running' && (
                      <Loader2 className="size-4 animate-spin text-blue-500" />
                    )}
                    {state?.status === 'done' && <CheckCircle2 className="size-4 text-green-500" />}
                    {state?.status === 'error' && <XCircle className="size-4 text-red-500" />}
                    {(!state || state.status === 'pending') && <div className="size-4" />}
                  </div>
                );
              })}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </motion.div>
        )}

        <AlertDialogFooter>
          {!deletion && (
            <>
              <AlertDialogCancel onClick={handleClose}>Cancel</AlertDialogCancel>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="mr-2 size-4" />
                Delete Everything
              </Button>
            </>
          )}
          {deleting && (
            <Button variant="outline" onClick={handleClose}>
              Close (runs in background)
            </Button>
          )}
          {(complete || (error && !deleting)) && <Button onClick={handleClose}>Done</Button>}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
