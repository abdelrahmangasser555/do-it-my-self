// Step 2 — AWS Connection & IAM Permissions
"use client";

import { useState } from "react";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Circle,
  RefreshCw,
  Copy,
  Check,
  Shield,
  ExternalLink,
  KeyRound,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Save,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TerminalOutput } from "./terminal-output";
import { AWS_REGIONS } from "@/lib/validations";
import { motion, AnimatePresence } from "framer-motion";
import type { AwsIdentity, TerminalLine } from "../hooks/use-aws-validation";

export interface IamPolicy {
  name: string;
  arn: string;
  source: string;
}

export interface IamPermissionResult {
  action: string;
  service: string;
  allowed: boolean;
}

interface AwsStepProps {
  // AWS identity check
  identity: AwsIdentity | null;
  awsLoading: boolean;
  awsError: string | null;
  awsChecked: boolean;
  awsTerminalOutput: TerminalLine[];
  awsPassed: boolean;
  onRecheckAws: () => void;

  // IAM permissions
  iamPolicies: IamPolicy[];
  iamPermissions: IamPermissionResult[];
  hasAdminPolicy: boolean;
  allPermissionsGranted: boolean;
  iamLoading: boolean;
  onCheckPermissions: () => void;

  // Credential switching
  onUpdateCredentials: (
    accessKeyId: string,
    secretAccessKey: string,
    region: string,
  ) => Promise<boolean>;
  credentialUpdating: boolean;
}

