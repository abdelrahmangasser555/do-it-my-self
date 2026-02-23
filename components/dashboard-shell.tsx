// Client-side shell wrapping TerminalProvider + TerminalPanel
"use client";

import { type ReactNode } from "react";
import { TerminalProvider } from "@/lib/terminal-context";
import { TerminalPanel } from "./terminal-panel";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <TerminalProvider>
      {children}
      <TerminalPanel />
    </TerminalProvider>
  );
}
