// Framework-aware code snippet display with structured sections
'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CodeBlock } from '@/components/code-block';
import { Separator } from '@/components/ui/separator';
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
  generateLinkedUploadSnippet,
} from '@/features/infrastructure/utils/snippet-generator';

interface CodeSnippetsProps {
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

export function CodeSnippets({ bucket }: CodeSnippetsProps) {
  const maxMB = bucket.config?.maxFileSizeMB ?? 100;
  const [framework, setFramework] = useState<Framework>('nextjs');

  return (
    <div className="space-y-8">
      {/* Bucket context chips */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="font-mono text-xs">
          {bucket.s3BucketName}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {bucket.region}
        </Badge>
        <Badge variant="outline" className="text-xs">
          Max {maxMB} MB
        </Badge>
        {bucket.config?.encryption !== 'none' && (
          <Badge variant="outline" className="text-xs">
            {bucket.config?.encryption?.toUpperCase()} Encryption
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

      <Separator />

      {/* Step 6: Linked Uploads */}
      <div className="space-y-3">
        <SectionHeader
          step={6}
          title="Linked vs Orphan Files"
          description="Associate uploads with application records to prevent orphan files"
        />
        <div className="rounded-md bg-muted/50 p-4 text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Linked File:</strong> Uploaded with <code className="text-xs">linkedModel</code>{' '}
            + <code className="text-xs">linkedModelId</code> — tied to a specific record.
          </p>
          <p>
            <strong>Orphan File:</strong> Uploaded without linking metadata — exists in S3 but not
            associated with anything.
          </p>
          <p className="text-xs">Orphan files still cost money. Always link files when possible.</p>
        </div>
        <CodeBlock
          title="Linked Upload Example"
          language="typescript"
          code={generateLinkedUploadSnippet(bucket)}
          collapsible
          defaultCollapsed
        />
      </div>
    </div>
  );
}
