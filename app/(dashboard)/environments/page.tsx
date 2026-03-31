// Environments management dashboard — activate / deactivate AWS regions
'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trash2,
  CheckCircle,
  Loader2,
  Wrench,
  Search,
  Package,
  CloudUpload,
  XCircle,
  Rocket,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { PageTransition } from '@/components/page-transition';
import { EnvironmentsMap } from '@/features/environments/components/environments-map';
import { AWS_REGIONS } from '@/lib/validations';
import {
  useEnvironments,
  useBootstrapEnvironment,
  type BootstrapProgress,
} from '@/features/environments/hooks/use-environments';
import { diagnoseBootstrapError } from '@/features/onboarding/utils/error-diagnosis';
import type { BootstrappedEnvironment, Bucket } from '@/lib/types';

// ── Phase config for bootstrap progress ──────────────────────────────────────

const phaseConfig: Record<
  BootstrapProgress['phase'],
  { icon: typeof Search; label: string; color: string }
> = {
  checking: { icon: Search, label: 'Checking', color: 'text-blue-500' },
  repairing: { icon: Wrench, label: 'Repairing', color: 'text-orange-500' },
  installing: { icon: Package, label: 'Installing', color: 'text-yellow-500' },
  bootstrapping: { icon: CloudUpload, label: 'Bootstrapping', color: 'text-purple-500' },
  done: { icon: CheckCircle, label: 'Complete', color: 'text-green-500' },
  error: { icon: XCircle, label: 'Error', color: 'text-red-500' },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const regionLabel = (value: string) => AWS_REGIONS.find((r) => r.value === value)?.label ?? value;

// ── Main component ───────────────────────────────────────────────────────────

export default function EnvironmentsPage() {
  const { environments, loading, refetch } = useEnvironments();
  const {
    bootstrapEnvironment,
    loading: bootstrapping,
    error: bootstrapError,
    lastErrorOutput,
    progress,
  } = useBootstrapEnvironment();

  const [accountId, setAccountId] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<BootstrappedEnvironment | null>(null);
  const [copiedError, setCopiedError] = useState(false);
  const [buckets, setBuckets] = useState<Bucket[]>([]);

  // Auto-fill AWS account ID from local credentials
  useEffect(() => {
    if (!accountId) {
      fetch('/api/aws-identity')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.account) setAccountId(data.account);
        })
        .catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch buckets for region distribution
  useEffect(() => {
    fetch('/api/buckets')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setBuckets(data))
      .catch(() => {});
  }, []);

  const bucketsByRegion = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of buckets) {
      if (b.status === 'active') {
        map.set(b.region, (map.get(b.region) || 0) + 1);
      }
    }
    return Array.from(map.entries()).map(([region, count]) => ({ region, count }));
  }, [buckets]);

  const usedRegions = new Set(environments.map((e) => e.region));
  const availableRegions = AWS_REGIONS.filter((r) => !usedRegions.has(r.value));

  const handleBootstrapRegion = useCallback(
    async (region: string) => {
      if (!accountId) {
        toast.error('AWS Account ID is missing. Configure credentials first.');
        return;
      }
      const label = AWS_REGIONS.find((r) => r.value === region)?.label ?? region;
      await bootstrapEnvironment(region, accountId, label);
      await refetch();
    },
    [accountId, bootstrapEnvironment, refetch],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/environments?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Environment removed');
        await refetch();
      } else {
        toast.error('Failed to remove environment');
      }
      setDeleteTarget(null);
    },
    [refetch],
  );

  // Build the phase order dynamically for progress display
  const phaseOrder: BootstrapProgress['phase'][] =
    progress?.phase === 'repairing'
      ? ['checking', 'repairing', 'installing', 'bootstrapping', 'done']
      : ['checking', 'installing', 'bootstrapping', 'done'];

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* ── World Map ─────────────────────────────────────────────── */}
        <EnvironmentsMap
          environments={environments}
          bucketsByRegion={bucketsByRegion}
          loading={loading}
          bootstrapping={bootstrapping}
          onActivate={handleBootstrapRegion}
          onRemove={async (id) => {
            const env = environments.find((e) => e.id === id);
            if (env) setDeleteTarget(env);
          }}
          onRefresh={() => refetch()}
          availableRegions={availableRegions as unknown as typeof AWS_REGIONS}
          accountId={accountId}
        />

        {/* ── Live Bootstrap Progress Panel ─────────────────────────── */}
        <AnimatePresence>
          {progress && bootstrapping && (
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.25 }}
            >
              <Card className="border-primary/30 shadow-sm shadow-primary/5">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                        <Rocket className="size-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-sm">
                          Bootstrapping {regionLabel(progress.region)}
                        </CardTitle>
                        <CardDescription className="text-xs">{progress.message}</CardDescription>
                      </div>
                    </div>
                    <Badge
                      className={`text-xs ${
                        progress.phase === 'done'
                          ? 'bg-green-500/10 text-green-500 border-green-500/20'
                          : progress.phase === 'error'
                            ? 'bg-red-500/10 text-red-500 border-red-500/20'
                            : progress.phase === 'repairing'
                              ? 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                              : 'bg-primary/10 text-primary border-primary/20'
                      }`}
                    >
                      {phaseConfig[progress.phase].label}
                    </Badge>
                  </div>
                </CardHeader>
                <Separator />
                <CardContent className="pt-4 space-y-3">
                  {/* Phase steps */}
                  <div className="space-y-1.5">
                    {phaseOrder.map((phase) => {
                      const config = phaseConfig[phase];
                      const Icon = config.icon;
                      const currentIdx = phaseOrder.indexOf(
                        progress.phase as (typeof phaseOrder)[number],
                      );
                      const thisIdx = phaseOrder.indexOf(phase);
                      const isActive = progress.phase === phase;
                      const isComplete =
                        currentIdx > thisIdx || (progress.phase === 'done' && phase === 'done');
                      const isPending = currentIdx < thisIdx;

                      return (
                        <div
                          key={phase}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-200 ${
                            isActive
                              ? 'bg-primary/5 ring-1 ring-primary/20'
                              : isComplete
                                ? 'opacity-50'
                                : 'opacity-25'
                          }`}
                        >
                          {isActive && progress.phase !== 'done' ? (
                            <Loader2 className={`size-4 animate-spin ${config.color}`} />
                          ) : isComplete ? (
                            <CheckCircle className="size-4 text-green-500" />
                          ) : (
                            <Icon
                              className={`size-4 ${isPending ? 'text-muted-foreground' : config.color}`}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-xs font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}
                            >
                              {phase === 'checking' && 'Checking existing bootstrap'}
                              {phase === 'repairing' && 'Repairing broken stack'}
                              {phase === 'installing' && 'Installing CDK dependencies'}
                              {phase === 'bootstrapping' && 'Bootstrapping AWS environment'}
                              {phase === 'done' && 'Bootstrap complete'}
                            </p>
                            {isActive && progress.detail && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {progress.detail}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Progress bar */}
                  {progress.phase !== 'done' && progress.phase !== 'error' && (
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-linear-to-r from-primary/80 to-primary"
                        initial={{ width: '0%' }}
                        animate={{
                          width:
                            progress.phase === 'checking'
                              ? '10%'
                              : progress.phase === 'repairing'
                                ? '25%'
                                : progress.phase === 'installing'
                                  ? '50%'
                                  : '80%',
                        }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Error Diagnosis Panel ─────────────────────────────────── */}
        <AnimatePresence>
          {bootstrapError && !bootstrapping && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-3"
            >
              {(() => {
                const diagnosis = diagnoseBootstrapError(lastErrorOutput || bootstrapError);
                return (
                  <Alert variant="destructive">
                    <AlertTriangle className="size-4" />
                    <AlertDescription className="space-y-3">
                      <div>
                        <p className="font-medium">{diagnosis.title}</p>
                        <p className="text-sm mt-1 opacity-90">{diagnosis.description}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium">How to fix:</p>
                        <ol className="list-decimal list-inside text-xs space-y-1 opacity-90">
                          {diagnosis.fixSteps.map((step, i) => (
                            <li key={i}>{step}</li>
                          ))}
                        </ol>
                      </div>
                      {diagnosis.docsUrl && (
                        <a
                          href={diagnosis.docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs underline opacity-90 hover:opacity-100"
                        >
                          <ExternalLink className="size-3" />
                          View documentation
                        </a>
                      )}
                    </AlertDescription>
                  </Alert>
                );
              })()}

              {lastErrorOutput && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">Raw Error Output</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        navigator.clipboard.writeText(lastErrorOutput);
                        setCopiedError(true);
                        setTimeout(() => setCopiedError(false), 1500);
                      }}
                    >
                      {copiedError ? (
                        <Check className="mr-1 size-3 text-green-500" />
                      ) : (
                        <Copy className="mr-1 size-3" />
                      )}
                      {copiedError ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                  <ScrollArea className="max-h-32 rounded-lg bg-muted/50 p-3 overflow-auto">
                    <pre className="font-mono text-xs text-red-400 whitespace-pre-wrap break-all">
                      {lastErrorOutput}
                    </pre>
                  </ScrollArea>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Delete Confirmation ───────────────────────────────────── */}
        <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trash2 className="size-4 text-destructive" />
                Remove Environment
              </DialogTitle>
              <DialogDescription>
                Remove <strong>{deleteTarget?.alias || deleteTarget?.region}</strong> from your
                tracked environments? This does <strong>not</strong> destroy the CDKToolkit stack in
                AWS.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteTarget && handleDelete(deleteTarget.id)}
              >
                <Trash2 className="mr-2 size-4" />
                Remove
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}
