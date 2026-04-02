// Step progress indicator for setup flows
'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  label: string;
  description?: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function StepIndicator({ steps, currentStep, onStepClick }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, i) => {
        const isCompleted = i < currentStep;
        const isCurrent = i === currentStep;
        const isClickable = onStepClick && i <= currentStep;

        return (
          <div key={i} className="flex items-center gap-2">
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onStepClick?.(i)}
              className={cn(
                'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                isCompleted && 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20',
                isCurrent && 'bg-primary/10 text-primary ring-1 ring-primary/30',
                !isCompleted && !isCurrent && 'bg-muted text-muted-foreground',
                isClickable && 'cursor-pointer',
                !isClickable && 'cursor-default',
              )}
            >
              {isCompleted ? (
                <Check className="size-3" />
              ) : (
                <span className="flex size-4 items-center justify-center rounded-full bg-current/10 text-[10px] font-bold">
                  {i + 1}
                </span>
              )}
              {step.label}
            </button>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'h-px w-6',
                  i < currentStep ? 'bg-emerald-500/40' : 'bg-border',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
