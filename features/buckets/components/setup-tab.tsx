// Setup & Integration tab — structured code snippets with install commands
'use client';

import { useState, useCallback, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CodeBlock } from '@/components/code-block';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import {
  Code2,
  Info,
  Upload,
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Sparkles,
  Wrench,
  AlertTriangle,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { Bucket } from '@/lib/types';
import { ComponentsPreviewTab } from '@/features/buckets/components/components-preview-tab';
import {
  generateInstallSnippet,
  generateEnvSnippet,
  generateNextjsUploadApi,
  generateNodeExpressUploadApi,
  generatePythonUploadApi,
  generateJavaUploadApi,
  generateFrontendUploadSnippet,
  generateDeleteSnippet,
  generateAIAssistantPrompt,
  type AwsCredentials,
} from '@/features/infrastructure/utils/snippet-generator';

interface SetupTabProps {
  bucket: Bucket;
}

const FRAMEWORKS = [
  { value: 'nextjs', label: 'Next.js', lang: 'bash' },
  { value: 'node', label: 'Node.js', lang: 'bash' },
  { value: 'python', label: 'Python', lang: 'bash' },
  { value: 'java', label: 'Java', lang: 'xml' },
] as const;

type Framework = (typeof FRAMEWORKS)[number]['value'];

function SectionHeader({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
        {step}
      </span>
      <div>
        <h4 className="text-sm font-semibold">{title}</h4>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}

function formatPreviewBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

interface MockFile {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: 'uploading' | 'complete' | 'error';
  error?: string;
}

const DEMO_FILES: MockFile[] = [
  { id: '1', name: 'hero-banner.png', size: 2_450_000, progress: 100, status: 'complete' },
  { id: '2', name: 'product-photo.jpg', size: 1_820_000, progress: 72, status: 'uploading' },
  {
    id: '3',
    name: 'document.pdf',
    size: 5_600_000,
    progress: 0,
    status: 'error',
    error: 'Network timeout',
  },
];

function UploadPreview({ maxMB }: { maxMB: number }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [demoFiles, setDemoFiles] = useState<MockFile[]>(DEMO_FILES);

  const removeDemoFile = useCallback((id: string) => {
    setDemoFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          UI Preview
        </p>
        <Badge variant="outline" className="text-[10px]">
          Interactive Demo
        </Badge>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
        }}
        className={cn(
          'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors',
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50',
        )}
      >
        <div className="rounded-full bg-muted p-3">
          <Upload className="size-5 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">Drop files here or click to browse</p>
          <p className="text-xs text-muted-foreground mt-1">Max file size: {maxMB} MB</p>
        </div>
      </div>

      {/* Demo file list */}
      {demoFiles.length > 0 && (
        <div className="space-y-2">
          {demoFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 rounded-lg border bg-background p-3"
            >
              <FileText className="size-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <span className="text-xs text-muted-foreground ml-2 shrink-0">
                    {formatPreviewBytes(file.size)}
                  </span>
                </div>
                {file.status === 'uploading' && (
                  <Progress value={file.progress} className="mt-1.5 h-1" />
                )}
                {file.status === 'error' && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="size-3" /> {file.error}
                  </p>
                )}
                {file.status === 'complete' && (
                  <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="size-3" /> Uploaded
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 shrink-0"
                onClick={() => removeDemoFile(file.id)}
              >
                <X className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SetupTab({ bucket }: SetupTabProps) {
  const maxMB = bucket.config?.maxFileSizeMB ?? 100;
  const [framework, setFramework] = useState<Framework>('nextjs');
  const [mode, setMode] = useState<'manual' | 'sdk' | 'ai'>('manual');

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

        {/* ─── MANUAL TAB ─── */}
        <TabsContent value="manual" className="mt-6 space-y-8">
          {/* Step 1: Install Dependencies */}
          <div className="space-y-3">
            <SectionHeader
              step={1}
              title="Install Dependencies"
              description="Add the required packages to your project"
            />
            <Tabs value={framework} onValueChange={(v) => setFramework(v as Framework)}>
              <TabsList className="grid w-full max-w-md grid-cols-4">
                {FRAMEWORKS.map((fw) => (
                  <TabsTrigger key={fw.value} value={fw.value}>
                    {fw.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {FRAMEWORKS.map((fw) => (
                <TabsContent key={fw.value} value={fw.value}>
                  <CodeBlock language={fw.lang} code={generateInstallSnippet(fw.value)} />
                </TabsContent>
              ))}
            </Tabs>
          </div>

          <Separator />

          {/* Step 2: Environment Variables */}
          <div className="space-y-3">
            <SectionHeader
              step={2}
              title="Environment Variables"
              description="Add these to your .env.local (or equivalent) file"
            />
            <CodeBlock
              title=".env.local"
              language="bash"
              code={generateEnvSnippet(bucket, awsCreds)}
            />
          </div>

          <Separator />

          {/* Step 3: Upload API */}
          <div className="space-y-3">
            <SectionHeader
              step={3}
              title="Upload API Endpoint"
              description="Server-side presigned URL generation — matches the framework selected above"
            />
            <Tabs value={framework} onValueChange={(v) => setFramework(v as Framework)}>
              <TabsList className="grid w-full max-w-md grid-cols-4">
                {FRAMEWORKS.map((fw) => (
                  <TabsTrigger key={fw.value} value={fw.value}>
                    {fw.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="nextjs">
                <CodeBlock
                  title="app/api/upload/route.ts"
                  language="typescript"
                  code={generateNextjsUploadApi(bucket)}
                  collapsible
                />
              </TabsContent>
              <TabsContent value="node">
                <CodeBlock
                  title="routes/upload.js"
                  language="javascript"
                  code={generateNodeExpressUploadApi(bucket)}
                  collapsible
                />
              </TabsContent>
              <TabsContent value="python">
                <CodeBlock
                  title="upload.py"
                  language="python"
                  code={generatePythonUploadApi(bucket)}
                  collapsible
                />
              </TabsContent>
              <TabsContent value="java">
                <CodeBlock
                  title="UploadController.java"
                  language="java"
                  code={generateJavaUploadApi(bucket)}
                  collapsible
                />
              </TabsContent>
            </Tabs>
          </div>

          <Separator />

          {/* Step 4: Frontend Component */}
          <div className="space-y-3">
            <SectionHeader
              step={4}
              title="Frontend Upload Component"
              description="Full React component with dropzone, progress tracking, and file list"
            />

            {/* Interactive UI Preview */}
            <UploadPreview maxMB={maxMB} />

            <CodeBlock
              title="components/file-upload.tsx"
              language="typescript"
              code={generateFrontendUploadSnippet(bucket)}
              collapsible
            />
          </div>

          <Separator />

          {/* Step 5: Delete API */}
          <div className="space-y-3">
            <SectionHeader
              step={5}
              title="Delete API Route"
              description="Remove objects from S3 via your server"
            />
            <CodeBlock
              title="app/api/delete-file/route.ts"
              language="typescript"
              code={generateDeleteSnippet(bucket)}
              collapsible
              defaultCollapsed
            />
          </div>

          <Separator />

          {/* Step 6: Component Preview */}
          <div className="space-y-3">
            <SectionHeader
              step={6}
              title="Component Preview"
              description="Interactive previews of upload components with live configuration"
            />
            <ComponentsPreviewTab bucket={bucket} />
          </div>
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
          <Alert
            variant="destructive"
            className="border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400"
          >
            <AlertTriangle className="size-4 text-amber-500!" />
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
