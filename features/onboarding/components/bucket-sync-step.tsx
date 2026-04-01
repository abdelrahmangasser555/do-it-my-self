// Onboarding step — Sync existing AWS S3 buckets to your environment
'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cloud,
  Database,
  Loader2,
  Download,
  CheckCircle2,
  Globe,
  RefreshCw,
  Search,
  ArrowRight,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface AwsBucketInfo {
  name: string;
  creationDate: string;
  region: string;
  cloudFrontDomain?: string | null;
  cloudFrontDistributionId?: string | null;
}

export function BucketSyncStep() {
  const [awsBuckets, setAwsBuckets] = useState<AwsBucketInfo[]>([]);
  const [trackedNames, setTrackedNames] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [awsRes, localRes] = await Promise.all([
        fetch('/api/buckets/aws'),
        fetch('/api/buckets'),
      ]);

      if (!awsRes.ok) {
        const data = await awsRes.json();
        throw new Error(data.error || 'Failed to list AWS buckets');
      }

      const awsData: AwsBucketInfo[] = await awsRes.json();
      setAwsBuckets(awsData);

      if (localRes.ok) {
        const localData = await localRes.json();
        setTrackedNames(new Set(localData.map((b: { s3BucketName: string }) => b.s3BucketName)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = awsBuckets.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.region.toLowerCase().includes(search.toLowerCase()),
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
    try {
      const res = await fetch('/api/buckets/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buckets: toImport }),
      });
      if (res.ok) {
        const data = await res.json();
        const count = data.imported as number;
        setImportedCount((prev) => prev + count);
        toast.success(`Imported ${count} bucket${count !== 1 ? 's' : ''}`);
        setSelected(new Set());
        await fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Import failed');
      }
    } catch {
      toast.error('Failed to import buckets');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card className="rounded-xl border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-sm font-bold text-primary">
            5
          </div>
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Cloud className="size-4 text-primary" />
              Sync Existing Buckets
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Import AWS S3 buckets already in your account
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {importedCount > 0 && (
            <Badge className="gap-1 bg-green-500/10 text-green-500 border-green-500/20 text-xs">
              <CheckCircle2 className="size-3" />
              {importedCount} imported
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            Optional
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="px-6 pb-6 space-y-4">
        <Alert>
          <Info className="size-4" />
          <AlertDescription className="text-xs">
            If you already have S3 buckets in your AWS account, you can import them here to manage
            them from DropOut. This step is optional — you can always import buckets later from the
            Buckets page.
          </AlertDescription>
        </Alert>

        {/* Search + Refresh */}
        <div className="flex gap-2">
          <div className="flex flex-1 items-center rounded-md border border-input bg-transparent shadow-xs">
            <Search className="ml-3 size-4 text-muted-foreground shrink-0" />
            <Input
              placeholder="Search by name or region…"
              className="border-0 shadow-none focus-visible:ring-0"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Stats */}
        {awsBuckets.length > 0 && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Database className="size-3.5" />
              {awsBuckets.length} total
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="size-3.5 text-green-500" />
              {awsBuckets.filter((b) => trackedNames.has(b.name)).length} tracked
            </span>
            <span className="flex items-center gap-1">
              <Cloud className="size-3.5 text-yellow-500" />
              {awsBuckets.filter((b) => !trackedNames.has(b.name)).length} untracked
            </span>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Listing S3 buckets…</span>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Untracked */}
            {untrackedFiltered.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">
                    Untracked Buckets ({untrackedFiltered.length})
                  </h4>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={toggleAll}>
                    {selected.size === untrackedFiltered.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead className="text-xs">Name</TableHead>
                        <TableHead className="text-xs">Region</TableHead>
                        <TableHead className="text-xs">CDN</TableHead>
                        <TableHead className="text-xs">Created</TableHead>
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
                            <TableCell className="font-mono text-xs">{b.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                <Globe className="mr-1 size-3" />
                                {b.region}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {b.cloudFrontDomain ? (
                                <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs">
                                  <Cloud className="mr-1 size-3" />
                                  CDN
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {b.creationDate ? new Date(b.creationDate).toLocaleDateString() : '—'}
                            </TableCell>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Already tracked */}
            {trackedFiltered.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Already Tracked ({trackedFiltered.length})
                </h4>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableBody>
                      {trackedFiltered.map((b) => (
                        <TableRow key={b.name} className="opacity-60">
                          <TableCell className="font-mono text-xs">{b.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              <Globe className="mr-1 size-3" />
                              {b.region}
                            </Badge>
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
                <Database className="mb-3 size-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  {search
                    ? 'No buckets match your search'
                    : 'No S3 buckets found in your AWS account'}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  You can create buckets from the dashboard after setup
                </p>
              </div>
            )}
          </div>
        )}

        {/* Import action */}
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-end"
          >
            <Button onClick={handleImport} disabled={importing} size="sm">
              {importing ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Download className="mr-2 size-4" />
              )}
              Import {selected.size} Bucket{selected.size > 1 ? 's' : ''}
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
