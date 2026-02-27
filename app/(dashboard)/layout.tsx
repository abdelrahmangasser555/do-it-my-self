// Dashboard layout with sidebar, terminal provider, and main content area
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import { DashboardShell } from "@/components/dashboard-shell";
import { OnboardingGuard, OnboardingStatusBadge } from "@/features/onboarding/components/onboarding-guard";

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
          <SidebarInset>
            <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <span className="text-sm font-medium text-muted-foreground">
                Storage Control Room
              </span>
              <div className="ml-auto">
                <OnboardingStatusBadge />
              </div>
            </header>
            <main className="flex-1 overflow-auto p-6 pb-24">{children}</main>
          </SidebarInset>
          <Toaster />
        </SidebarProvider>
      </DashboardShell>
    </OnboardingGuard>
  );
}
