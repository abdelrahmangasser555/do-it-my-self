// Quick actions & commands page — pre-built commands synced with terminal
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { PageTransition } from "@/components/page-transition";
import { useTerminal } from "@/lib/terminal-context";
import {
  Zap,
  Cloud,
  Database,
  Shield,
  RefreshCw,
  Search,
  Trash2,
  Globe,
  Terminal,
  Play,
  Loader2,
  Package,
  Server,
  FileCheck,
  HardDrive,
  Settings,
} from "lucide-react";
import type { Bucket } from "@/lib/types";

interface QuickCommand {
  id: string;
  label: string;
  description: string;
  command: string;
  icon: React.ReactNode;
  category: string;
  dangerous?: boolean;
}

const QUICK_COMMANDS: QuickCommand[] = [
  // CDK Commands
  {
    id: "cdk-synth",
    label: "CDK Synthesize",
    description: "Synthesize the CloudFormation template without deploying",
    command: "cd infrastructure/cdk && npx cdk synth",
    icon: <Package className="size-4" />,
    category: "CDK",
  },
  {
    id: "cdk-diff",
    label: "CDK Diff",
    description: "Compare deployed stack with current local state",
    command: "cd infrastructure/cdk && npx cdk diff",
    icon: <FileCheck className="size-4" />,
    category: "CDK",
  },
  {
    id: "cdk-bootstrap",
    label: "CDK Bootstrap",
    description: "Bootstrap your AWS account/region for CDK deployment",
    command: "cd infrastructure/cdk && npx cdk bootstrap",
    icon: <Settings className="size-4" />,
    category: "CDK",
  },
  {
    id: "cdk-list",
    label: "CDK List Stacks",
    description: "List all CDK stacks in the application",
    command: "cd infrastructure/cdk && npx cdk list",
    icon: <Server className="size-4" />,
    category: "CDK",
  },
  {
    id: "cdk-install",
    label: "Install CDK Dependencies",
    description: "Install npm dependencies for the CDK project",
    command: "cd infrastructure/cdk && npm install",
    icon: <Package className="size-4" />,
    category: "CDK",
  },

  // AWS S3 Commands
  {
    id: "s3-list-buckets",
    label: "List S3 Buckets",
    description: "List all S3 buckets in your AWS account",
    command: "aws s3 ls",
    icon: <Database className="size-4" />,
    category: "AWS S3",
  },
  {
    id: "s3-check-caller",
    label: "Verify AWS Identity",
    description: "Check which AWS identity is being used",
    command: "aws sts get-caller-identity",
    icon: <Shield className="size-4" />,
    category: "AWS S3",
  },

  // CloudFront Commands
  {
    id: "cf-list",
    label: "List CloudFront Distributions",
    description: "List all CloudFront distributions in your account",
    command: "aws cloudfront list-distributions --query \"DistributionList.Items[].{Id:Id,Domain:DomainName,Status:Status}\" --output table",
    icon: <Globe className="size-4" />,
    category: "CloudFront",
  },

  // System Commands
  {
    id: "sys-aws-version",
    label: "AWS CLI Version",
    description: "Check the installed AWS CLI version",
    command: "aws --version",
    icon: <Terminal className="size-4" />,
    category: "System",
  },
  {
    id: "sys-node-version",
    label: "Node.js Version",
    description: "Check the installed Node.js version",
    command: "node --version",
    icon: <Terminal className="size-4" />,
    category: "System",
  },
  {
    id: "sys-cdk-version",
    label: "CDK Version",
    description: "Check the installed CDK CLI version",
    command: "npx cdk --version",
    icon: <Terminal className="size-4" />,
    category: "System",
  },
];

// Bucket-specific commands generated dynamically
function getBucketCommands(bucket: Bucket): QuickCommand[] {
  return [
    {
      id: `s3-ls-${bucket.id}`,
      label: `List Files in ${bucket.name}`,
      description: `List all objects in the ${bucket.s3BucketName} bucket`,
      command: `aws s3 ls s3://${bucket.s3BucketName} --recursive --human-readable --summarize`,
      icon: <Search className="size-4" />,
      category: "Bucket",
    },
    {
      id: `s3-size-${bucket.id}`,
      label: `Check ${bucket.name} Size`,
      description: `Get the total size and object count for ${bucket.s3BucketName}`,
      command: `aws s3 ls s3://${bucket.s3BucketName} --recursive --summarize | Select-String "Total"`,
      icon: <HardDrive className="size-4" />,
      category: "Bucket",
    },
    {
      id: `s3-versioning-${bucket.id}`,
      label: `Check Versioning Status`,
      description: `Check bucket versioning configuration for ${bucket.s3BucketName}`,
      command: `aws s3api get-bucket-versioning --bucket ${bucket.s3BucketName}`,
      icon: <RefreshCw className="size-4" />,
      category: "Bucket",
    },
    {
      id: `s3-encryption-${bucket.id}`,
      label: `Check Encryption Config`,
      description: `View server-side encryption configuration for ${bucket.s3BucketName}`,
      command: `aws s3api get-bucket-encryption --bucket ${bucket.s3BucketName}`,
      icon: <Shield className="size-4" />,
      category: "Bucket",
    },
  ];
}

