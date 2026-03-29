// Environments management dashboard — activate / deactivate AWS regions
"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2,
  MapPin,
  Shield,
  Clock,
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
  Server,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PageTransition } from "@/components/page-transition";
import { AWS_REGIONS } from "@/lib/validations";
import {
  useEnvironments,
  useBootstrapEnvironment,
  type BootstrapProgress,
} from "@/features/environments/hooks/use-environments";
import { diagnoseBootstrapError } from "@/features/onboarding/utils/error-diagnosis";
import type { BootstrappedEnvironment } from "@/lib/types";

// ── Phase config for bootstrap progress ──────────────────────────────────────

const phaseConfig: Record<
  BootstrapProgress["phase"],
  { icon: typeof Search; label: string; color: string }
> = {
  checking: { icon: Search, label: "Checking", color: "text-blue-500" },
  repairing: { icon: Wrench, label: "Repairing", color: "text-orange-500" },
  installing: { icon: Package, label: "Installing", color: "text-yellow-500" },
  bootstrapping: { icon: CloudUpload, label: "Bootstrapping", color: "text-purple-500" },
  done: { icon: CheckCircle, label: "Complete", color: "text-green-500" },
  error: { icon: XCircle, label: "Error", color: "text-red-500" },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const regionLabel = (value: string) =>
  AWS_REGIONS.find((r) => r.value === value)?.label ?? value;

// ── Region groups for the select dropdown ────────────────────────────────────

const REGION_GROUPS = [
  { label: "North America", prefix: ["us-", "ca-"] },
  { label: "Europe", prefix: ["eu-"] },
  { label: "Asia Pacific", prefix: ["ap-"] },
  { label: "South America", prefix: ["sa-"] },
  { label: "Middle East & Africa", prefix: ["me-", "af-", "il-"] },
];

function groupRegions(regions: typeof AWS_REGIONS) {
  return REGION_GROUPS.map((g) => ({
    ...g,
    regions: regions.filter((r) =>
      g.prefix.some((p) => r.value.startsWith(p)),
    ),
  })).filter((g) => g.regions.length > 0);
}

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

  const [addOpen, setAddOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [accountId, setAccountId] = useState("");
  const [deleteTarget, setDeleteTarget] =
    useState<BootstrappedEnvironment | null>(null);
  const [copiedError, setCopiedError] = useState(false);

  // Auto-fill AWS account ID from local credentials
  useEffect(() => {
    if (!accountId) {
      fetch("/api/aws-identity")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.account) setAccountId(data.account);
        })
        .catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const usedRegions = new Set(environments.map((e) => e.region));
  const availableRegions = AWS_REGIONS.filter((r) => !usedRegions.has(r.value));
  const groupedAvailable = groupRegions(
    availableRegions as unknown as typeof AWS_REGIONS,
  );

  const activeCount = environments.filter((e) => e.status === "active").length;
  const failedCount = environments.filter((e) => e.status === "failed").length;
  const bootstrappingCount = environments.filter(
    (e) => e.status === "bootstrapping",
  ).length;

  const handleBootstrap = useCallback(async () => {
    if (!selectedRegion || !accountId) {
      toast.error("Region and Account ID are required");
      return;
    }
    const label =
      AWS_REGIONS.find((r) => r.value === selectedRegion)?.label ??
      selectedRegion;
    setAddOpen(false);
    await bootstrapEnvironment(selectedRegion, accountId, label);
    await refetch();
    setSelectedRegion("");
  }, [selectedRegion, accountId, bootstrapEnvironment, refetch]);

  const handleRetry = useCallback(
    async (env: BootstrappedEnvironment) => {
      await bootstrapEnvironment(env.region, env.accountId, env.alias);
      await refetch();
    },
    [bootstrapEnvironment, refetch],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/environments?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Environment removed");
        await refetch();
      } else {
        toast.error("Failed to remove environment");
      }
      setDeleteTarget(null);
    },
    [refetch],
  );

  // Build the phase order dynamically for progress display
  const phaseOrder: BootstrapProgress["phase"][] =
    progress?.phase === "repairing"
      ? ["checking", "repairing", "installing", "bootstrapping", "done"]
      : ["checking", "installing", "bootstrapping", "done"];

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* ── Header ────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Globe className="size-6 text-primary" />
              Environments
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage bootstrapped AWS regions for bucket deployments
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => refetch()}
                    disabled={loading}
                  >
                    <RefreshCw
                      className={`size-4 ${loading ? "animate-spin" : ""}`}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh environments</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button onClick={() => setAddOpen(true)} disabled={bootstrapping}>
              <Plus className="mr-2 size-4" />
              Add Region
            </Button>
          </div>
        </div>

        {/* ── Stats ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent pointer-events-none" />
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10">
                <Server className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight">
                  {environments.length}
                </p>
                <p className="text-xs text-muted-foreground">Total Regions</p>
              </div>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-br from-green-500/5 to-transparent pointer-events-none" />
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex size-11 items-center justify-center rounded-xl bg-green-500/10">
                <CheckCircle className="size-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight text-green-600 dark:text-green-400">
                  {activeCount}
                </p>
                <p className="text-xs text-muted-foreground">
                  Active &amp; Ready
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-br from-red-500/5 to-transparent pointer-events-none" />
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex size-11 items-center justify-center rounded-xl bg-red-500/10">
                <AlertCircle className="size-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight text-red-600 dark:text-red-400">
                  {failedCount}
                </p>
                <p className="text-xs text-muted-foreground">
                  {failedCount === 1 ? "Needs Attention" : "Need Attention"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

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
                          Bootstrapping{" "}
                          {regionLabel(progress.region)}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {progress.message}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge
                      className={`text-xs ${
                        progress.phase === "done"
                          ? "bg-green-500/10 text-green-500 border-green-500/20"
                          : progress.phase === "error"
                            ? "bg-red-500/10 text-red-500 border-red-500/20"
                            : progress.phase === "repairing"
                              ? "bg-orange-500/10 text-orange-500 border-orange-500/20"
                              : "bg-primary/10 text-primary border-primary/20"
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
                        progress.phase as typeof phaseOrder[number],
                      );
                      const thisIdx = phaseOrder.indexOf(phase);
                      const isActive = progress.phase === phase;
                      const isComplete =
                        currentIdx > thisIdx ||
                        (progress.phase === "done" && phase === "done");
                      const isPending = currentIdx < thisIdx;

                      return (
                        <div
                          key={phase}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-200 ${
                            isActive
                              ? "bg-primary/5 ring-1 ring-primary/20"
                              : isComplete
                                ? "opacity-50"
                                : "opacity-25"
                          }`}
                        >
                          {isActive && progress.phase !== "done" ? (
                            <Loader2
                              className={`size-4 animate-spin ${config.color}`}
                            />
                          ) : isComplete ? (
                            <CheckCircle className="size-4 text-green-500" />
                          ) : (
                            <Icon
                              className={`size-4 ${isPending ? "text-muted-foreground" : config.color}`}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-xs font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}
                            >
                              {phase === "checking" && "Checking existing bootstrap"}
                              {phase === "repairing" && "Repairing broken stack"}
                              {phase === "installing" && "Installing CDK dependencies"}
                              {phase === "bootstrapping" && "Bootstrapping AWS environment"}
                              {phase === "done" && "Bootstrap complete"}
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
                  {progress.phase !== "done" && progress.phase !== "error" && (
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-linear-to-r from-primary/80 to-primary"
                        initial={{ width: "0%" }}
                        animate={{
                          width:
                            progress.phase === "checking"
                              ? "10%"
                              : progress.phase === "repairing"
                                ? "25%"
                                : progress.phase === "installing"
                                  ? "50%"
                                  : "80%",
                        }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
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
                const diagnosis = diagnoseBootstrapError(
                  lastErrorOutput || bootstrapError,
                );
                return (
                  <Alert variant="destructive">
                    <AlertTriangle className="size-4" />
                    <AlertDescription className="space-y-3">
                      <div>
                        <p className="font-medium">{diagnosis.title}</p>
                        <p className="text-sm mt-1 opacity-90">
                          {diagnosis.description}
                        </p>
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
                    <p className="text-xs font-medium text-muted-foreground">
                      Raw Error Output
                    </p>
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
                      {copiedError ? "Copied" : "Copy"}
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

        {/* ── Environments list ──────────────────────────────────────── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Bootstrapped Regions</CardTitle>
              <CardDescription>
                Active regions are available for bucket creation and deployment.
              </CardDescription>
            </div>
            {environments.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {activeCount > 0 && (
                  <span className="flex items-center gap-1">
                    <div className="size-2 rounded-full bg-green-500" />
                    {activeCount} active
                  </span>
                )}
                {bootstrappingCount > 0 && (
                  <span className="flex items-center gap-1">
                    <div className="size-2 rounded-full bg-yellow-500 animate-pulse" />
                    {bootstrappingCount} in progress
                  </span>
                )}
                {failedCount > 0 && (
                  <span className="flex items-center gap-1">
                    <div className="size-2 rounded-full bg-red-500" />
                    {failedCount} failed
                  </span>
                )}
              </div>
            )}
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="size-7 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Loading environments…
                </p>
              </div>
            ) : environments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-muted/50 mb-4">
                  <Globe className="size-8 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium">No environments yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-70">
                  Bootstrap an AWS region to start deploying buckets and
                  CloudFront distributions.
                </p>
                <Button
                  className="mt-4"
                  size="sm"
                  onClick={() => setAddOpen(true)}
                >
                  <Plus className="mr-2 size-4" />
                  Add Your First Region
                </Button>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                <div className="space-y-3">
                  {environments.map((env, i) => {
                    const isFailed = env.status === "failed";
                    const isActive = env.status === "active";
                    const isBootstrapping = env.status === "bootstrapping";
                    const isProgressTarget =
                      progress && progress.region === env.region && bootstrapping;

                    return (
                      <motion.div
                        key={env.id}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          transition: { delay: i * 0.04, duration: 0.25 },
                        }}
                        exit={{ opacity: 0, x: -20 }}
                        className={`group relative rounded-xl border p-4 transition-all duration-200 hover:shadow-sm ${
                          isFailed
                            ? "border-red-500/20 bg-red-500/2"
                            : isBootstrapping || isProgressTarget
                              ? "border-primary/20 bg-primary/2"
                              : "hover:border-foreground/10"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {/* Status indicator */}
                            <div
                              className={`flex size-10 items-center justify-center rounded-xl ${
                                isActive
                                  ? "bg-green-500/10"
                                  : isFailed
                                    ? "bg-red-500/10"
                                    : "bg-yellow-500/10"
                              }`}
                            >
                              {isActive && (
                                <CheckCircle className="size-5 text-green-500" />
                              )}
                              {isFailed && (
                                <AlertCircle className="size-5 text-red-500" />
                              )}
                              {isBootstrapping && (
                                <Loader2 className="size-5 animate-spin text-yellow-500" />
                              )}
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">
                                  {env.alias || regionLabel(env.region)}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-mono"
                                >
                                  {env.region}
                                </Badge>
                                <Badge
                                  className={`text-[10px] ${
                                    isActive
                                      ? "bg-green-500/10 text-green-500 border-green-500/20"
                                      : isFailed
                                        ? "bg-red-500/10 text-red-500 border-red-500/20"
                                        : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                                  }`}
                                >
                                  {isActive
                                    ? "Active"
                                    : isFailed
                                      ? "Failed"
                                      : "Bootstrapping"}
                                </Badge>
                              </div>
                              <div className="mt-1.5 flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Shield className="size-3" />
                                  {env.accountId}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="size-3" />
                                  {regionLabel(env.region)}
                                </span>
                                {env.bootstrappedAt && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="flex items-center gap-1 cursor-default">
                                          <Clock className="size-3" />
                                          {relativeTime(env.bootstrappedAt)}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {new Date(
                                          env.bootstrappedAt,
                                        ).toLocaleString()}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isFailed && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRetry(env)}
                                disabled={bootstrapping}
                                className="text-xs"
                              >
                                {bootstrapping &&
                                progress?.region === env.region ? (
                                  <Loader2 className="mr-1.5 size-3 animate-spin" />
                                ) : (
                                  <RefreshCw className="mr-1.5 size-3" />
                                )}
                                Retry Bootstrap
                              </Button>
                            )}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                                    onClick={() => setDeleteTarget(env)}
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Remove from tracked environments
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>

                        {/* Inline progress for this specific region */}
                        <AnimatePresence>
                          {isProgressTarget && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="mt-3 pt-3 border-t border-border/50"
                            >
                              <div className="flex items-center gap-2 mb-2">
                                {(() => {
                                  const cfg = phaseConfig[progress.phase];
                                  const PhaseIcon = cfg.icon;
                                  return (
                                    <>
                                      {progress.phase !== "done" &&
                                      progress.phase !== "error" ? (
                                        <Loader2
                                          className={`size-3.5 animate-spin ${cfg.color}`}
                                        />
                                      ) : (
                                        <PhaseIcon
                                          className={`size-3.5 ${cfg.color}`}
                                        />
                                      )}
                                      <span
                                        className={`text-xs font-medium ${cfg.color}`}
                                      >
                                        {cfg.label}
                                      </span>
                                    </>
                                  );
                                })()}
                                <span className="text-xs text-muted-foreground truncate">
                                  {progress.message}
                                </span>
                              </div>
                              {progress.phase !== "done" &&
                                progress.phase !== "error" && (
                                  <div className="h-1 rounded-full bg-muted overflow-hidden">
                                    <motion.div
                                      className="h-full rounded-full bg-linear-to-r from-primary/80 to-primary"
                                      initial={{ width: "0%" }}
                                      animate={{
                                        width:
                                          progress.phase === "checking"
                                            ? "10%"
                                            : progress.phase === "repairing"
                                              ? "25%"
                                              : progress.phase === "installing"
                                                ? "50%"
                                                : "80%",
                                      }}
                                      transition={{
                                        duration: 0.5,
                                        ease: "easeOut",
                                      }}
                                    />
                                  </div>
                                )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </AnimatePresence>
            )}
          </CardContent>
        </Card>

        {/* ── Add Region Dialog ─────────────────────────────────────── */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Globe className="size-5 text-primary" />
                Bootstrap New Region
              </DialogTitle>
              <DialogDescription>
                Run CDK bootstrap in a new AWS region. This creates the required
                resources for deployments (S3 staging bucket, IAM roles, ECR
                repo).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-xs font-medium">AWS Account ID</Label>
                <Input
                  placeholder="123456789012"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="font-mono text-sm"
                />
                {accountId && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Shield className="size-3" />
                    Auto-filled from your AWS CLI credentials
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Region</Label>
                <Select
                  value={selectedRegion}
                  onValueChange={setSelectedRegion}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose AWS region…" />
                  </SelectTrigger>
                  <SelectContent>
                    {groupedAvailable.map((group) => (
                      <div key={group.label}>
                        <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          {group.label}
                        </p>
                        {group.regions.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            <div className="flex items-center gap-2">
                              <MapPin className="size-3 text-muted-foreground" />
                              {r.label}
                            </div>
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
                {availableRegions.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    All regions have been bootstrapped.
                  </p>
                )}
              </div>

              {/* What bootstrap does */}
              <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  What happens during bootstrap?
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li className="flex items-start gap-2">
                    <Search className="size-3 mt-0.5 shrink-0" />
                    Check if the region already has a CDKToolkit stack
                  </li>
                  <li className="flex items-start gap-2">
                    <Wrench className="size-3 mt-0.5 shrink-0" />
                    Auto-repair broken stacks (rollback/failed states)
                  </li>
                  <li className="flex items-start gap-2">
                    <Package className="size-3 mt-0.5 shrink-0" />
                    Install CDK dependencies
                  </li>
                  <li className="flex items-start gap-2">
                    <CloudUpload className="size-3 mt-0.5 shrink-0" />
                    Deploy CDKToolkit CloudFormation stack
                  </li>
                </ul>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAddOpen(false)}
                disabled={bootstrapping}
              >
                Cancel
              </Button>
              <Button
                onClick={handleBootstrap}
                disabled={
                  !selectedRegion || !accountId || bootstrapping
                }
              >
                {bootstrapping ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Bootstrapping…
                  </>
                ) : (
                  <>
                    <Rocket className="mr-2 size-4" />
                    Bootstrap Region
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Delete Confirmation ───────────────────────────────────── */}
        <Dialog
          open={!!deleteTarget}
          onOpenChange={() => setDeleteTarget(null)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trash2 className="size-4 text-destructive" />
                Remove Environment
              </DialogTitle>
              <DialogDescription>
                Remove{" "}
                <strong>{deleteTarget?.alias || deleteTarget?.region}</strong>{" "}
                from your tracked environments? This does{" "}
                <strong>not</strong> destroy the CDKToolkit stack in AWS.
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
