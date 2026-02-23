// Quick actions & commands page — pre-built commands, saved commands, AI generation
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Save,
  Sparkles,
  Bug,
  AlertTriangle,
  BookmarkPlus,
  Bookmark,
  X,
  Brain,
  Wrench,
  Clock,
  Download,
  List,
  Eye,
  Lock,
  BarChart3,
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

interface SavedCommand {
  id: string;
  label: string;
  description: string;
  command: string;
  category: string;
  createdAt: string;
}

interface AIDebugResult {
  diagnosis: string;
  fixCommands: { command: string; description: string }[];
  tips: string[];
}

const QUICK_COMMANDS: QuickCommand[] = [
  // CDK Commands
  {
    id: "cdk-synth",
    label: "CDK Synthesize",
    description: "Synthesize the CloudFormation template without deploying",
    command: "cd infrastructure/cdk; npx cdk synth",
    icon: <Package className="size-4" />,
    category: "CDK",
  },
  {
    id: "cdk-diff",
    label: "CDK Diff",
    description: "Compare deployed stack with current local state",
    command: "cd infrastructure/cdk; npx cdk diff",
    icon: <FileCheck className="size-4" />,
    category: "CDK",
  },
  {
    id: "cdk-bootstrap",
    label: "CDK Bootstrap",
    description: "Bootstrap your AWS account/region for CDK deployment",
    command: "cd infrastructure/cdk; npx cdk bootstrap",
    icon: <Settings className="size-4" />,
    category: "CDK",
  },
  {
    id: "cdk-list",
    label: "CDK List Stacks",
    description: "List all CDK stacks in the application",
    command: "cd infrastructure/cdk; npx cdk list",
    icon: <Server className="size-4" />,
    category: "CDK",
  },
  {
    id: "cdk-install",
    label: "Install CDK Dependencies",
    description: "Install npm dependencies for the CDK project",
    command: "cd infrastructure/cdk; npm install",
    icon: <Package className="size-4" />,
    category: "CDK",
  },
  {
    id: "cdk-destroy",
    label: "CDK Destroy Stack",
    description: "Destroy a deployed CDK stack (irreversible!)",
    command: "cd infrastructure/cdk; npx cdk destroy --force",
    icon: <Trash2 className="size-4" />,
    category: "CDK",
    dangerous: true,
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
  {
    id: "s3-list-all-objects",
    label: "List All S3 Objects",
    description: "List all objects across all buckets with sizes",
    command: "aws s3 ls --recursive --human-readable --summarize s3://",
    icon: <List className="size-4" />,
    category: "AWS S3",
  },
  {
    id: "s3-get-policy",
    label: "View Bucket Policy",
    description: "Get the current bucket policy (specify bucket name)",
    command: "Write-Host 'Specify bucket: aws s3api get-bucket-policy --bucket YOUR_BUCKET'",
    icon: <Eye className="size-4" />,
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
  {
    id: "cf-list-invalidations",
    label: "List Invalidations",
    description: "List recent CloudFront cache invalidations",
    command: "Write-Host 'Specify distribution ID: aws cloudfront list-invalidations --distribution-id YOUR_DIST_ID'",
    icon: <RefreshCw className="size-4" />,
    category: "CloudFront",
  },

  // CloudFormation Commands
  {
    id: "cfn-list-stacks",
    label: "List CloudFormation Stacks",
    description: "List all active CloudFormation stacks",
    command: "aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE --query \"StackSummaries[].{Name:StackName,Status:StackStatus}\" --output table",
    icon: <Cloud className="size-4" />,
    category: "CloudFormation",
  },
  {
    id: "cfn-describe-toolkit",
    label: "Check CDKToolkit Stack",
    description: "Check the CDK bootstrap/toolkit stack status",
    command: "aws cloudformation describe-stacks --stack-name CDKToolkit --query \"Stacks[0].{Status:StackStatus,Created:CreationTime}\" --output table",
    icon: <Search className="size-4" />,
    category: "CloudFormation",
  },

  // Cost & Billing Commands
  {
    id: "cost-s3",
    label: "S3 Cost Estimate",
    description: "Get this month's S3 cost breakdown",
    command: "aws ce get-cost-and-usage --time-period Start=$(Get-Date -Day 1 -Format 'yyyy-MM-dd'),End=$(Get-Date -Format 'yyyy-MM-dd') --granularity MONTHLY --metrics BlendedCost --filter '{\"Dimensions\":{\"Key\":\"SERVICE\",\"Values\":[\"Amazon Simple Storage Service\"]}}' --output table",
    icon: <BarChart3 className="size-4" />,
    category: "Cost & Billing",
  },
  {
    id: "cost-cf",
    label: "CloudFront Cost Estimate",
    description: "Get this month's CloudFront cost breakdown",
    command: "aws ce get-cost-and-usage --time-period Start=$(Get-Date -Day 1 -Format 'yyyy-MM-dd'),End=$(Get-Date -Format 'yyyy-MM-dd') --granularity MONTHLY --metrics BlendedCost --filter '{\"Dimensions\":{\"Key\":\"SERVICE\",\"Values\":[\"Amazon CloudFront\"]}}' --output table",
    icon: <BarChart3 className="size-4" />,
    category: "Cost & Billing",
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
  {
    id: "sys-aws-region",
    label: "Default AWS Region",
    description: "Show the currently configured AWS region",
    command: "aws configure get region",
    icon: <Globe className="size-4" />,
    category: "System",
  },
  {
    id: "sys-env-check",
    label: "Environment Check",
    description: "Check if all required tools are available",
    command: "Write-Host '=== Environment Check ==='; Write-Host \"Node: $(node --version)\"; Write-Host \"NPM: $(npm --version)\"; Write-Host \"CDK: $(npx cdk --version 2>&1)\"; Write-Host \"AWS CLI: $(aws --version 2>&1)\"; Write-Host \"AWS Account: $(aws sts get-caller-identity --query Account --output text 2>&1)\"",
    icon: <Wrench className="size-4" />,
    category: "System",
  },
  {
    id: "sys-disk-usage",
    label: "Disk Usage",
    description: "Show disk space usage on the current drive",
    command: "Get-PSDrive -PSProvider FileSystem | Format-Table Name, @{N='Used(GB)';E={[math]::Round($_.Used/1GB,2)}}, @{N='Free(GB)';E={[math]::Round($_.Free/1GB,2)}}, @{N='Total(GB)';E={[math]::Round(($_.Used+$_.Free)/1GB,2)}}",
    icon: <HardDrive className="size-4" />,
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
      icon: <Lock className="size-4" />,
      category: "Bucket",
    },
    {
      id: `s3-sync-${bucket.id}`,
      label: `Sync Local to Bucket`,
      description: `Sync a local directory to the bucket (dry run)`,
      command: `aws s3 sync . s3://${bucket.s3BucketName} --dryrun`,
      icon: <Download className="size-4" />,
      category: "Bucket",
    },
  ];
}

const CATEGORY_COLORS: Record<string, string> = {
  CDK: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  "AWS S3": "bg-orange-500/10 text-orange-500 border-orange-500/20",
  CloudFront: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  CloudFormation: "bg-sky-500/10 text-sky-500 border-sky-500/20",
  "Cost & Billing": "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  System: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  Bucket: "bg-green-500/10 text-green-500 border-green-500/20",
  Custom: "bg-pink-500/10 text-pink-500 border-pink-500/20",
  AI: "bg-violet-500/10 text-violet-500 border-violet-500/20",
};

export default function CommandsPage() {
  const { runCommand, isRunning, setIsOpen, lastError } = useTerminal();
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string>("");
  const [customCommand, setCustomCommand] = useState("");
  const [runningId, setRunningId] = useState<string | null>(null);

  // Save command form
  const [saveMode, setSaveMode] = useState(false);
  const [saveLabel, setSaveLabel] = useState("");
  const [saveDescription, setSaveDescription] = useState("");
  const [savedCommands, setSavedCommands] = useState<SavedCommand[]>([]);

  // AI state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{
    command: string;
    label: string;
    description: string;
    dangerous?: boolean;
  } | null>(null);
  const [debugLoading, setDebugLoading] = useState(false);
  const [debugResult, setDebugResult] = useState<AIDebugResult | null>(null);

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

  // Fetch saved commands
  const loadSavedCommands = useCallback(() => {
    fetch("/api/commands")
      .then((r) => r.json())
      .then((data: SavedCommand[]) => setSavedCommands(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadSavedCommands();
  }, [loadSavedCommands]);

  const handleRun = async (cmd: QuickCommand) => {
    setRunningId(cmd.id);
    setIsOpen(true);
    setDebugResult(null);
    await runCommand(cmd.command);
    setRunningId(null);
  };

  const handleCustomRun = async () => {
    if (!customCommand.trim() || isRunning) return;
    setRunningId("custom");
    setIsOpen(true);
    setDebugResult(null);
    await runCommand(customCommand.trim());
    setRunningId(null);
  };

  const handleSaveCommand = async () => {
    if (!saveLabel.trim() || !customCommand.trim()) return;
    try {
      await fetch("/api/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: saveLabel.trim(),
          description: saveDescription.trim(),
          command: customCommand.trim(),
          category: "Custom",
        }),
      });
      setSaveMode(false);
      setSaveLabel("");
      setSaveDescription("");
      setCustomCommand("");
      loadSavedCommands();
    } catch {
      // ignore
    }
  };

  const handleDeleteSaved = async (id: string) => {
    try {
      await fetch("/api/commands", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      loadSavedCommands();
    } catch {
      // ignore
    }
  };

  // AI: Generate command from description
  const handleAiGenerate = async () => {
    if (!aiPrompt.trim() || aiLoading) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", prompt: aiPrompt.trim() }),
      });
      const data = await res.json();
      if (data.error) {
        setAiResult({ command: "", label: "Error", description: data.error, dangerous: false });
      } else {
        setAiResult(data.result);
      }
    } catch {
      setAiResult({ command: "", label: "Error", description: "Failed to connect to AI", dangerous: false });
    } finally {
      setAiLoading(false);
    }
  };

  // AI: Debug last error
  const handleAiDebug = async () => {
    if (!lastError || debugLoading) return;
    setDebugLoading(true);
    setDebugResult(null);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "debug",
          errorOutput: lastError,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setDebugResult({
          diagnosis: data.error,
          fixCommands: [],
          tips: [],
        });
      } else {
        setDebugResult(data.result);
      }
    } catch {
      setDebugResult({
        diagnosis: "Failed to connect to AI service",
        fixCommands: [],
        tips: [],
      });
    } finally {
      setDebugLoading(false);
    }
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
            Pre-built commands, AI generation, and saved commands. Output streams to the terminal.
          </p>
        </div>

        {/* AI Tools */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              AI Tools
              <Badge variant="secondary" className="text-[10px]">
                GPT-4o-mini
              </Badge>
            </CardTitle>
            <CardDescription>
              Generate commands from natural language or debug errors with AI assistance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="generate" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="generate" className="gap-1.5">
                  <Brain className="size-3.5" /> Generate Command
                </TabsTrigger>
                <TabsTrigger value="debug" className="gap-1.5" disabled={!lastError}>
                  <Bug className="size-3.5" /> Debug Error
                  {lastError && (
                    <span className="ml-1 size-2 rounded-full bg-destructive animate-pulse" />
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Generate tab */}
              <TabsContent value="generate" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ai-prompt">Describe what you want to do</Label>
                  <div className="flex gap-2">
                    <Input
                      id="ai-prompt"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder='e.g., "list all S3 buckets with their sizes"'
                      className="font-mono text-sm"
                      onKeyDown={(e) => e.key === "Enter" && handleAiGenerate()}
                      disabled={aiLoading}
                    />
                    <Button
                      onClick={handleAiGenerate}
                      disabled={aiLoading || !aiPrompt.trim()}
                      className="gap-1.5 shrink-0"
                    >
                      {aiLoading ? (
                        <><Loader2 className="size-3.5 animate-spin" /> Generating...</>
                      ) : (
                        <><Sparkles className="size-3.5" /> Generate</>
                      )}
                    </Button>
                  </div>
                </div>

                <AnimatePresence>
                  {aiResult && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      {aiResult.command ? (
                        <Card>
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between gap-2">
                              <CardTitle className="text-sm">{aiResult.label}</CardTitle>
                              <div className="flex items-center gap-1.5">
                                {aiResult.dangerous && (
                                  <Badge variant="destructive" className="text-[10px] gap-1">
                                    <AlertTriangle className="size-3" /> Destructive
                                  </Badge>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={() => setAiResult(null)}
                                >
                                  <X className="size-3" />
                                </Button>
                              </div>
                            </div>
                            <CardDescription>{aiResult.description}</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <pre className="text-xs font-mono bg-muted px-3 py-2.5 rounded-md break-all whitespace-pre-wrap">
                              {aiResult.command}
                            </pre>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                className="gap-1.5"
                                onClick={() => {
                                  setIsOpen(true);
                                  runCommand(aiResult.command);
                                }}
                                disabled={isRunning}
                              >
                                <Play className="size-3" /> Run
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5"
                                onClick={() => {
                                  setCustomCommand(aiResult.command);
                                  setSaveMode(true);
                                  setSaveLabel(aiResult.label);
                                  setSaveDescription(aiResult.description);
                                }}
                              >
                                <Save className="size-3" /> Save
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="gap-1.5"
                                onClick={() => setCustomCommand(aiResult.command)}
                              >
                                Edit First
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ) : (
                        <p className="text-sm text-muted-foreground py-2">{aiResult.description}</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </TabsContent>

              {/* Debug tab */}
              <TabsContent value="debug" className="space-y-4">
                {lastError ? (
                  <>
                    <div className="space-y-2">
                      <Label>Last Error Output</Label>
                      <pre className="text-[11px] font-mono text-destructive/80 bg-destructive/5 border border-destructive/20 px-3 py-2 rounded-md max-h-24 overflow-auto break-all whitespace-pre-wrap">
                        {lastError.slice(0, 800)}{lastError.length > 800 ? "..." : ""}
                      </pre>
                    </div>
                    <Button
                      onClick={handleAiDebug}
                      disabled={debugLoading}
                      className="gap-1.5"
                      variant="outline"
                    >
                      {debugLoading ? (
                        <><Loader2 className="size-3.5 animate-spin" /> Analyzing Error...</>
                      ) : (
                        <><Brain className="size-3.5" /> Diagnose with AI</>
                      )}
                    </Button>

                    <AnimatePresence>
                      {debugResult && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                        >
                          <Card>
                            <CardContent className="pt-4 space-y-4">
                              <div>
                                <p className="text-sm font-semibold mb-1">Diagnosis</p>
                                <p className="text-sm text-muted-foreground">{debugResult.diagnosis}</p>
                              </div>
                              {debugResult.fixCommands?.length > 0 && (
                                <div>
                                  <p className="text-sm font-semibold mb-2">Suggested Fixes</p>
                                  <div className="space-y-2">
                                    {debugResult.fixCommands.map((fix, i) => (
                                      <div key={i} className="flex items-center gap-3 rounded-md border p-2.5">
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium">{fix.description}</p>
                                          <code className="block text-[11px] font-mono text-muted-foreground truncate mt-0.5">
                                            {fix.command}
                                          </code>
                                        </div>
                                        <Button
                                          size="sm"
                                          className="shrink-0 gap-1"
                                          onClick={() => {
                                            setIsOpen(true);
                                            runCommand(fix.command);
                                          }}
                                          disabled={isRunning}
                                        >
                                          <Play className="size-3" /> Run
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {debugResult.tips?.length > 0 && (
                                <div>
                                  <p className="text-sm font-semibold mb-1">Prevention Tips</p>
                                  <ul className="space-y-1">
                                    {debugResult.tips.map((tip, i) => (
                                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                                        <AlertTriangle className="size-3 text-amber-500 mt-0.5 shrink-0" />
                                        {tip}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Bug className="mb-2 size-8" />
                    <p className="text-sm">No errors to debug.</p>
                    <p className="text-xs mt-1">Run a command first — if it fails, the error will appear here for AI analysis.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Custom command + Save */}
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
          <CardContent className="space-y-3">
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="custom-cmd" className="text-xs">Command</Label>
                <Input
                  id="custom-cmd"
                  value={customCommand}
                  onChange={(e) => setCustomCommand(e.target.value)}
                  placeholder="e.g., aws s3 ls or npx cdk diff"
                  className="font-mono text-sm"
                  onKeyDown={(e) => e.key === "Enter" && !saveMode && handleCustomRun()}
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
              <Button
                variant="outline"
                className="gap-1.5"
                onClick={() => setSaveMode(!saveMode)}
                disabled={!customCommand.trim()}
              >
                <BookmarkPlus className="size-3.5" />
                {saveMode ? "Cancel" : "Save"}
              </Button>
            </div>

            {/* Save form */}
            <AnimatePresence>
              {saveMode && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-end gap-3 pt-2">
                    <div className="flex-1 space-y-1.5">
                      <Label htmlFor="save-label" className="text-xs">Name</Label>
                      <Input
                        id="save-label"
                        value={saveLabel}
                        onChange={(e) => setSaveLabel(e.target.value)}
                        placeholder="e.g., Check S3 Costs"
                        className="text-sm"
                      />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <Label htmlFor="save-desc" className="text-xs">Description (optional)</Label>
                      <Input
                        id="save-desc"
                        value={saveDescription}
                        onChange={(e) => setSaveDescription(e.target.value)}
                        placeholder="What does this command do?"
                        className="text-sm"
                      />
                    </div>
                    <Button
                      onClick={handleSaveCommand}
                      disabled={!saveLabel.trim() || !customCommand.trim()}
                      className="gap-1.5"
                    >
                      <Save className="size-3.5" /> Save Command
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Saved commands */}
        {savedCommands.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Bookmark className="size-5 text-pink-500" />
              Saved Commands
              <Badge variant="outline" className="text-xs">{savedCommands.length}</Badge>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {savedCommands.map((cmd) => (
                <motion.div key={cmd.id} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                  <Card className="h-full">
                    <CardContent className="flex items-start gap-3">
                      <div className={`rounded-md p-2 ${CATEGORY_COLORS["Custom"]}`}>
                        <Bookmark className="size-4" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{cmd.label}</p>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className={`text-[10px] shrink-0 ${CATEGORY_COLORS["Custom"]}`}>
                              Saved
                            </Badge>
                          </div>
                        </div>
                        {cmd.description && (
                          <p className="text-xs text-muted-foreground">{cmd.description}</p>
                        )}
                        <code className="block text-[10px] font-mono text-muted-foreground/70 truncate mt-1">
                          {cmd.command}
                        </code>
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="size-3 text-muted-foreground/50" />
                          <span className="text-[10px] text-muted-foreground/50">
                            {new Date(cmd.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1"
                          onClick={() => {
                            setRunningId(cmd.id);
                            setIsOpen(true);
                            runCommand(cmd.command).then(() => setRunningId(null));
                          }}
                          disabled={isRunning}
                        >
                          {runningId === cmd.id ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Play className="size-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteSaved(cmd.id)}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}

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
