// Main onboarding page — single route with step-based internal state
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  HardDrive,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useOnboardingState } from "../hooks/use-onboarding-state";
import { useEnvironmentValidation } from "../hooks/use-environment-validation";
import { useAwsValidation } from "../hooks/use-aws-validation";
import { useCdkBootstrap } from "../hooks/use-cdk-bootstrap";
import { useAiOptionalSetup } from "../hooks/use-ai-optional-setup";
import { EnvironmentStep } from "./environment-step";
import { AwsStep } from "./aws-step";
import { AiStep } from "./ai-step";

export function OnboardingPage() {
  const router = useRouter();
  const { state, loading: stateLoading, updateState } = useOnboardingState();

  const envHook = useEnvironmentValidation();
  const awsHook = useAwsValidation();
  const cdkHook = useCdkBootstrap();
  const aiHook = useAiOptionalSetup();

  // Persist step results to system.json when they change
  useEffect(() => {
    if (envHook.checked && envHook.allPassed && !state.environmentValidated) {
      updateState({ environmentValidated: true });
    }
  }, [envHook.checked, envHook.allPassed, state.environmentValidated, updateState]);

  useEffect(() => {
    if (awsHook.checked && awsHook.allPassed && !state.awsValidated) {
      updateState({ awsValidated: true });
    }
  }, [awsHook.checked, awsHook.allPassed, state.awsValidated, updateState]);

  useEffect(() => {
    if (cdkHook.checked && cdkHook.success && !state.cdkBootstrapped) {
      updateState({ cdkBootstrapped: true });
    }
  }, [cdkHook.checked, cdkHook.success, state.cdkBootstrapped, updateState]);

  useEffect(() => {
    if (aiHook.checked && aiHook.configured && !state.aiConfigured) {
      updateState({ aiConfigured: true });
    }
  }, [aiHook.checked, aiHook.configured, state.aiConfigured, updateState]);

  // Compute completion
  const stepsCompleted =
    (state.environmentValidated ? 1 : 0) +
    (state.awsValidated ? 1 : 0) +
    (state.cdkBootstrapped ? 1 : 0);
  const totalRequired = 3;
  const progress = Math.round((stepsCompleted / totalRequired) * 100);

  const isReady = state.environmentValidated && state.awsValidated && state.cdkBootstrapped;

  // Compute status badge
  const getStatusBadge = () => {
    if (isReady) {
      return (
        <Badge className="gap-1 bg-green-500/10 text-green-500 border-green-500/20">
          <CheckCircle className="size-3" />
          Ready
        </Badge>
      );
    }
    if (stepsCompleted > 0) {
      return (
        <Badge className="gap-1 bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
          <AlertCircle className="size-3" />
          Incomplete
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertCircle className="size-3" />
        Not Configured
      </Badge>
    );
  };

  const handleFinish = async () => {
    await updateState({ onboardingComplete: true });
    router.push("/");
  };

  if (stateLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-6 py-10 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <HardDrive className="size-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Environment Setup
              </h1>
              <p className="text-sm text-muted-foreground">
                Let&apos;s prepare your machine and AWS account.
              </p>
            </div>
          </div>
          {getStatusBadge()}
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {stepsCompleted} of {totalRequired} steps completed
            </span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Separator />

        {/* Steps */}
        <div className="space-y-6">
          {/* Step 1 — Environment */}
          <EnvironmentStep
            results={envHook.results}
            loading={envHook.loading}
            allPassed={envHook.allPassed || state.environmentValidated}
            checked={envHook.checked || state.environmentValidated}
            onRecheck={async () => {
              const passed = await envHook.recheck();
              if (passed) {
                await updateState({ environmentValidated: true });
              }
            }}
          />

          {/* Step 2 — AWS + CDK Bootstrap */}
          <AwsStep
            identity={awsHook.identity}
            cdkStacks={awsHook.cdkStacks}
            awsLoading={awsHook.loading}
            awsError={awsHook.error}
            awsChecked={awsHook.checked || state.awsValidated}
            awsTerminalOutput={awsHook.terminalOutput}
            awsPassed={awsHook.allPassed || state.awsValidated}
            onRecheckAws={async () => {
              const passed = await awsHook.recheck();
              if (passed) {
                await updateState({ awsValidated: true });
              }
            }}
            cdkLoading={cdkHook.loading}
            cdkError={cdkHook.error}
            cdkSuccess={cdkHook.success || state.cdkBootstrapped}
            cdkChecked={cdkHook.checked || state.cdkBootstrapped}
            cdkTerminalOutput={cdkHook.terminalOutput}
            onBootstrapCdk={async () => {
              const passed = await cdkHook.recheck();
              if (passed) {
                await updateState({ cdkBootstrapped: true });
              }
            }}
          />

          {/* Step 3 — AI Setup */}
          <AiStep
            loading={aiHook.loading}
            error={aiHook.error}
            configured={aiHook.configured || state.aiConfigured}
            checked={aiHook.checked}
            onRecheck={aiHook.recheck}
            onSaveApiKey={async (key) => {
              const saved = await aiHook.saveApiKey(key);
              if (saved) {
                await updateState({ aiConfigured: true });
              }
              return saved;
            }}
          />
        </div>

        {/* Finish */}
        <Separator />

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {isReady
              ? "All required steps complete. You're ready to go!"
              : "Complete the required steps above to continue."}
          </div>
          <Button onClick={handleFinish} disabled={!isReady} size="lg">
            Enter Dashboard
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
