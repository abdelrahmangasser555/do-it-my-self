// Dashboard layout with sidebar, terminal provider, and main content area
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import { DashboardShell } from "@/components/dashboard-shell";
import { OnboardingGuard, OnboardingStatusBadge } from "@/features/onboarding/components/onboarding-guard";
import { GitHubStarsButton } from "@/components/ui/github-stars-button";
import { APP_CONFIG } from "@/lib/config";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OnboardingGuard>
      <DashboardShell>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset className="min-w-0 overflow-hidden">
            <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <span className="text-sm font-medium text-muted-foreground">
                {APP_CONFIG.name}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <GitHubStarsButton
                  repo={APP_CONFIG.githubRepo}
                  size="sm"
                />
                <OnboardingStatusBadge />
              </div>
            </header>
            <main className="flex-1 overflow-auto p-6 pb-24 min-w-0">{children}</main>
          </SidebarInset>
          <Toaster />
        </SidebarProvider>
      </DashboardShell>
    </OnboardingGuard>
  );
}