const CATEGORY_COLORS: Record<string, string> = {
  CDK: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  "AWS S3": "bg-orange-500/10 text-orange-500 border-orange-500/20",
  CloudFront: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  System: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  Bucket: "bg-green-500/10 text-green-500 border-green-500/20",
  Custom: "bg-pink-500/10 text-pink-500 border-pink-500/20",
};

export default function CommandsPage() {
  const { runCommand, isRunning, setIsOpen } = useTerminal();
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string>("");
  const [customCommand, setCustomCommand] = useState("");
  const [runningId, setRunningId] = useState<string | null>(null);

  // Fetch buckets for dynamic commands
  useEffect(() => {
    fetch("/api/buckets")
      .then((r) => r.json())
      .then((data: Bucket[]) => {
        setBuckets(data);
        const active = data.find((b) => b.status === "active");
        if (active) setSelectedBucket(active.id);
      })
      .catch(() => {});
  }, []);

  const handleRun = async (cmd: QuickCommand) => {
    setRunningId(cmd.id);
    setIsOpen(true);
    await runCommand(cmd.command);
    setRunningId(null);
  };

  const handleCustomRun = async () => {
    if (!customCommand.trim() || isRunning) return;
    setRunningId("custom");
    setIsOpen(true);
    await runCommand(customCommand.trim());
    setRunningId(null);
    setCustomCommand("");
  };

  const activeBucket = buckets.find((b) => b.id === selectedBucket);
  const bucketCommands = activeBucket ? getBucketCommands(activeBucket) : [];

  // Group static commands by category
  const categories = Array.from(new Set(QUICK_COMMANDS.map((c) => c.category)));

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Zap className="size-6 text-primary" />
            Quick Commands
          </h1>
          <p className="text-muted-foreground mt-1">
            Pre-built commands for CDK, S3, and CloudFront operations. Output streams to the terminal.
          </p>
        </div>

        {/* Custom command */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Terminal className="size-4" />
              Custom Command
            </CardTitle>
            <CardDescription>
              Run any shell command — output will appear in the terminal below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="custom-cmd" className="text-xs">Command</Label>
                <Input
                  id="custom-cmd"
                  value={customCommand}
                  onChange={(e) => setCustomCommand(e.target.value)}
                  placeholder="e.g., aws s3 ls or npx cdk diff"
                  className="font-mono text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleCustomRun()}
                  disabled={isRunning}
                />
              </div>
              <Button
                onClick={handleCustomRun}
                disabled={isRunning || !customCommand.trim()}
                className="gap-1.5"
              >
                {runningId === "custom" ? (
                  <><Loader2 className="size-3.5 animate-spin" /> Running...</>
                ) : (
                  <><Play className="size-3.5" /> Run</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bucket-specific commands */}
        {buckets.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Database className="size-5" />
                Bucket Commands
              </h2>
              <select
                value={selectedBucket}
                onChange={(e) => setSelectedBucket(e.target.value)}
                className="rounded-md border bg-background px-3 py-1.5 text-sm"
              >
                {buckets
                  .filter((b) => b.status === "active")
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.s3BucketName})
                    </option>
                  ))}
                {buckets.filter((b) => b.status === "active").length === 0 && (
                  <option value="" disabled>No active buckets</option>
                )}
              </select>
            </div>

            {bucketCommands.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {bucketCommands.map((cmd) => (
                  <CommandCard
                    key={cmd.id}
                    cmd={cmd}
                    isRunning={runningId === cmd.id}
                    disabled={isRunning}
                    onRun={() => handleRun(cmd)}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-6 text-center text-sm text-muted-foreground">
                  No active buckets available. Deploy a bucket first.
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <Separator />

        {/* Static command categories */}
        {categories.map((category) => (
          <div key={category} className="space-y-3">
            <h2 className="text-lg font-semibold">{category}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {QUICK_COMMANDS.filter((c) => c.category === category).map((cmd) => (
                <CommandCard
                  key={cmd.id}
                  cmd={cmd}
                  isRunning={runningId === cmd.id}
                  disabled={isRunning}
                  onRun={() => handleRun(cmd)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </PageTransition>
  );
}

function CommandCard({
  cmd,
  isRunning,
  disabled,
  onRun,
}: {
  cmd: QuickCommand;
  isRunning: boolean;
  disabled: boolean;
  onRun: () => void;
}) {
  return (
    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
      <Card className="h-full">
        <CardContent className="flex items-start gap-3 ">
          <div className={`rounded-md p-2 ${CATEGORY_COLORS[cmd.category] || CATEGORY_COLORS["Custom"]}`}>
            {cmd.icon}
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{cmd.label}</p>
              <Badge variant="outline" className={`text-[10px] shrink-0 ${CATEGORY_COLORS[cmd.category] || ""}`}>
                {cmd.category}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{cmd.description}</p>
            <code className="block text-[10px] font-mono text-muted-foreground/70 truncate mt-1">
              {cmd.command}
            </code>
          </div>
          <Button
            variant={cmd.dangerous ? "destructive" : "outline"}
            size="sm"
            className="shrink-0 h-8 gap-1"
            onClick={onRun}
            disabled={disabled}
          >
            {isRunning ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Play className="size-3" />
            )}
            Run
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
