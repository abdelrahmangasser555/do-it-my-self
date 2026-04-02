// Java (Spring Boot) setup flow — 4 steps: Install, Properties, Controller, Example
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
  javaInstall,
  javaProperties,
  javaUploadApi,
  javaExample,
  type AwsCredentials,
} from './setup-snippets';

const STEPS = [
  { label: 'Install' },
  { label: 'Properties' },
  { label: 'Controller' },
  { label: 'Example' },
];

interface JavaFlowProps {
  bucket: Bucket;
  creds?: AwsCredentials;
  onBack: () => void;
}

export function JavaFlow({ bucket, creds, onBack }: JavaFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);

  return (
    <div className="space-y-6">
      <FrameworkHeader framework="java" onBack={onBack} />
      <StepIndicator steps={STEPS} currentStep={currentStep} onStepClick={setCurrentStep} />
      <Separator />

      {currentStep === 0 && (
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-semibold">Maven Dependencies</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add the AWS SDK for Java v2 to your pom.xml.
            </p>
          </div>
          <CodeBlock language="xml" code={javaInstall()} />
        </div>
      )}

      {currentStep === 1 && (
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-semibold">Application Properties</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure your S3 bucket settings in application.properties.
            </p>
          </div>
          <CodeBlock
            title="src/main/resources/application.properties"
            language="properties"
            code={javaProperties(bucket, creds)}
          />
        </div>
      )}

      {currentStep === 2 && (
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-semibold">Storage Controller</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              A Spring REST controller with presigned URL generation, upload, and model-linked deletion.
            </p>
          </div>
          <CodeBlock
            title="StorageController.java"
            language="java"
            code={javaUploadApi(bucket)}
            collapsible
          />
        </div>
      )}

      {currentStep === 3 && (
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-semibold">Usage Example</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configuration bean and service example showing how to inject the S3 client.
            </p>
          </div>
          <CodeBlock
            title="StorageService.java"
            language="java"
            code={javaExample()}
            collapsible
            defaultCollapsed={false}
          />
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <Check className="size-4" /> Ready to go!
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Upload files via <code className="text-[10px]">POST /api/storage/presigned-url</code> and manage
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
