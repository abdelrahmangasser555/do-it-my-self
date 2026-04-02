// Setup & Integration tab — framework-first guided setup flows
'use client';

import { useState, useCallback, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CodeBlock } from '@/components/code-block';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Code2,
  Info,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Sparkles,
  Wrench,
  AlertTriangle,
} from 'lucide-react';
import type { Bucket } from '@/lib/types';
import { FrameworkSelector, type Framework } from '@/features/setup/components/framework-selector';
import { NextjsFlow } from '@/features/setup/components/nextjs-flow';
import { NodejsFlow } from '@/features/setup/components/nodejs-flow';
import { PythonFlow } from '@/features/setup/components/python-flow';
import { JavaFlow } from '@/features/setup/components/java-flow';
import {
  generateAIAssistantPrompt,
  type AwsCredentials,
} from '@/features/infrastructure/utils/snippet-generator';

interface SetupTabProps {
  bucket: Bucket;
}

export function SetupTab({ bucket }: SetupTabProps) {
  const maxMB = bucket.config?.maxFileSizeMB ?? 100;
  const [mode, setMode] = useState<'manual' | 'sdk' | 'ai'>('manual');
  const [selectedFramework, setSelectedFramework] = useState<Framework | null>(null);

  // AI Assistant tab state
  const [awsCreds, setAwsCreds] = useState<AwsCredentials>({});
  const [extraInstructions, setExtraInstructions] = useState('');
  const [promptCopied, setPromptCopied] = useState(false);

  useEffect(() => {
    fetch('/api/aws-identity/credentials')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data)
          setAwsCreds({
            accessKeyId: data.accessKeyId,
            secretAccessKey: data.secretAccessKey,
            region: data.region,
          });
      })
      .catch(() => {});
  }, []);

  const handleCopyPrompt = useCallback(() => {
    const prompt = generateAIAssistantPrompt(bucket, awsCreds, extraInstructions);
    navigator.clipboard.writeText(prompt).then(() => {
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    });
  }, [bucket, awsCreds, extraInstructions]);

  const handleBack = useCallback(() => setSelectedFramework(null), []);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Code2 className="size-5" />
          Integration Guide
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Ready-to-use code snippets for integrating with{' '}
          <span className="font-mono">{bucket.s3BucketName}</span>
        </p>
      </div>

      {/* Context chips */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="font-mono text-xs">
          {bucket.region}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {bucket.config?.encryption?.toUpperCase() || 'S3'} Encryption
        </Badge>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-xs gap-1 cursor-help">
                Max {maxMB} MB
                <Info className="size-3" />
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs max-w-50">
                Bucket-level limit ({maxMB} MB) is authoritative. Project-level limit is the default
                fallback. The lower of the two is enforced.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {bucket.config?.versioning && (
          <Badge variant="outline" className="text-xs">
            Versioning ON
          </Badge>
        )}
      </div>

      {/* Top-level mode tabs */}
      <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
        <TabsList className="grid w-full max-w-sm grid-cols-3">
          <TabsTrigger value="manual" className="gap-1.5">
            <Wrench className="size-3.5" />
            Manual
          </TabsTrigger>
          <TabsTrigger value="sdk" className="gap-1.5">
            SDK
            <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
              Soon
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-1.5">
            <Sparkles className="size-3.5" />
            AI Assistant
          </TabsTrigger>
        </TabsList>

        {/* ─── MANUAL TAB — Framework Selection + Flow ─── */}
        <TabsContent value="manual" className="mt-6 space-y-6">
          {!selectedFramework ? (
            <FrameworkSelector onSelect={setSelectedFramework} />
          ) : selectedFramework === 'nextjs' ? (
            <NextjsFlow bucket={bucket} creds={awsCreds} onBack={handleBack} />
          ) : selectedFramework === 'nodejs' ? (
            <NodejsFlow bucket={bucket} creds={awsCreds} onBack={handleBack} />
          ) : selectedFramework === 'python' ? (
            <PythonFlow bucket={bucket} creds={awsCreds} onBack={handleBack} />
          ) : selectedFramework === 'java' ? (
            <JavaFlow bucket={bucket} creds={awsCreds} onBack={handleBack} />
          ) : null}
        </TabsContent>

        {/* ─── SDK TAB ─── */}
        <TabsContent value="sdk" className="mt-6">
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed bg-muted/30 py-16 px-6 text-center">
            <div className="rounded-full bg-muted p-4">
              <Code2 className="size-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-lg">SDK Integration — Coming Soon</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Native SDK clients for JavaScript, Python, and Go with typed methods for upload,
                delete, list, and metadata operations.
              </p>
            </div>
            <Badge variant="secondary" className="text-xs">
              In Development
            </Badge>
          </div>
        </TabsContent>

        {/* ─── AI ASSISTANT TAB ─── */}
        <TabsContent value="ai" className="mt-6 space-y-6">
          <div className="flex items-start gap-3 rounded-lg border bg-card p-4">
            <Sparkles className="size-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">AI Prompt Generator</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Generate a complete, ready-to-paste prompt for GitHub Copilot, Claude, or ChatGPT.
                It includes your real bucket details, AWS credentials, and architecture context so
                the AI can set up a production-ready upload system without any back-and-forth.
              </p>
            </div>
          </div>

          {/* Credential warning */}
          <Alert variant="destructive" className="">
            <AlertTriangle className="size-4 " />
            <AlertDescription className="text-xs">
              The generated prompt contains your <strong>real AWS credentials</strong>. Only paste
              it into AI tools you trust, and never share the prompt publicly.
            </AlertDescription>
          </Alert>

          {/* Extra instructions */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Extra Instructions{' '}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Textarea
              placeholder="e.g. Use TypeScript strict mode. Store the CDN URL in a Prisma User model's avatarUrl field. Use shadcn/ui for the upload button."
              className="min-h-22.5 resize-none text-sm"
              value={extraInstructions}
              onChange={(e) => setExtraInstructions(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Added as an &ldquo;Extra Instructions&rdquo; section at the bottom of the prompt.
            </p>
          </div>

          {/* Copy button */}
          <div className="flex items-center gap-3">
            <Button onClick={handleCopyPrompt} className="gap-2">
              {promptCopied ? (
                <>
                  <Check className="size-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="size-4" />
                  Copy Prompt
                </>
              )}
            </Button>
            {awsCreds.accessKeyId ? (
              <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                <CheckCircle2 className="size-3.5" />
                Real credentials included
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <AlertCircle className="size-3.5" />
                Credential placeholders used — configure AWS credentials in Settings
              </span>
            )}
          </div>

          {/* Prompt preview */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Preview
            </p>
            <CodeBlock
              title="AI Assistant Prompt"
              language="markdown"
              code={generateAIAssistantPrompt(bucket, awsCreds, extraInstructions)}
              collapsible
              defaultCollapsed={false}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