function CopySnippet({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="relative">
      <pre className="rounded-md bg-muted p-3 font-mono text-xs text-muted-foreground overflow-x-auto">
        {text}
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 size-6"
        onClick={() => {
          navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? (
          <Check className="size-3 text-green-500" />
        ) : (
          <Copy className="size-3" />
        )}
      </Button>
    </div>
  );
}

// Group permissions by service
function groupByService(permissions: IamPermissionResult[]) {
  const groups: Record<string, IamPermissionResult[]> = {};
  for (const p of permissions) {
    if (!groups[p.service]) groups[p.service] = [];
    groups[p.service].push(p);
  }
  return groups;
}

export function AwsStep({
  identity,
  awsLoading,
  awsError,
  awsChecked,
  awsTerminalOutput,
  awsPassed,
  onRecheckAws,
  iamPolicies,
  iamPermissions,
  hasAdminPolicy,
  allPermissionsGranted,
  iamLoading,
  onCheckPermissions,
  onUpdateCredentials,
  credentialUpdating,
}: AwsStepProps) {
  const [showCredentialForm, setShowCredentialForm] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [credentialRegion, setCredentialRegion] = useState("us-east-1");

  const handleSaveCredentials = async () => {
    const success = await onUpdateCredentials(
      accessKeyId,
      secretAccessKey,
      credentialRegion,
    );
    if (success) {
      setAccessKeyId("");
      setSecretAccessKey("");
      setShowCredentialForm(false);
    }
  };

  const permissionGroups = groupByService(iamPermissions);

  return (
    <Card className="rounded-xl border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-sm font-bold text-primary">
            2
          </div>
          <div>
            <CardTitle className="text-base">AWS Connection & IAM</CardTitle>
            <p className="text-sm text-muted-foreground">
              Verify credentials and check permissions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {awsChecked && (
            <Badge
              variant={
                awsPassed && allPermissionsGranted
                  ? "default"
                  : awsPassed
                    ? "secondary"
                    : "destructive"
              }
              className="text-xs"
            >
              {awsPassed && allPermissionsGranted
                ? "Connected"
                : awsPassed
                  ? "Limited Permissions"
                  : "Not Connected"}
            </Badge>
          )}
          {awsLoading || iamLoading ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : awsPassed && allPermissionsGranted ? (
            <CheckCircle className="size-5 text-green-500" />
          ) : awsChecked ? (
            <XCircle className="size-5 text-red-500" />
          ) : (
            <Circle className="size-5 text-muted-foreground" />
          )}
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="p-6 space-y-6">
        {/* AWS Identity Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">AWS Identity</span>
          </div>

          {!awsChecked && !awsLoading && (
            <div className="flex flex-col items-center gap-3 py-4">
              <p className="text-sm text-muted-foreground">
                Verify your AWS credentials and check IAM permissions.
              </p>
              <Button onClick={onRecheckAws} size="sm">
                <RefreshCw className="mr-2 size-3.5" />
                Check AWS Connection
              </Button>
            </div>
          )}

          {awsLoading && (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="size-4 animate-spin" />
              <span className="text-sm text-muted-foreground">
                Verifying AWS credentials...
              </span>
            </div>
          )}

          {awsError && (
            <Alert variant="destructive">
              <AlertDescription className="space-y-2">
                <p className="text-sm">{awsError}</p>
                <p className="text-xs text-muted-foreground">
                  Configure your AWS CLI credentials first:
                </p>
                <CopySnippet text="aws configure" />
              </AlertDescription>
            </Alert>
          )}

          {identity && (
            <div className="rounded-md border border-border bg-muted/50 p-3 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Account</span>
                <span className="font-mono">{identity.account}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">ARN</span>
                <span className="font-mono truncate max-w-75">
                  {identity.arn}
                </span>
              </div>
            </div>
          )}

          {awsTerminalOutput.length > 0 && (
            <TerminalOutput lines={awsTerminalOutput} maxHeight="150px" />
          )}
        </div>

        {/* IAM Permissions Section */}
        {awsPassed && (
          <>
            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">IAM Permissions</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCheckPermissions}
                  disabled={iamLoading}
                >
                  {iamLoading ? (
                    <Loader2 className="mr-2 size-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 size-3.5" />
                  )}
                  {iamPermissions.length > 0 ? "Recheck" : "Check Permissions"}
                </Button>
              </div>

              {iamLoading && (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 className="size-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">
                    Checking IAM permissions...
                  </span>
                </div>
              )}

              {/* Admin policy alert */}
              {hasAdminPolicy && (
                <Alert className="border-green-500/30 bg-green-500/5">
                  <ShieldCheck className="size-4 text-green-500" />
                  <AlertDescription className="text-sm text-green-700 dark:text-green-400">
                    Administrator access detected. All permissions are granted.
                  </AlertDescription>
                </Alert>
              )}

              {/* Attached policies */}
              {iamPolicies.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Attached Policies
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {iamPolicies.map((p, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="text-xs font-mono"
                      >
                        {p.name}
                        {p.source !== "user" && (
                          <span className="ml-1 opacity-60">
                            ({p.source})
                          </span>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Permission simulation results */}
              {iamPermissions.length > 0 && !hasAdminPolicy && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Permission Check Results
                  </p>
                  <div className="space-y-2">
                    {Object.entries(permissionGroups).map(
                      ([service, perms]) => (
                        <div
                          key={service}
                          className="rounded-md border border-border p-3 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">
                              {service}
                            </span>
                            {perms.every((p) => p.allowed) ? (
                              <CheckCircle className="size-3.5 text-green-500" />
                            ) : (
                              <XCircle className="size-3.5 text-red-500" />
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1">
                            {perms.map((p) => (
                              <div
                                key={p.action}
                                className="flex items-center gap-1.5 text-xs"
                              >
                                <div
                                  className={`size-1.5 rounded-full ${
                                    p.allowed ? "bg-green-500" : "bg-red-500"
                                  }`}
                                />
                                <span className="text-muted-foreground font-mono">
                                  {p.action.split(":")[1]}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ),
                    )}
                  </div>

                  {!allPermissionsGranted && (
                    <Alert variant="destructive">
                      <ShieldAlert className="size-4" />
                      <AlertDescription className="space-y-1">
                        <p className="text-sm font-medium">
                          Missing required permissions
                        </p>
                        <p className="text-xs opacity-90">
                          Your IAM user is missing some permissions needed for
                          CDK bootstrap and resource management. Attach the{" "}
                          <span className="font-medium">
                            AdministratorAccess
                          </span>{" "}
                          policy or add the specific missing permissions.
                        </p>
                        <div className="flex flex-wrap gap-3 pt-1">
                          <a
                            href="https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_change-permissions.html"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs underline inline-flex items-center gap-1 opacity-90 hover:opacity-100"
                          >
                            <ExternalLink className="size-3" />
                            Manage IAM Permissions
                          </a>
                          <a
                            href="https://www.youtube.com/results?search_query=add+iam+policy+to+user+aws+tutorial"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs underline inline-flex items-center gap-1 opacity-90 hover:opacity-100"
                          >
                            <ExternalLink className="size-3" />
                            Video Tutorial
                          </a>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {/* Empty state if no permissions checked yet and not loading */}
              {iamPermissions.length === 0 && !iamLoading && (
                <p className="text-xs text-muted-foreground py-1">
                  Click &quot;Check Permissions&quot; to see what your IAM user
                  can access.
                </p>
              )}
            </div>
          </>
        )}

        {/* Switch IAM User / Credentials Form */}
        {(awsChecked || awsError) && (
          <>
            <Separator />

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setShowCredentialForm(!showCredentialForm)}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <KeyRound className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    Switch IAM User / Update Credentials
                  </span>
                </div>
                {showCredentialForm ? (
                  <ChevronUp className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="size-4 text-muted-foreground" />
                )}
              </button>

              <AnimatePresence>
                {showCredentialForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-4 pt-2">
                      <p className="text-xs text-muted-foreground">
                        Enter new AWS credentials to switch IAM user. This will
                        update your local AWS CLI configuration.
                      </p>

                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="accessKeyId" className="text-xs">
                            Access Key ID
                          </Label>
                          <Input
                            id="accessKeyId"
                            placeholder="AKIAIOSFODNN7EXAMPLE"
                            value={accessKeyId}
                            onChange={(e) => setAccessKeyId(e.target.value)}
                            className="font-mono text-xs"
                            autoComplete="off"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="secretAccessKey" className="text-xs">
                            Secret Access Key
                          </Label>
                          <div className="relative">
                            <Input
                              id="secretAccessKey"
                              type={showSecret ? "text" : "password"}
                              placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                              value={secretAccessKey}
                              onChange={(e) =>
                                setSecretAccessKey(e.target.value)
                              }
                              className="font-mono text-xs pr-10"
                              autoComplete="off"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-1 top-1/2 -translate-y-1/2 size-7"
                              onClick={() => setShowSecret(!showSecret)}
                            >
                              {showSecret ? (
                                <EyeOff className="size-3.5" />
                              ) : (
                                <Eye className="size-3.5" />
                              )}
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="credRegion" className="text-xs">
                            Default Region
                          </Label>
                          <Select
                            value={credentialRegion}
                            onValueChange={setCredentialRegion}
                          >
                            <SelectTrigger id="credRegion" className="text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {AWS_REGIONS.map((r) => (
                                <SelectItem
                                  key={r.value}
                                  value={r.value}
                                  className="text-xs"
                                >
                                  {r.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <Button
                        onClick={handleSaveCredentials}
                        disabled={
                          !accessKeyId ||
                          !secretAccessKey ||
                          credentialUpdating
                        }
                        size="sm"
                        className="w-full"
                      >
                        {credentialUpdating ? (
                          <Loader2 className="mr-2 size-3.5 animate-spin" />
                        ) : (
                          <Save className="mr-2 size-3.5" />
                        )}
                        Save & Verify Credentials
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}

        {/* Recheck */}
        {awsChecked && (
          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRecheckAws}
              disabled={awsLoading || iamLoading}
            >
              <RefreshCw className="mr-2 size-3.5" />
              Recheck
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
