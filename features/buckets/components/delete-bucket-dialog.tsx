// Full bucket deletion dialog with step-by-step progress tracking
"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { Progress } from "@/components/ui/progress";
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
} from "lucide-react";
import type { Bucket, DeletionStep } from "@/lib/types";
import { cn } from "@/lib/utils";

const STEPS: { id: string; label: string; icon: React.ElementType }[] = [
  { id: "files", label: "Delete all files from S3", icon: FileX },
  { id: "cloudfront", label: "Remove CloudFront distribution", icon: Cloud },
  { id: "bucket", label: "Delete S3 bucket", icon: Database },
  { id: "metadata", label: "Clean up metadata", icon: HardDrive },
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
  const [deleting, setDeleting] = useState(false);
  const [steps, setSteps] = useState<Record<string, DeletionStep>>({});
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setDeleting(false);
    setSteps({});
    setComplete(false);
    setError(null);
  };

  const handleDelete = useCallback(async () => {
    if (!bucket) return;
    setDeleting(true);
    setError(null);
    setComplete(false);

    // Initialize steps
    const initial: Record<string, DeletionStep> = {};
    for (const s of STEPS) {
      initial[s.id] = { id: s.id, label: s.label, status: "pending" };
    }
    setSteps(initial);

    try {
      const res = await fetch(`/api/buckets?id=${bucket.id}&full=true`, {
        method: "DELETE",
      });

      if (!res.body) {
        throw new Error("No response stream");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.step === "complete") {
              if (msg.status === "done") setComplete(true);
              else setError(msg.error || "Deletion failed");
            } else {
              setSteps((prev) => ({
                ...prev,
                [msg.step]: {
                  id: msg.step,
                  label: prev[msg.step]?.label || msg.step,
                  status: msg.status,
                  error: msg.error,
                },
              }));
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deletion failed");
    } finally {
      setDeleting(false);
    }
  }, [bucket]);

  const progressPercent = (() => {
    const total = STEPS.length;
    const done = STEPS.filter(
      (s) => steps[s.id]?.status === "done" || steps[s.id]?.status === "error"
    ).length;
    return Math.round((done / total) * 100);
  })();

  const handleClose = () => {
    if (complete) onComplete();
    reset();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!deleting) { handleClose(); } }}>
      <AlertDialogContent className="sm:max-w-[480px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" />
            {complete ? "Bucket Deleted" : "Delete Bucket"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {!deleting && !complete && (
              <>
                This will <strong>permanently</strong> delete bucket{" "}
                <strong>{bucket?.name}</strong> including{" "}
                <strong>{fileCount}</strong> file(s), its CloudFront distribution,
                and the S3 bucket itself. This action cannot be undone.
              </>
            )}
            {deleting && "Deletion in progress…"}
            {complete && "All resources have been cleaned up."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Step tracker */}
        {(deleting || complete || error) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="space-y-3"
          >
            <Progress value={progressPercent} className="h-2" />
            <div className="space-y-2">
              {STEPS.map((step) => {
                const state = steps[step.id];
                const Icon = step.icon;
                return (
                  <div
                    key={step.id}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors",
                      state?.status === "done" && "border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/20",
                      state?.status === "error" && "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20",
                      state?.status === "running" && "border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/20"
                    )}
                  >
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1">{step.label}</span>
                    {state?.status === "running" && (
                      <Loader2 className="size-4 animate-spin text-blue-500" />
                    )}
                    {state?.status === "done" && (
                      <CheckCircle2 className="size-4 text-green-500" />
                    )}
                    {state?.status === "error" && (
                      <XCircle className="size-4 text-red-500" />
                    )}
                    {(!state || state.status === "pending") && (
                      <div className="size-4" />
                    )}
                  </div>
                );
              })}
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </motion.div>
        )}

        <AlertDialogFooter>
          {!deleting && !complete && (
            <>
              <AlertDialogCancel onClick={handleClose}>Cancel</AlertDialogCancel>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="mr-2 size-4" />
                Delete Everything
              </Button>
            </>
          )}
          {deleting && (
            <Button disabled variant="outline">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Deleting…
            </Button>
          )}
          {complete && (
            <Button onClick={handleClose}>Done</Button>
          )}
          {error && !deleting && !complete && (
            <Button onClick={handleClose}>Close</Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
