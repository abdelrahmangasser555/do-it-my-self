// Next.js setup flow — 5 steps: Install, APIs, Hooks, Components, Example
'use client';

import { useState, useEffect } from 'react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CodeBlock } from '@/components/code-block';
import { StepIndicator } from './step-indicator';
import { FrameworkHeader } from './framework-selector';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import type { Bucket } from '@/lib/types';
import {
  generateEnvSnippet,
  nextjsInstall,
  nextjsUploadApi,
  nextjsDeleteApi,
  nextjsHooks,
  nextjsComponentShadcn,
  nextjsAvatarShadcn,
  nextjsButtonUploadShadcn,
  nextjsFilesTableShadcn,
  nextjsComponentPlain,
  nextjsExampleUsage,
  type AwsCredentials,
} from './setup-snippets';

const STEPS = [
  { label: 'Install' },
  { label: 'Backend APIs' },
  { label: 'Hooks' },
  { label: 'Components' },
  { label: 'Example' },
];

interface NextjsFlowProps {
  bucket: Bucket;
  creds?: AwsCredentials;
  onBack: () => void;
}

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
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        {step}
      </span>
      <div>
        <h4 className="text-sm font-semibold">{title}</h4>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}

export function NextjsFlow({ bucket, creds, onBack }: NextjsFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);

  return (
    <div className="space-y-6">
      <FrameworkHeader framework="nextjs" onBack={onBack} />
      <StepIndicator
        steps={STEPS}
        currentStep={currentStep}
        onStepClick={setCurrentStep}
      />
      <Separator />

      {/* Step 0: Installation & Environment Variables */}
      {currentStep === 0 && (
        <div className="space-y-6">
          <SectionHeader
            step={1}
            title="Install Dependencies"
            description="Add the AWS SDK packages to your Next.js project"
          />
          <CodeBlock language="bash" code={nextjsInstall()} />

          <Separator />

          <SectionHeader
            step={2}
            title="Environment Variables"
            description="Add these to your .env.local file"
          />
          <CodeBlock title=".env.local" language="bash" code={generateEnvSnippet(bucket, creds)} />
        </div>
      )}

      {/* Step 1: Backend APIs */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <SectionHeader
            step={1}
            title="Upload API Route"
            description="Generates presigned URLs for direct S3 uploads with model linking support"
          />
          <CodeBlock
            title="app/api/storage/upload/route.ts"
            language="typescript"
            code={nextjsUploadApi(bucket)}
            collapsible
          />

          <Separator />

          <SectionHeader
            step={2}
            title="Delete API Route"
            description="Delete files by key or by model instance (cleans up all linked files)"
          />
          <CodeBlock
            title="app/api/storage/delete/route.ts"
            language="typescript"
            code={nextjsDeleteApi(bucket)}
            collapsible
          />
        </div>
      )}

      {/* Step 2: Hooks */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <SectionHeader
            step={1}
            title="Storage Hooks"
            description="Custom React hooks for uploading, deleting, and managing files. These hooks handle progress tracking, model linking, and error states."
          />

          <div className="rounded-lg border bg-card p-4 space-y-2">
            <p className="text-sm font-medium">Exported hooks:</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="flex items-start gap-2 rounded-md border p-3">
                <Badge className="bg-primary/10 text-primary text-[10px] shrink-0 mt-0.5">
                  useUpload
                </Badge>
                <div>
                  <p className="text-xs font-medium">Core upload hook</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Returns: <code className="text-[10px]">createFile</code>, <code className="text-[10px]">deleteByFileId</code>, <code className="text-[10px]">deleteByModelId</code>, <code className="text-[10px]">uploadMultiple</code>, <code className="text-[10px]">files</code>, <code className="text-[10px]">isUploading</code>
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-md border p-3">
                <Badge className="bg-primary/10 text-primary text-[10px] shrink-0 mt-0.5">
                  useFileList
                </Badge>
                <div>
                  <p className="text-xs font-medium">File listing hook</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Returns: <code className="text-[10px]">files</code>, <code className="text-[10px]">loading</code>, <code className="text-[10px]">refresh</code>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <CodeBlock
            title="hooks/use-storage.ts"
            language="typescript"
            code={nextjsHooks(bucket)}
            collapsible
          />
        </div>
      )}

      {/* Step 3: Frontend Components */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <SectionHeader
            step={1}
            title="Frontend Components"
            description="Ready-to-use upload components that internally use the hooks above. All support model/modelId props."
          />

          <div className="rounded-lg border bg-card p-4 space-y-2">
            <p className="text-sm font-medium">Component props (shared across all):</p>
            <div className="grid grid-cols-2 gap-1.5 text-xs sm:grid-cols-3">
              {[
                { name: 'model', desc: 'Model name (e.g. "User")' },
                { name: 'modelId', desc: 'Instance ID (e.g. "usr_123")' },
                { name: 'allowDownload', desc: 'Enable download button' },
                { name: 'allowOpenPreview', desc: 'Enable CDN preview link' },
                { name: 'disabled', desc: 'Read-only mode' },
                { name: 'onUploadComplete', desc: 'Callback with file metadata' },
              ].map((p) => (
                <div key={p.name} className="rounded-md bg-muted p-2">
                  <code className="text-[10px] font-semibold text-primary">{p.name}</code>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <Tabs defaultValue="shadcn">
            <TabsList>
              <TabsTrigger value="shadcn">shadcn/ui</TabsTrigger>
              <TabsTrigger value="plain">Plain JSX</TabsTrigger>
            </TabsList>

            <TabsContent value="shadcn" className="space-y-6 mt-4">
              <div className="space-y-3">
                <Badge variant="outline">FileUpload</Badge>
                <p className="text-xs text-muted-foreground">Drag & drop upload with progress, file list, and model linking.</p>
                <CodeBlock
                  title="components/storage/file-upload.tsx"
                  language="typescript"
                  code={nextjsComponentShadcn(bucket)}
                  collapsible
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <Badge variant="outline">AvatarUpload</Badge>
                <p className="text-xs text-muted-foreground">Single image upload for avatars with circle/rounded shapes.</p>
                <CodeBlock
                  title="components/storage/avatar-upload.tsx"
                  language="typescript"
                  code={nextjsAvatarShadcn(bucket)}
                  collapsible
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <Badge variant="outline">ButtonUpload</Badge>
                <p className="text-xs text-muted-foreground">Compact button upload for forms and table rows. No drop zone.</p>
                <CodeBlock
                  title="components/storage/button-upload.tsx"
                  language="typescript"
                  code={nextjsButtonUploadShadcn(bucket)}
                  collapsible
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <Badge variant="outline">FilesTable</Badge>
                <p className="text-xs text-muted-foreground">Table displaying uploaded files with orphan status, download, and preview.</p>
                <CodeBlock
                  title="components/storage/files-table.tsx"
                  language="typescript"
                  code={nextjsFilesTableShadcn()}
                  collapsible
                />
              </div>
            </TabsContent>

            <TabsContent value="plain" className="space-y-6 mt-4">
              <div className="space-y-3">
                <Badge variant="outline">FileUpload (Plain JSX)</Badge>
                <p className="text-xs text-muted-foreground">Same functionality without shadcn/ui dependency. Uses inline styles.</p>
                <CodeBlock
                  title="components/storage/file-upload.tsx"
                  language="typescript"
                  code={nextjsComponentPlain(bucket)}
                  collapsible
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Step 4: Example Usage */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <SectionHeader
            step={1}
            title="Full Example Page"
            description="Copy this page to see all components in action with model linking and orphan demonstration."
          />
          <CodeBlock
            title="app/example/page.tsx"
            language="typescript"
            code={nextjsExampleUsage(bucket)}
            collapsible
            defaultCollapsed={false}
          />

          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <Check className="size-4" /> You&apos;re all set!
            </p>
            <p className="text-xs text-muted-foreground">
              Files uploaded with <code className="text-[10px]">model</code> and <code className="text-[10px]">modelId</code> props
              will be linked to your data models and appear as &ldquo;Linked&rdquo; in the dashboard.
              Files without these props will be flagged as orphans — you can manage them from the bucket&apos;s
              S3 Files tab.
            </p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentStep((s) => s - 1)}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="size-3.5 mr-1.5" /> Previous
        </Button>
        <span className="text-xs text-muted-foreground">
          Step {currentStep + 1} of {STEPS.length}
        </span>
        <Button
          variant={currentStep === STEPS.length - 1 ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            if (currentStep < STEPS.length - 1) {
              setCurrentStep((s) => s + 1);
            } else {
              onBack();
            }
          }}
        >
          {currentStep === STEPS.length - 1 ? (
            <>
              <Check className="size-3.5 mr-1.5" /> Done
            </>
          ) : (
            <>
              Next <ArrowRight className="size-3.5 ml-1.5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
