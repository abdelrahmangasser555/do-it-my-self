// Step 2 — AWS Connection Validation: sts identity, cdk list, cdk bootstrap
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
  Server,
  Rocket,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TerminalOutput } from "./terminal-output";
import type { AwsIdentity, CdkStack, TerminalLine } from "../hooks/use-aws-validation";

interface AwsStepProps {
  // AWS identity check
  identity: AwsIdentity | null;
  cdkStacks: CdkStack[];
  awsLoading: boolean;
  awsError: string | null;
  awsChecked: boolean;
  awsTerminalOutput: TerminalLine[];
  awsPassed: boolean;
  onRecheckAws: () => void;

  // CDK bootstrap
  cdkLoading: boolean;
  cdkError: string | null;
  cdkSuccess: boolean;
  cdkChecked: boolean;
  cdkTerminalOutput: TerminalLine[];
  onBootstrapCdk: () => void;
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
        {copied ? <Check className="size-3 text-green-500" /> : <Copy className="size-3" />}
      </Button>
    </div>
  );
}

export function AwsStep({
  identity,
  cdkStacks,
  awsLoading,
  awsError,
  awsChecked,
  awsTerminalOutput,
  awsPassed,
  onRecheckAws,
  cdkLoading,
  cdkError,
  cdkSuccess,
  cdkChecked,
  cdkTerminalOutput,
  onBootstrapCdk,
}: AwsStepProps) {
  const overallPassed = awsPassed && cdkSuccess;

  return (
    <Card className="rounded-xl border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-sm font-bold text-primary">
            2
          </div>
          <div>
            <CardTitle className="text-base">AWS Connection</CardTitle>
            <p className="text-sm text-muted-foreground">
              Verify credentials and bootstrap CDK
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(awsChecked || cdkChecked) && (
            <Badge
              variant={overallPassed ? "default" : awsPassed ? "secondary" : "destructive"}
              className="text-xs"
            >
              {overallPassed ? "Connected" : awsPassed ? "Bootstrap Required" : "Not Connected"}
            </Badge>
          )}
          {awsLoading || cdkLoading ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : overallPassed ? (
            <CheckCircle className="size-5 text-green-500" />
          ) : awsChecked || cdkChecked ? (
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
                Verify your AWS credentials and connection.
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
              <span className="text-sm text-muted-foreground">Verifying AWS credentials...</span>
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
                <span className="font-mono truncate max-w-75">{identity.arn}</span>
              </div>
            </div>
          )}

          {awsTerminalOutput.length > 0 && (
            <TerminalOutput lines={awsTerminalOutput} maxHeight="150px" />
          )}
        </div>

        {/* CDK Stacks */}
        {awsPassed && cdkStacks.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Server className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">CDK Stacks Found</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {cdkStacks.map((stack) => (
                <Badge key={stack.name} variant="secondary" className="font-mono text-xs">
                  {stack.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* CDK Bootstrap Section */}
        {awsPassed && (
          <>
            <Separator />

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Rocket className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">CDK Bootstrap</span>
                {cdkSuccess && <CheckCircle className="size-4 text-green-500" />}
              </div>

              {!cdkChecked && !cdkLoading && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground">
                    CDK needs a one-time bootstrap to deploy resources in your AWS account.
                  </p>
                  <Button onClick={onBootstrapCdk} size="sm" className="w-fit">
                    <Rocket className="mr-2 size-3.5" />
                    Bootstrap CDK
                  </Button>
                </div>
              )}

              {cdkLoading && (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 className="size-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">
                    Bootstrapping CDK... This may take a minute.
                  </span>
                </div>
              )}

              {cdkError && (
                <Alert variant="destructive">
                  <AlertDescription className="text-sm">{cdkError}</AlertDescription>
                </Alert>
              )}

              {cdkTerminalOutput.length > 0 && (
                <TerminalOutput lines={cdkTerminalOutput} maxHeight="200px" />
              )}
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
              disabled={awsLoading || cdkLoading}
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
