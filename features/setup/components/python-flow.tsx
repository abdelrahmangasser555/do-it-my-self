// Python (Flask/FastAPI) setup flow — 4 steps: Install, API, Utilities, Example
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
  pythonInstall,
  pythonEnv,
  pythonUploadApi,
  pythonUtilFunctions,
  pythonExample,
  type AwsCredentials,
} from './setup-snippets';

const STEPS = [
  { label: 'Install' },
  { label: 'Upload API' },
  { label: 'Utilities' },
  { label: 'Example' },
];

interface PythonFlowProps {
  bucket: Bucket;
  creds?: AwsCredentials;
  onBack: () => void;
}

export function PythonFlow({ bucket, creds, onBack }: PythonFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);

  return (
    <div className="space-y-6">
      <FrameworkHeader framework="python" onBack={onBack} />
      <StepIndicator steps={STEPS} currentStep={currentStep} onStepClick={setCurrentStep} />
      <Separator />

      {currentStep === 0 && (
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-semibold">Install Dependencies</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add boto3 and a web framework to your Python project.
            </p>
          </div>
          <CodeBlock language="bash" code={pythonInstall()} />
          <Separator />
          <div>
            <h4 className="text-sm font-semibold">Environment Variables</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Create a <code className="text-[10px]">.env</code> file with your bucket credentials.
            </p>
          </div>
          <CodeBlock title=".env" language="bash" code={pythonEnv(bucket, creds)} />
        </div>
      )}

      {currentStep === 1 && (
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-semibold">Upload API (FastAPI)</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              A FastAPI router with presigned URL generation and model-linked file management.
            </p>
          </div>
          <CodeBlock
            title="routers/storage.py"
            language="python"
            code={pythonUploadApi(bucket)}
            collapsible
          />
        </div>
      )}

      {currentStep === 2 && (
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-semibold">Utility Functions</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Helper functions for common operations like listing files, deleting by model, and generating CDN URLs.
            </p>
          </div>
          <CodeBlock
            title="utils/storage.py"
            language="python"
            code={pythonUtilFunctions(bucket)}
            collapsible
          />
        </div>
      )}

      {currentStep === 3 && (
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-semibold">Usage Example</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              A complete FastAPI app demonstrating file upload with model linking.
            </p>
          </div>
          <CodeBlock
            title="main.py"
            language="python"
            code={pythonExample()}
            collapsible
            defaultCollapsed={false}
          />
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <Check className="size-4" /> Ready to go!
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Upload files via <code className="text-[10px]">POST /storage/presigned-url</code> and manage
              them from your DropOut dashboard.
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
