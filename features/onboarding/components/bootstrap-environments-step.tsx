// Step 3 — Bootstrap Environments: select regions to CDK bootstrap
"use client";

import { useState } from "react";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Circle,
  Plus,
  Globe,
  Trash2,
  Rocket,
  MapPin,
  ChevronDown,
  ChevronUp,
  BookOpen,
  ShieldCheck,
  ExternalLink,
  AlertTriangle,
  Copy,
  Check,
  Search,
  Package,
  CloudUpload,
  Wrench,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AWS_REGIONS } from "@/lib/validations";
import type { BootstrappedEnvironment } from "@/lib/types";
import type { BootstrapProgress } from "@/features/environments/hooks/use-environments";
import { motion, AnimatePresence } from "framer-motion";
import {
  diagnoseBootstrapError,
  IAM_SETUP_STEPS,
  MINIMUM_IAM_PERMISSIONS,
  SETUP_RESOURCES,
} from "../utils/error-diagnosis";

interface BootstrapEnvironmentsStepProps {
  environments: BootstrappedEnvironment[];
  accountId: string;
  loading: boolean;
  error: string | null;
  lastErrorOutput?: string;
  progress?: BootstrapProgress | null;
  hasAnyActive: boolean;
  onBootstrap: (region: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

const statusColors: Record<BootstrappedEnvironment["status"], string> = {
  bootstrapping: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  active: "bg-green-500/10 text-green-500 border-green-500/20",
  failed: "bg-red-500/10 text-red-500 border-red-500/20",
};

const phaseConfig: Record<
  BootstrapProgress["phase"],
  { icon: typeof Search; label: string; color: string }
> = {
  checking: {
    icon: Search,
    label: "Checking",
    color: "text-blue-500",
  },
  repairing: {
    icon: Wrench,
    label: "Repairing",
    color: "text-orange-500",
  },
  installing: {
    icon: Package,
    label: "Installing",
    color: "text-yellow-500",
  },
  bootstrapping: {
    icon: CloudUpload,
    label: "Bootstrapping",
    color: "text-purple-500",
  },
  done: {
    icon: CheckCircle,
    label: "Complete",
    color: "text-green-500",
  },
  error: {
    icon: XCircle,
    label: "Error",
    color: "text-red-500",
  },
};

export function BootstrapEnvironmentsStep({
  environments,
  accountId,
  loading,
  error,
  lastErrorOutput,
  progress,
  hasAnyActive,
  onBootstrap,
  onRemove,
}: BootstrapEnvironmentsStepProps) {
  const [selectedRegion, setSelectedRegion] = useState("");
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [copied, setCopied] = useState(false);

  // Filter out already-bootstrapped regions
  const usedRegions = new Set(
    environments.filter((e) => e.status !== "failed").map((e) => e.region),
  );
  const availableRegions = AWS_REGIONS.filter((r) => !usedRegions.has(r.value));

  const handleBootstrap = async () => {
    if (!selectedRegion) return;
    await onBootstrap(selectedRegion);
    setSelectedRegion("");
  };

  return (
    <Card className="rounded-xl border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-sm font-bold text-primary">
            3
          </div>
          <div>
            <CardTitle className="text-base">Environments</CardTitle>
            <p className="text-sm text-muted-foreground">
              Bootstrap AWS regions for deployment
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {environments.length > 0 && (
            <Badge
              className={`text-xs ${hasAnyActive ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"}`}
            >
              {hasAnyActive
                ? `${environments.filter((e) => e.status === "active").length} Active`
                : "No Active Environments"}
            </Badge>
          )}
          {loading ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : hasAnyActive ? (
            <CheckCircle className="size-5 text-green-500" />
          ) : environments.length > 0 ? (
            <XCircle className="size-5 text-red-500" />
          ) : (
            <Circle className="size-5 text-muted-foreground" />
          )}
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="p-6 space-y-5">
        {/* Explanation */}
        <div className="flex items-start gap-3">
          <Globe className="mt-0.5 size-4 text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground">
            Each AWS region needs a one-time CDK bootstrap before you can deploy
            buckets there. Select the regions you plan to use. You can add more
            later from the Environments page.
          </p>
        </div>

        {/* Setup Guide */}
        <div className="rounded-lg border border-border p-3 space-y-3">
          <button
            type="button"
            onClick={() => setShowSetupGuide(!showSetupGuide)}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                Setup Guide & IAM Requirements
              </span>
            </div>
            {showSetupGuide ? (
              <ChevronUp className="size-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-4 text-muted-foreground" />
            )}
          </button>

          <AnimatePresence>
            {showSetupGuide && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-4 pt-2 overflow-hidden"
              >
                {/* IAM Permissions */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-3.5 text-muted-foreground" />
                    <p className="text-xs font-medium">
                      Required IAM Permissions
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your IAM user needs these permissions. The easiest option is
                    to attach the{" "}
                    <span className="font-medium text-foreground">
                      AdministratorAccess
                    </span>{" "}
                    managed policy.
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-0.5 pl-5 list-disc">
                    {MINIMUM_IAM_PERMISSIONS.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>

                <Separator />

                {/* IAM User Setup Steps */}
                <div className="space-y-2">
                  <p className="text-xs font-medium">
                    How to Create an IAM User
                  </p>
                  <ol className="text-xs text-muted-foreground space-y-1 pl-5 list-decimal">
                    {IAM_SETUP_STEPS.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>

                <Separator />

                {/* Helpful Resources */}
                <div className="space-y-2">
                  <p className="text-xs font-medium">
                    Helpful Resources & Video Tutorials
                  </p>
                  <div className="grid gap-2">
                    {Object.values(SETUP_RESOURCES).map((resource) => (
                      <div
                        key={resource.label}
                        className="flex items-center gap-3 flex-wrap"
                      >
                        <a
                          href={resource.docs}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                        >
                          <ExternalLink className="size-3 shrink-0" />
                          {resource.label}
                        </a>
                        <a
                          href={resource.videoSearch}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                        >
                          <ExternalLink className="size-3 shrink-0" />
                          Video tutorial
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Add region */}
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Select a region to bootstrap
            </label>
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger>
                <SelectValue placeholder="Choose AWS region..." />
              </SelectTrigger>
              <SelectContent>
                {availableRegions.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    <div className="flex items-center gap-2">
                      <MapPin className="size-3 text-muted-foreground" />
                      {r.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleBootstrap}
            disabled={!selectedRegion || loading}
            size="sm"
            className="shrink-0"
          >
            {loading ? (
              <Loader2 className="mr-2 size-3.5 animate-spin" />
            ) : (
              <Plus className="mr-2 size-3.5" />
            )}
            Bootstrap
          </Button>
        </div>

        {/* Live Bootstrap Progress */}
        <AnimatePresence>
          {progress && loading && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="rounded-lg border border-border bg-muted/30 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {AWS_REGIONS.find((r) => r.value === progress.region)
                      ?.label || progress.region}
                  </span>
                </div>
                <Badge
                  className={`text-xs ${
                    progress.phase === "done"
                      ? "bg-green-500/10 text-green-500 border-green-500/20"
                      : progress.phase === "error"
                        ? "bg-red-500/10 text-red-500 border-red-500/20"
                        : "bg-primary/10 text-primary border-primary/20"
                  }`}
                >
                  {phaseConfig[progress.phase].label}
                </Badge>
              </div>

              {/* Phase steps */}
              <div className="space-y-2">
                {(
                  progress.phase === "repairing"
                    ? (["checking", "repairing", "installing", "bootstrapping", "done"] as const)
                    : (["checking", "installing", "bootstrapping", "done"] as const)
                ).map((phase) => {
                  const config = phaseConfig[phase];
                  const Icon = config.icon;
                  const phaseOrder =
                    progress.phase === "repairing"
                      ? ["checking", "repairing", "installing", "bootstrapping", "done"]
                      : ["checking", "installing", "bootstrapping", "done"];
                  const currentIdx = phaseOrder.indexOf(progress.phase);
                  const thisIdx = phaseOrder.indexOf(phase);
                  const isActive = progress.phase === phase;
                  const isComplete =
                    currentIdx > thisIdx ||
                    (progress.phase === "done" && phase === "done");
                  const isPending = currentIdx < thisIdx;

                  return (
                    <div
                      key={phase}
                      className={`flex items-center gap-3 rounded-md px-3 py-2 transition-colors ${
                        isActive
                          ? "bg-primary/5 border border-primary/20"
                          : isComplete
                            ? "opacity-60"
                            : "opacity-30"
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
                          {phase === "checking" &&
                            "Checking existing bootstrap"}
                          {phase === "repairing" &&
                            "Repairing broken stack"}
                          {phase === "installing" &&
                            "Installing CDK dependencies"}
                          {phase === "bootstrapping" &&
                            "Bootstrapping AWS environment"}
                          {phase === "done" && "Bootstrap complete"}
                        </p>
                        {isActive && progress.message && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {progress.message}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Progress bar animation */}
              {progress.phase !== "done" &&
                progress.phase !== "error" && (
                  <div className="h-1 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error with diagnosis */}
        {error && (
          <div className="space-y-3">
            {(() => {
              const diagnosis = diagnoseBootstrapError(
                lastErrorOutput || error,
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
                    Error Output
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => {
                      navigator.clipboard.writeText(lastErrorOutput);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                  >
                    {copied ? (
                      <Check className="mr-1 size-3 text-green-500" />
                    ) : (
                      <Copy className="mr-1 size-3" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <ScrollArea className="max-h-40 rounded-md bg-muted p-3 overflow-auto">
                  <pre className="font-mono text-xs text-red-400 whitespace-pre-wrap break-all">
                    {lastErrorOutput}
                  </pre>
                </ScrollArea>
              </div>
            )}
          </div>
        )}

        {/* Environments list */}
        <AnimatePresence mode="popLayout">
          {environments.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Bootstrapped Regions
              </p>
              <div className="space-y-2">
                {environments.map((env) => {
                  const regionLabel =
                    AWS_REGIONS.find((r) => r.value === env.region)?.label ||
                    env.region;
                  return (
                    <motion.div
                      key={env.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {env.status === "active" && (
                            <div className="size-2 rounded-full bg-green-500 animate-pulse" />
                          )}
                          {env.status === "bootstrapping" && (
                            <Loader2 className="size-3 animate-spin text-yellow-500" />
                          )}
                          {env.status === "failed" && (
                            <div className="size-2 rounded-full bg-red-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{regionLabel}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {env.accountId} / {env.region}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={`text-xs ${statusColors[env.status]}`}
                        >
                          {env.status === "bootstrapping" && (
                            <Loader2 className="mr-1 size-3 animate-spin" />
                          )}
                          {env.status === "active" && (
                            <Rocket className="mr-1 size-3" />
                          )}
                          {env.status}
                        </Badge>
                        {env.status === "failed" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-destructive"
                            onClick={() => onRemove(env.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {environments.length === 0 && !loading && (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <Globe className="size-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No environments bootstrapped yet. Add at least one region to
              continue.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
