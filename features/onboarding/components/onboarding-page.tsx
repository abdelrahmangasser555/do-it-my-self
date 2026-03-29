// Main onboarding page — step-based with environment bootstrapping and star CTA
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
import { useAiOptionalSetup } from "../hooks/use-ai-optional-setup";
import {
  useEnvironments,
  useBootstrapEnvironment,
} from "@/features/environments/hooks/use-environments";
import { EnvironmentStep } from "./environment-step";
import { AwsStep } from "./aws-step";
import { BootstrapEnvironmentsStep } from "./bootstrap-environments-step";
import { AiStep } from "./ai-step";
import { StarRepoStep } from "./star-repo-step";

// Animation variants for step cards
const stepVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      delay: i * 0.1,
      ease: [0.25, 0.1, 0.25, 1] as const,
    },
  }),
};

export function OnboardingPage() {
  const router = useRouter();
  const { state, loading: stateLoading, updateState } = useOnboardingState();
  const [showStarStep, setShowStarStep] = useState(false);

  const envHook = useEnvironmentValidation();
  const awsHook = useAwsValidation();
  const aiHook = useAiOptionalSetup();
  const {
    environments,
    activeEnvironments,
    refetch: refetchEnvs,
  } = useEnvironments();
  const {
    bootstrapEnvironment,
    loading: bootstrapLoading,
    error: bootstrapError,
    lastErrorOutput: bootstrapErrorOutput,
    progress: bootstrapProgress,
  } = useBootstrapEnvironment();

  // Persist step results to system.json
  useEffect(() => {
    if (envHook.checked && envHook.allPassed && !state.environmentValidated) {
      updateState({ environmentValidated: true });
    }
  }, [
    envHook.checked,
    envHook.allPassed,
    state.environmentValidated,
    updateState,
  ]);

  useEffect(() => {
    if (awsHook.checked && awsHook.allPassed && !state.awsValidated) {
      updateState({ awsValidated: true });
    }
  }, [awsHook.checked, awsHook.allPassed, state.awsValidated, updateState]);

  // Mark CDK bootstrapped when at least one environment is active
  useEffect(() => {
    if (activeEnvironments.length > 0 && !state.cdkBootstrapped) {
      updateState({ cdkBootstrapped: true });
    }
  }, [activeEnvironments.length, state.cdkBootstrapped, updateState]);

  useEffect(() => {
    if (aiHook.checked && aiHook.configured && !state.aiConfigured) {
      updateState({ aiConfigured: true });
    }
  }, [aiHook.checked, aiHook.configured, state.aiConfigured, updateState]);

  const handleBootstrapRegion = useCallback(
    async (region: string) => {
      const accountId = awsHook.identity?.account || "";
      if (!accountId) return;
      await bootstrapEnvironment(region, accountId, region);
      await refetchEnvs();
    },
    [awsHook.identity, bootstrapEnvironment, refetchEnvs],
  );

  const handleRemoveEnv = useCallback(
    async (id: string) => {
      await fetch(`/api/environments?id=${id}`, { method: "DELETE" });
      await refetchEnvs();
    },
    [refetchEnvs],
  );

  // Compute completion
  const stepsCompleted =
    (state.environmentValidated ? 1 : 0) +
    (state.awsValidated ? 1 : 0) +
    (activeEnvironments.length > 0 || state.cdkBootstrapped ? 1 : 0);
  const totalRequired = 3;
  const progress = Math.round((stepsCompleted / totalRequired) * 100);

  const isReady =
    state.environmentValidated &&
    state.awsValidated &&
    (activeEnvironments.length > 0 || state.cdkBootstrapped);

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
    setShowStarStep(true);
  };

  const handleEnterDashboard = async () => {
    await updateState({ onboardingComplete: true });
    router.push("/");
  };

  if (stateLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-6 py-10 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex items-start justify-between"
        >
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ rotate: -15, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 12 }}
            >
              <HardDrive className="size-6 text-primary" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Environment Setup
              </h1>
              <p className="text-sm text-muted-foreground">
                Let&apos;s prepare your machine and AWS account.
              </p>
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            {getStatusBadge()}
          </motion.div>
        </motion.div>

        {/* Progress */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {stepsCompleted} of {totalRequired} steps completed
            </span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </motion.div>

        <Separator />

        {/* Steps */}
        <AnimatePresence mode="wait">
          {!showStarStep ? (
            <motion.div
              key="steps"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Step 1 — Environment */}
              <motion.div
                custom={0}
                variants={stepVariants}
                initial="hidden"
                animate="visible"
              >
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
              </motion.div>

              {/* Step 2 — AWS Connection & IAM Permissions */}
              <motion.div
                custom={1}
                variants={stepVariants}
                initial="hidden"
                animate="visible"
              >
                <AwsStep
                  identity={awsHook.identity}
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
                  iamPolicies={awsHook.iamPolicies}
                  iamPermissions={awsHook.iamPermissions}
                  hasAdminPolicy={awsHook.hasAdminPolicy}
                  allPermissionsGranted={awsHook.allPermissionsGranted}
                  iamLoading={awsHook.iamLoading}
                  onCheckPermissions={awsHook.checkPermissions}
                  onUpdateCredentials={awsHook.updateCredentials}
                  credentialUpdating={awsHook.credentialUpdating}
                />
              </motion.div>

              {/* Step 3 — Bootstrap Environments */}
              <motion.div
                custom={2}
                variants={stepVariants}
                initial="hidden"
                animate="visible"
              >
                <BootstrapEnvironmentsStep
                  environments={environments}
                  accountId={awsHook.identity?.account || ""}
                  loading={bootstrapLoading}
                  error={bootstrapError}
                  lastErrorOutput={bootstrapErrorOutput}
                  progress={bootstrapProgress}
                  hasAnyActive={
                    activeEnvironments.length > 0 || state.cdkBootstrapped
                  }
                  onBootstrap={handleBootstrapRegion}
                  onRemove={handleRemoveEnv}
                />
              </motion.div>

              {/* Step 4 — AI Setup (Optional) */}
              <motion.div
                custom={3}
                variants={stepVariants}
                initial="hidden"
                animate="visible"
              >
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
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="star"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <StarRepoStep />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Finish */}
        <Separator />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-between"
        >
          {!showStarStep ? (
            <>
              <div className="text-sm text-muted-foreground">
                {isReady
                  ? "All required steps complete. You're ready to go!"
                  : "Complete the required steps above to continue."}
              </div>
              <Button onClick={handleFinish} disabled={!isReady} size="lg">
                Continue
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => setShowStarStep(false)}
                size="sm"
              >
                Back to setup
              </Button>
              <Button onClick={handleEnterDashboard} size="lg">
                Enter Dashboard
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
