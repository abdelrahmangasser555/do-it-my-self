// Client-side shell wrapping TerminalProvider + TerminalPanel + TourProvider
"use client";

import { type ReactNode } from "react";
import { TerminalProvider } from "@/lib/terminal-context";
import { TerminalPanel } from "./terminal-panel";
import { TourWrapper } from "@/features/onboarding/components/tour-wrapper";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <TerminalProvider>
      <TourWrapper>
        {children}
      </TourWrapper>
      <TerminalPanel />
    </TerminalProvider>
  );
}
