// Setup & Integration tab — structured code snippets with install commands
'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CodeBlock } from '@/components/code-block';
import { Separator } from '@/components/ui/separator';
import { Code2, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
              <p className="text-xs max-w-[200px]">
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
