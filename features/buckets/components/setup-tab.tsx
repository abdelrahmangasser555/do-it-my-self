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
import type { AppMode } from '@/lib/types';

interface SetupTabProps {
  bucket: Bucket;
  mode?: AppMode;
}

export function SetupTab({ bucket, mode: appMode = 'developer' }: SetupTabProps) {
  const maxMB = bucket.config?.maxFileSizeMB ?? 100;
  const [mode, setMode] = useState<'manual' | 'sdk' | 'ai'>(
    appMode === 'vibecoder' ? 'ai' : 'manual',
  );
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

  useEffect(() => {
    if (appMode === 'developer') {
      return;
    }

    setMode(appMode === 'vibecoder' ? 'ai' : 'manual');
    setSelectedFramework(null);
  }, [appMode, bucket.id]);

  const handleCopyPrompt = useCallback(() => {
    const prompt = generateAIAssistantPrompt(bucket, awsCreds, extraInstructions);
    navigator.clipboard.writeText(prompt).then(() => {
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    });
  }, [bucket, awsCreds, extraInstructions]);

  const handleBack = useCallback(() => setSelectedFramework(null), []);

  const manualSetupContent = !selectedFramework ? (
    <FrameworkSelector onSelect={setSelectedFramework} />
  ) : selectedFramework === 'nextjs' ? (
    <NextjsFlow bucket={bucket} creds={awsCreds} onBack={handleBack} />
  ) : selectedFramework === 'nodejs' ? (
    <NodejsFlow bucket={bucket} creds={awsCreds} onBack={handleBack} />
  ) : selectedFramework === 'python' ? (
    <PythonFlow bucket={bucket} creds={awsCreds} onBack={handleBack} />
  ) : selectedFramework === 'java' ? (
    <JavaFlow bucket={bucket} creds={awsCreds} onBack={handleBack} />
  ) : null;

  const aiAssistantContent = (
    <>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
        <div className="min-w-0 space-y-4">
          <div className="flex items-start justify-between gap-3 rounded-xl border bg-card p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold">AI Prompt Generator</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Copy this markdown prompt into Copilot, Claude, or ChatGPT to generate a bucket
                  integration using this exact storage configuration.
                </p>
              </div>
            </div>
            <Button onClick={handleCopyPrompt} size="sm" className="gap-2 shrink-0">
              {promptCopied ? (
                <>
                  <Check className="size-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="size-4" />
                  Copy
                </>
              )}
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Extra Instructions{' '}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Textarea
              placeholder="e.g. Use TypeScript strict mode. Store the CDN URL in a Prisma User model's avatarUrl field. Use shadcn/ui for the upload button."
              className="min-h-24 resize-none text-sm"
              value={extraInstructions}
              onChange={(e) => setExtraInstructions(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              These notes are appended to the generated markdown prompt.
            </p>
          </div>

          <CodeBlock
            title="AI Integration Prompt"
            language="markdown"
            code={generateAIAssistantPrompt(bucket, awsCreds, extraInstructions)}
            collapsible
            defaultCollapsed={false}
          />
        </div>

        <div className="space-y-4 lg:sticky lg:top-4">
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertDescription className="text-xs">
              This prompt can contain <strong>real AWS credentials</strong>. Do not paste it into
              public chats, shared workspaces, or any tool you do not trust.
            </AlertDescription>
          </Alert>

          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="text-sm font-semibold">What this prompt includes</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="outline" className="font-mono text-xs">
                {bucket.s3BucketName}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {bucket.region}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Max {maxMB} MB
              </Badge>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              The generated markdown is grounded in this exact bucket so the AI can target the
              correct region, limits, and storage path immediately.
            </p>
          </div>

          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="text-sm font-semibold">Suggested flow</p>
            <div className="mt-3 flex flex-col gap-3">
              {[
                'Copy the markdown prompt from the left panel.',
                'Paste it into your trusted AI assistant.',
                'Bring the generated upload code back into your app and test it against this bucket.',
              ].map((step, index) => (
                <div key={step} className="flex items-start gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                    {index + 1}
                  </span>
                  <p className="text-xs text-muted-foreground">{step}</p>
                </div>
              ))}
            </div>
          </div>

          {awsCreds.accessKeyId ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700">
              <CheckCircle2 className="size-4" />
              Credentials are included in the prompt.
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              <AlertCircle className="size-4" />
              Credential placeholders will be used until AWS settings are configured.
            </div>
          )}
        </div>
      </div>
    </>
  );

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

      {appMode === 'vibecoder' || appMode === 'easy' ? (
        <div className="space-y-4">
          <Alert>
            {appMode === 'vibecoder' ? (
              <Sparkles className="size-4" />
            ) : (
              <Info className="size-4" />
            )}
            <AlertDescription>
              {appMode === 'vibecoder'
                ? 'Vibecoder Mode opens on the AI prompt first, but the guided setup is still available whenever you want to inspect the manual flow.'
                : 'Easy Mode opens on the guided flow first, but you can switch to the AI prompt whenever you want an assistant to draft the integration for you.'}
            </AlertDescription>
          </Alert>

          <Tabs
            value={mode === 'sdk' ? 'manual' : mode}
            onValueChange={(value) => setMode(value as 'manual' | 'ai')}
          >
            <TabsList className="grid w-full max-w-sm grid-cols-2">
              <TabsTrigger value="manual" className="gap-1.5">
                <Wrench className="size-3.5" />
                Guided Setup
              </TabsTrigger>
              <TabsTrigger value="ai" className="gap-1.5">
                <Sparkles className="size-3.5" />
                AI Prompt
              </TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="mt-6 space-y-6">
              {manualSetupContent}
            </TabsContent>

            <TabsContent value="ai" className="mt-6 space-y-6">
              {aiAssistantContent}
            </TabsContent>
          </Tabs>
        </div>
      ) : (
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

          <TabsContent value="manual" className="mt-6 space-y-6">
            {manualSetupContent}
          </TabsContent>

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

          <TabsContent value="ai" className="mt-6 space-y-6">
            {aiAssistantContent}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
