// Node.js (Express) setup flow — 3 steps: Install, APIs, Example
'use client';

import { useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { CodeBlock } from '@/components/code-block';
import { StepIndicator } from './step-indicator';
import { FrameworkHeader } from './framework-selector';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import type { Bucket } from '@/lib/types';
import {
  generateEnvSnippet,
  nodejsInstall,
  nodejsEnv,
  nodejsUploadApi,
  nodejsExample,
  type AwsCredentials,
} from './setup-snippets';

const STEPS = [
  { label: 'Install' },
  { label: 'Backend API' },
  { label: 'Example' },
];

interface NodejsFlowProps {
  bucket: Bucket;
  creds?: AwsCredentials;
  onBack: () => void;
}

export function NodejsFlow({ bucket, creds, onBack }: NodejsFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);

  return (
    <div className="space-y-6">
      <FrameworkHeader framework="nodejs" onBack={onBack} />
      <StepIndicator steps={STEPS} currentStep={currentStep} onStepClick={setCurrentStep} />
      <Separator />

      {currentStep === 0 && (
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-semibold">Install Dependencies</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add the AWS SDK and upload middleware to your Express project.
            </p>
          </div>
          <CodeBlock language="bash" code={nodejsInstall()} />
          <Separator />
          <div>
            <h4 className="text-sm font-semibold">Environment Variables</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Create a <code className="text-[10px]">.env</code> file with your bucket credentials.
            </p>
          </div>
          <CodeBlock title=".env" language="bash" code={nodejsEnv(bucket, creds)} />
        </div>
      )}

      {currentStep === 1 && (
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-semibold">Express Upload Route</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              A complete Express router with presigned URL generation, direct uploads, and model-linked deletion.
            </p>
          </div>
          <CodeBlock
            title="routes/storage.js"
            language="javascript"
            code={nodejsUploadApi(bucket)}
            collapsible
          />
        </div>
      )}

      {currentStep === 2 && (
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-semibold">Usage Example</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Mount the router and call it from your existing app.
            </p>
          </div>
          <CodeBlock
            title="index.js"
            language="javascript"
            code={nodejsExample()}
            collapsible
            defaultCollapsed={false}
          />
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <Check className="size-4" /> Ready to go!
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Upload files via <code className="text-[10px]">POST /api/storage/presigned-url</code> and delete
              by key or model ID. Files will appear in your DropOut dashboard under this bucket.
            </p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="ghost" size="sm" onClick={() => setCurrentStep((s) => s - 1)} disabled={currentStep === 0}>
          <ArrowLeft className="size-3.5 mr-1.5" /> Previous
        </Button>
        <span className="text-xs text-muted-foreground">
          Step {currentStep + 1} of {STEPS.length}
        </span>
        <Button
          variant={currentStep === STEPS.length - 1 ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            if (currentStep < STEPS.length - 1) setCurrentStep((s) => s + 1);
            else onBack();
          }}
        >
          {currentStep === STEPS.length - 1 ? (
            <><Check className="size-3.5 mr-1.5" /> Done</>
          ) : (
            <>Next <ArrowRight className="size-3.5 ml-1.5" /></>
          )}
        </Button>
      </div>
    </div>
  );
}
