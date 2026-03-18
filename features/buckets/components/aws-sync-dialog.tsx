// Dialog for discovering and importing real S3 buckets from AWS
"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  Search,
  Cloud,
  Database,
  Loader2,
  Download,
  CheckCircle2,
  Globe,
} from "lucide-react";
import type { Bucket } from "@/lib/types";

interface AwsBucketInfo {
  name: string;
  creationDate: string;
  region: string;
}

interface AwsSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackedBuckets: Bucket[];
  onImport: (buckets: AwsBucketInfo[]) => void;
}

export function AwsSyncDialog({
  open,
  onOpenChange,
  trackedBuckets,
  onImport,
}: AwsSyncDialogProps) {
  const [awsBuckets, setAwsBuckets] = useState<AwsBucketInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  const trackedNames = new Set(trackedBuckets.map((b) => b.s3BucketName));

  const fetchBuckets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/buckets/aws");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch AWS buckets");
      }
      const data: AwsBucketInfo[] = await res.json();
      setAwsBuckets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchBuckets();
      setSelected(new Set());
      setSearch("");
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = awsBuckets.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.region.toLowerCase().includes(search.toLowerCase())
  );

  const untrackedFiltered = filtered.filter((b) => !trackedNames.has(b.name));
  const trackedFiltered = filtered.filter((b) => trackedNames.has(b.name));

  const toggleSelect = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === untrackedFiltered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(untrackedFiltered.map((b) => b.name)));
    }
  };

  const handleImport = async () => {
    const toImport = awsBuckets.filter((b) => selected.has(b.name));
    if (toImport.length === 0) return;
    setImporting(true);
    onImport(toImport);
    setImporting(false);
    setSelected(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="size-5 text-primary" />
            Discover AWS S3 Buckets
          </DialogTitle>
          <DialogDescription>
            Lists all S3 buckets in your AWS account. Import untracked buckets to
            manage them here.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by bucket name or region…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Database className="size-3.5" />
            {awsBuckets.length} total buckets
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="size-3.5 text-green-500" />
            {awsBuckets.filter((b) => trackedNames.has(b.name)).length} tracked
          </span>
          <span className="flex items-center gap-1">
            <Cloud className="size-3.5 text-yellow-500" />
            {awsBuckets.filter((b) => !trackedNames.has(b.name)).length}{" "}
            untracked
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">
              Listing S3 buckets from AWS…
            </span>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Untracked buckets */}
            {untrackedFiltered.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">
                    Untracked Buckets ({untrackedFiltered.length})
                  </h3>
                  <Button variant="ghost" size="sm" onClick={toggleAll}>
                    {selected.size === untrackedFiltered.length
                      ? "Deselect All"
                      : "Select All"}
                  </Button>
                </div>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Region</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {untrackedFiltered.map((b) => (
                          <motion.tr
                            key={b.name}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="border-b last:border-0 cursor-pointer hover:bg-muted/50"
                            onClick={() => toggleSelect(b.name)}
                          >
                            <TableCell>
                              <Checkbox
                                checked={selected.has(b.name)}
                                onCheckedChange={() => toggleSelect(b.name)}
                              />
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {b.name}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                <Globe className="mr-1 size-3" />
                                {b.region}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {b.creationDate
                                ? new Date(b.creationDate).toLocaleDateString()
                                : "—"}
                            </TableCell>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Already tracked buckets */}
            {trackedFiltered.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Already Tracked ({trackedFiltered.length})
                </h3>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Region</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-20">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trackedFiltered.map((b) => (
                        <TableRow key={b.name} className="opacity-60">
                          <TableCell className="font-mono text-sm">
                            {b.name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              <Globe className="mr-1 size-3" />
                              {b.region}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {b.creationDate
                              ? new Date(b.creationDate).toLocaleDateString()
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
                              <CheckCircle2 className="mr-1 size-3" />
                              Tracked
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {filtered.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Database className="mb-3 size-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {search
                    ? "No buckets match your search"
                    : "No S3 buckets found in your AWS account"}
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            variant="outline"
            onClick={fetchBuckets}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {selected.size > 0 && (
            <Button onClick={handleImport} disabled={importing}>
              {importing ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Download className="mr-2 size-4" />
              )}
              Import {selected.size} Bucket{selected.size > 1 ? "s" : ""}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
