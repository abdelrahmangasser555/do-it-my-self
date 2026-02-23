// CloudFront Distributions management page
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import {
  Globe,
  RefreshCw,
  Trash2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2,
  Database,
  AlertTriangle,
  Server,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageTransition } from "@/components/page-transition";

interface LinkedBucket {
  id: string;
  name: string;
  s3BucketName: string;
  status: string;
}

interface Distribution {
  id: string;
  domainName: string;
  status: string;
  enabled: boolean;
  origins: string[];
  comment: string;
  lastModified: string;
  alternativeDomains: string[];
  priceClass: string;
  linkedBucket: LinkedBucket | null;
}

export default function DistributionsPage() {
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Distribution | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDistributions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/distributions");
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch distributions");
      }
      const data = await res.json();
      setDistributions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDistributions();
  }, [fetchDistributions]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/distributions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ distributionId: deleteTarget.id }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete");
      }
      toast.success(`Distribution ${deleteTarget.id} deletion started`);
      setDeleteTarget(null);
      fetchDistributions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const activeCount = distributions.filter((d) => d.enabled).length;
  const disabledCount = distributions.filter((d) => !d.enabled).length;

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Globe className="size-6 text-primary" />
              CloudFront Distributions
            </h1>
            <p className="text-muted-foreground mt-1">
              All CloudFront distributions in your AWS account.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDistributions}
            disabled={loading}
          >
            <RefreshCw className={`mr-1.5 size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Summary cards */}
        <motion.div
          className="grid gap-4 sm:grid-cols-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                Total Distributions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{distributions.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-green-500" /> Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{activeCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
                <XCircle className="size-3.5 text-red-500" /> Disabled
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">{disabledCount}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Distributions table */}
        <Card>
          <CardHeader>
            <CardTitle>All Distributions</CardTitle>
            <CardDescription>
              Distributions are linked to buckets when their domain matches your
              bucket configuration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Loading distributions...
                </span>
              </div>
            ) : error ? (
              <div className="py-8 text-center space-y-2">
                <AlertTriangle className="size-8 mx-auto text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
                <p className="text-xs text-muted-foreground">
                  Make sure your AWS credentials are configured and have
                  CloudFront read permissions.
                </p>
              </div>
            ) : distributions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Server className="mb-3 size-10" />
                <p className="text-sm">No CloudFront distributions found.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Origins</TableHead>
                    <TableHead>Linked Bucket</TableHead>
                    <TableHead>Last Modified</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {distributions.map((dist) => (
                      <motion.tr
                        key={dist.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
                        <TableCell className="font-mono text-xs">
                          {dist.id}
                        </TableCell>
                        <TableCell>
                          <a
                            href={`https://${dist.domainName}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm hover:underline flex items-center gap-1"
                          >
                            {dist.domainName}
                            <ExternalLink className="size-3" />
                          </a>
                          {dist.alternativeDomains.length > 0 && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              +{dist.alternativeDomains.length} alias(es)
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {dist.enabled ? (
                              <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                                <CheckCircle2 className="mr-1 size-3" />
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <XCircle className="mr-1 size-3" />
                                Disabled
                              </Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground">
                              {dist.status}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            {dist.origins.map((origin, i) => (
                              <p
                                key={i}
                                className="text-xs text-muted-foreground truncate max-w-[200px]"
                                title={origin}
                              >
                                {origin}
                              </p>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {dist.linkedBucket ? (
                            <Link
                              href={`/buckets/${dist.linkedBucket.id}`}
                              className="flex items-center gap-1.5 text-sm hover:underline"
                            >
                              <Database className="size-3.5 text-primary" />
                              {dist.linkedBucket.name}
                            </Link>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Not linked
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {dist.lastModified
                            ? new Date(dist.lastModified).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {!dist.enabled && (
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-7 gap-1"
                              onClick={() => setDeleteTarget(dist)}
                            >
                              <Trash2 className="size-3" /> Delete
                            </Button>
                          )}
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Delete confirmation dialog */}
        <AlertDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete CloudFront Distribution</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the distribution{" "}
                <span className="font-mono font-medium">
                  {deleteTarget?.id}
                </span>{" "}
                ({deleteTarget?.domainName}). This action cannot be undone.
                <br />
                <br />
                The distribution will be disabled first (if not already), then
                deleted once it reaches Deployed state. This may take several
                minutes.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? (
                  <>
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />{" "}
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-1.5 size-3.5" /> Delete Distribution
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageTransition>
  );
}
