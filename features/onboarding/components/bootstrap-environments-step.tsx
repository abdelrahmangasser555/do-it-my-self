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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AWS_REGIONS } from "@/lib/validations";
import type { BootstrappedEnvironment } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";

interface BootstrapEnvironmentsStepProps {
  environments: BootstrappedEnvironment[];
  accountId: string;
  loading: boolean;
  error: string | null;
  hasAnyActive: boolean;
  onBootstrap: (region: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

const statusColors: Record<BootstrappedEnvironment["status"], string> = {
  bootstrapping: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  active: "bg-green-500/10 text-green-500 border-green-500/20",
  failed: "bg-red-500/10 text-red-500 border-red-500/20",
};

export function BootstrapEnvironmentsStep({
  environments,
  accountId,
  loading,
  error,
  hasAnyActive,
  onBootstrap,
  onRemove,
}: BootstrapEnvironmentsStepProps) {
  const [selectedRegion, setSelectedRegion] = useState("");

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

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
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
