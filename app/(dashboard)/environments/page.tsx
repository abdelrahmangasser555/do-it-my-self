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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { PageTransition } from "@/components/page-transition";
import { AWS_REGIONS } from "@/lib/validations";
import {
  useEnvironments,
  useBootstrapEnvironment,
} from "@/features/environments/hooks/use-environments";
import type { BootstrappedEnvironment } from "@/lib/types";

const statusConfig: Record<
  BootstrappedEnvironment["status"],
  { color: string; icon: typeof CheckCircle; label: string }
> = {
  active: { color: "text-green-500", icon: CheckCircle, label: "Active" },
  bootstrapping: {
    color: "text-yellow-500",
    icon: Loader2,
    label: "Bootstrapping",
  },
  failed: { color: "text-red-500", icon: AlertCircle, label: "Failed" },
};

export default function EnvironmentsPage() {
  const { environments, loading, refetch } = useEnvironments();
  const { bootstrapEnvironment, loading: bootstrapping } =
    useBootstrapEnvironment();

  const [addOpen, setAddOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [accountId, setAccountId] = useState("");
  const [deleteTarget, setDeleteTarget] =
    useState<BootstrappedEnvironment | null>(null);

  // Auto-fill AWS account ID from local credentials when Add Region dialog opens
  useEffect(() => {
    if (addOpen && !accountId) {
      fetch("/api/aws-identity")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.account) setAccountId(data.account);
        })
        .catch(() => {
          // Silent — user can type manually
        });
    }
  }, [addOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const usedRegions = new Set(environments.map((e) => e.region));
  const availableRegions = AWS_REGIONS.filter((r) => !usedRegions.has(r.value));

  const activeCount = environments.filter((e) => e.status === "active").length;
  const failedCount = environments.filter((e) => e.status === "failed").length;

  const handleBootstrap = useCallback(async () => {
    if (!selectedRegion || !accountId) {
      toast.error("Region and Account ID are required");
      return;
    }
    const regionLabel =
      AWS_REGIONS.find((r) => r.value === selectedRegion)?.label ??
      selectedRegion;
    toast.info(`Bootstrapping ${regionLabel}…`);
    await bootstrapEnvironment(selectedRegion, accountId, regionLabel);
    await refetch();
    setAddOpen(false);
    setSelectedRegion("");
    toast.success(`Environment ${regionLabel} bootstrapped`);
  }, [selectedRegion, accountId, bootstrapEnvironment, refetch]);

  const handleRetry = useCallback(
    async (env: BootstrappedEnvironment) => {
      toast.info(`Retrying ${env.alias || env.region}…`);
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

  const regionLabel = (value: string) =>
    AWS_REGIONS.find((r) => r.value === value)?.label ?? value;

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Environments</h1>
            <p className="text-muted-foreground">
              Manage bootstrapped AWS regions for deployment.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={loading}
            >
              <RefreshCw
                className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="mr-2 size-4" />
              Add Region
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Globe className="size-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{environments.length}</p>
                <p className="text-xs text-muted-foreground">Total Regions</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <CheckCircle className="size-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <AlertCircle className="size-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{failedCount}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Environments list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bootstrapped Regions</CardTitle>
            <CardDescription>
              Only active regions are available for bucket creation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : environments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Globe className="mb-3 size-10 text-muted-foreground/40" />
                <p className="text-sm font-medium">No environments yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add and bootstrap an AWS region to get started.
                </p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                <div className="space-y-3">
                  {environments.map((env, i) => {
                    const cfg = statusConfig[env.status];
                    const StatusIcon = cfg.icon;
                    return (
                      <motion.div
                        key={env.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          transition: { delay: i * 0.05 },
                        }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="flex items-center gap-4">
                          <StatusIcon
                            className={`size-5 ${cfg.color} ${
                              env.status === "bootstrapping"
                                ? "animate-spin"
                                : ""
                            }`}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {env.alias || env.region}
                              </span>
                              <Badge variant="outline" className="text-[10px]">
                                {env.region}
                              </Badge>
                              <Badge
                                className={`text-[10px] ${
                                  env.status === "active"
                                    ? "bg-green-500/10 text-green-500 border-green-500/20"
                                    : env.status === "failed"
                                      ? "bg-red-500/10 text-red-500 border-red-500/20"
                                      : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                                }`}
                              >
                                {cfg.label}
                              </Badge>
                            </div>
                            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Shield className="size-3" />
                                {env.accountId}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="size-3" />
                                {regionLabel(env.region)}
                              </span>
                              {env.bootstrappedAt && (
                                <span className="flex items-center gap-1">
                                  <Clock className="size-3" />
                                  {new Date(
                                    env.bootstrappedAt,
                                  ).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {env.status === "failed" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRetry(env)}
                              disabled={bootstrapping}
                            >
                              <RefreshCw className="mr-1 size-3" />
                              Retry
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteTarget(env)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </AnimatePresence>
            )}
          </CardContent>
        </Card>

        {/* Add region dialog */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="sm:max-w-105">
            <DialogHeader>
              <DialogTitle>Bootstrap New Region</DialogTitle>
              <DialogDescription>
                Run CDK bootstrap in a new AWS region to enable deployments
                there.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>AWS Account ID</Label>
                <Input
                  placeholder="123456789012"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Region</Label>
                <Select
                  value={selectedRegion}
                  onValueChange={setSelectedRegion}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a region" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRegions.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availableRegions.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    All regions have been bootstrapped.
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleBootstrap}
                disabled={!selectedRegion || !accountId || bootstrapping}
              >
                {bootstrapping ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Bootstrapping…
                  </>
                ) : (
                  "Bootstrap"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirm */}
        <Dialog
          open={!!deleteTarget}
          onOpenChange={() => setDeleteTarget(null)}
        >
          <DialogContent className="sm:max-w-100">
            <DialogHeader>
              <DialogTitle>Remove Environment</DialogTitle>
              <DialogDescription>
                Remove{" "}
                <strong>{deleteTarget?.alias || deleteTarget?.region}</strong>{" "}
                from your tracked environments? This does not destroy the CDK
                bootstrap stack in AWS.
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
                Remove
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}
