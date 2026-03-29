// Step 1 — Environment Validation: checks Node, npm, AWS CLI, CDK
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
  Terminal,
  Box,
  Cloud,
  Layers,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { DependencyResult } from "../hooks/use-environment-validation";

interface EnvironmentStepProps {
  results: DependencyResult[];
  loading: boolean;
  allPassed: boolean;
  checked: boolean;
  onRecheck: () => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  node: <Box className="size-4" />,
  npm: <Terminal className="size-4" />,
  aws: <Cloud className="size-4" />,
  cdk: <Layers className="size-4" />,
};

function StatusIcon({ available, loading: isChecking }: { available: boolean | null; loading: boolean }) {
  if (isChecking) return <Loader2 className="size-4 animate-spin text-muted-foreground" />;
  if (available === null) return <Circle className="size-4 text-muted-foreground" />;
  if (available) return <CheckCircle className="size-4 text-green-500" />;
  return <XCircle className="size-4 text-red-500" />;
}

function CopySnippet({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="relative mt-2">
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

export function EnvironmentStep({
  results,
  loading,
  allPassed,
  checked,
  onRecheck,
}: EnvironmentStepProps) {
  return (
    <Card className="rounded-xl border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-sm font-bold text-primary">
            1
          </div>
          <div>
            <CardTitle className="text-base">Environment</CardTitle>
            <p className="text-sm text-muted-foreground">
              Check required dependencies
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {checked && (
            <Badge variant={allPassed ? "default" : "destructive"} className="text-xs">
              {allPassed ? "All Passed" : "Missing Dependencies"}
            </Badge>
          )}
          {loading ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : checked ? (
            allPassed ? (
              <CheckCircle className="size-5 text-green-500" />
            ) : (
              <XCircle className="size-5 text-red-500" />
            )
          ) : (
            <Circle className="size-5 text-muted-foreground" />
          )}
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="p-6 space-y-4">
        {!checked && !loading && (
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-sm text-muted-foreground">
              Click below to check your local environment.
            </p>
            <Button onClick={onRecheck} size="sm">
              <RefreshCw className="mr-2 size-3.5" />
              Run Environment Check
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2 py-6">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Checking dependencies...</span>
          </div>
        )}

        {checked && results.length > 0 && (
          <div className="space-y-3">
            {results.map((dep) => (
              <div key={dep.name} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {ICON_MAP[dep.icon] || <Terminal className="size-4" />}
                    <span className="text-sm font-medium">{dep.name}</span>
                    {dep.version && (
                      <span className="font-mono text-xs text-muted-foreground">
                        {dep.version}
                      </span>
                    )}
                  </div>
                  <StatusIcon available={dep.available} loading={false} />
                </div>

                {!dep.available && (
                  <CopySnippet text={dep.installSnippet} />
                )}
              </div>
            ))}

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-3">
                <span className="text-xs text-muted-foreground">Need help?</span>
                <a
                  href="https://nodejs.org/en/download"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  <ExternalLink className="size-3" />
                  Node.js
                </a>
                <a
                  href="https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  <ExternalLink className="size-3" />
                  AWS CLI
                </a>
                <a
                  href="https://www.youtube.com/results?search_query=install+nodejs+aws+cli+aws+cdk+tutorial"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  <ExternalLink className="size-3" />
                  Video Tutorials
                </a>
              </div>
              <Button variant="outline" size="sm" onClick={onRecheck} disabled={loading}>
                <RefreshCw className="mr-2 size-3.5" />
                Recheck
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
