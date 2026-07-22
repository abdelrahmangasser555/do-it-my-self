import type { AppMode } from '@/lib/types';

export interface AppModeOption {
  value: AppMode;
  label: string;
  description: string;
  summary: string;
}

export const APP_MODE_OPTIONS: AppModeOption[] = [
  {
    value: 'easy',
    label: 'Easy Mode',
    description: 'A simplified workspace for non-technical bucket management.',
    summary: 'Project-first navigation, guided setup, and hidden advanced tooling.',
  },
  {
    value: 'developer',
    label: 'Developer Mode',
    description: 'Full visibility into infrastructure, commands, and internal configuration.',
    summary: 'Dense navigation, all tabs visible, and advanced controls enabled everywhere.',
  },
  {
    value: 'vibecoder',
    label: 'Vibecoder Mode',
    description: 'An AI-first workflow for users who want the chatbot to do the heavy lifting.',
    summary: 'Same simple navigation as Easy Mode, but setup is reduced to an AI-ready prompt.',
  },
];

export function isDeveloperOnlyMode(mode: AppMode) {
  return mode !== 'developer';
}

export function getAppModeLabel(mode: AppMode) {
  return APP_MODE_OPTIONS.find((option) => option.value === mode)?.label ?? 'Easy Mode';
}
