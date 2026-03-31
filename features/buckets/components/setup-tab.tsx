// Setup & Integration tab — structured code snippets with install commands
'use client';

import { useState, useCallback, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CodeBlock } from '@/components/code-block';
import { Separator } from '@/components/ui/separator';
import { Code2, Info, Upload, X, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { Bucket } from '@/lib/types';
import {
  generateInstallSnippet,
  generateEnvSnippet,
  generateNextjsUploadApi,
  generateNodeExpressUploadApi,
  generatePythonUploadApi,
  generateJavaUploadApi,
  generateFrontendUploadSnippet,
  generateDeleteSnippet,
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

  return (
    <div className="space-y-8">
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
        <CodeBlock title=".env.local" language="bash" code={generateEnvSnippet(bucket)} />
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
    </div>
  );
}
