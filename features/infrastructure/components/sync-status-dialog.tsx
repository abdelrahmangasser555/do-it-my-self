// Sync status dialog — check AWS state and show sync options
"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Cloud,
  Database,
  Globe,
  Loader2,
  RotateCcw,
  ArrowUpCircle,
  Trash2,
  Rocket,
} from "lucide-react";
import { useSyncStatus } from "@/features/infrastructure/hooks/use-sync-status";
import type { BucketSyncStatus } from "@/lib/types";

interface SyncStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bucketId?: string;
  onSynced: () => void;
}

const stackStatusColors: Record<string, string> = {
  CREATE_COMPLETE: "default",
  UPDATE_COMPLETE: "default",
  DELETE_COMPLETE: "secondary",
  CREATE_IN_PROGRESS: "outline",
  UPDATE_IN_PROGRESS: "outline",
  DELETE_IN_PROGRESS: "outline",
  CREATE_FAILED: "destructive",
  UPDATE_FAILED: "destructive",
  ROLLBACK_COMPLETE: "destructive",
  ROLLBACK_IN_PROGRESS: "outline",
};

function StatusIcon({ status }: { status?: string }) {
  if (!status) return <XCircle className="size-4 text-muted-foreground" />;
  if (status.includes("COMPLETE") && !status.includes("ROLLBACK") && !status.includes("DELETE"))
    return <CheckCircle2 className="size-4 text-green-500" />;
  if (status.includes("FAILED") || status.includes("ROLLBACK"))
    return <XCircle className="size-4 text-destructive" />;
  if (status.includes("IN_PROGRESS"))
    return <Loader2 className="size-4 animate-spin text-primary" />;
  return <AlertTriangle className="size-4 text-yellow-500" />;
}

function getActionLabel(action?: BucketSyncStatus["recommendedAction"]): string {
  switch (action) {
    case "update-to-active":
      return "Mark as Active";
    case "update-to-failed":
      return "Mark as Failed";
    case "update-to-pending":
      return "Reset to Pending";
    case "cleanup":
      return "Clean Up Resources";
    default:
      return "No Action Needed";
  }
}

function getActionIcon(action?: BucketSyncStatus["recommendedAction"]) {
  switch (action) {
    case "update-to-active":
      return <ArrowUpCircle className="mr-2 size-4" />;
    case "update-to-failed":
      return <XCircle className="mr-2 size-4" />;
    case "update-to-pending":
      return <RotateCcw className="mr-2 size-4" />;
    case "cleanup":
      return <Trash2 className="mr-2 size-4" />;
    default:
      return null;
  }
}

export function SyncStatusDialog({
  open,
  onOpenChange,
  bucketId,
  onSynced,
}: SyncStatusDialogProps) {
  const { loading, checkBucketStatus, syncAll, applySync } = useSyncStatus();
  const [results, setResults] = useState<BucketSyncStatus[]>([]);
  const [checking, setChecking] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);

  const handleCheck = useCallback(async () => {
    setChecking(true);
    if (bucketId) {
      const result = await checkBucketStatus(bucketId);
      if (result) setResults([result]);
    } else {
      const allResults = await syncAll();
      setResults(allResults);
    }
    setChecking(false);
  }, [bucketId, checkBucketStatus, syncAll]);

  useEffect(() => {
    if (open) {
      handleCheck();
    } else {
      setResults([]);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApplyAction = async (
    bId: string,
    action: string
  ) => {
    setApplying(bId);
    const success = await applySync(bId, action);
    if (success) {
      // Refresh status
      await handleCheck();
      onSynced();
    }
    setApplying(null);
  };

  const handleRollback = async (bId: string) => {
    setApplying(bId);
    const success = await applySync(bId, "rollback");
    if (success) {
      await handleCheck();
      onSynced();
    }
    setApplying(null);
  };

  const syncedCount = results.filter((r) => !r.needsSync).length;
  const totalCount = results.length;
  const progressPercent = totalCount > 0 ? (syncedCount / totalCount) * 100 : 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className=" w-fit min-w-fit md:max-w-fit max:max-w-fit max-h-[80vh] overflow-y-auto no-scrollbar ">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RefreshCw className={`size-5 ${checking ? "animate-spin" : ""}`} />
            {bucketId ? "Check Bucket Status" : "Sync All Buckets with AWS"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {bucketId
              ? "Verifying the bucket's actual state against AWS CloudFormation and S3."
              : "Checking all buckets against their AWS CloudFormation stacks."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {checking && results.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">
              Querying AWS...
            </span>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {!bucketId && results.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {syncedCount}/{totalCount} in sync
                    </span>
                    <span className="text-muted-foreground">
                      {results.filter((r) => r.needsSync).length} need attention
                    </span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                </div>
              )}

              {results.map((result) => (
                <motion.div
                  key={result.bucketId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border p-4 space-y-3"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="size-4 text-primary" />
                      <span className="font-medium">{result.bucketName}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {result.s3BucketName}
                      </span>
                    </div>
                    {result.needsSync ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="size-3" />
                        Out of Sync
                      </Badge>
                    ) : (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle2 className="size-3" />
                        In Sync
                      </Badge>
                    )}
                  </div>

                  {/* Status grid */}
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Local Status</p>
                      <Badge variant="outline">{result.localStatus}</Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">CloudFormation</p>
                      <div className="flex items-center gap-1">
                        <StatusIcon status={result.stackStatus} />
                        <span className="text-xs">
                          {result.stackStatus || "No Stack"}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">S3 Bucket</p>
                      <div className="flex items-center gap-1">
                        {result.s3BucketExists ? (
                          <CheckCircle2 className="size-3.5 text-green-500" />
                        ) : (
                          <XCircle className="size-3.5 text-muted-foreground" />
                        )}
                        <span className="text-xs">
                          {result.s3BucketExists ? "Exists" : "Not Found"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Resources table (collapsible) */}
                  {result.resources.length > 0 && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                        {result.resources.length} AWS Resources
                      </summary>
                      <Table className="mt-2">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Resource</TableHead>
                            <TableHead className="text-xs">Type</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {result.resources.map((r) => (
                            <TableRow key={r.logicalId}>
                              <TableCell className="text-xs font-mono py-1">
                                {r.logicalId}
                              </TableCell>
                              <TableCell className="text-xs py-1">
                                {r.type.replace("AWS::", "")}
                              </TableCell>
                              <TableCell className="py-1">
                                <div className="flex items-center gap-1">
                                  <StatusIcon status={r.status} />
                                  <span className="text-xs">{r.status}</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </details>
                  )}

                  {/* Actions */}
                  {result.needsSync && (
                    <div className="flex items-center gap-2 pt-1">
                      {result.recommendedAction && (
                        <Button
                          size="sm"
                          onClick={() =>
                            handleApplyAction(
                              result.bucketId,
                              result.recommendedAction!
                            )
                          }
                          disabled={applying === result.bucketId}
                        >
                          {applying === result.bucketId ? (
                            <Loader2 className="mr-2 size-3.5 animate-spin" />
                          ) : (
                            getActionIcon(result.recommendedAction)
                          )}
                          {getActionLabel(result.recommendedAction)}
                        </Button>
                      )}
                      {result.stackExists && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRollback(result.bucketId)}
                          disabled={applying === result.bucketId}
                        >
                          {applying === result.bucketId ? (
                            <Loader2 className="mr-2 size-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="mr-2 size-3.5" />
                          )}
                          Rollback & Delete Stack
                        </Button>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleCheck} disabled={checking}>
            {checking ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 size-4" />
            )}
            Re-check
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
