// Client-side onboarding guard — redirects to /onboarding if not complete
// Also renders a small status badge in the dashboard header
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SystemState {
  environmentValidated: boolean;
  awsValidated: boolean;
  cdkBootstrapped: boolean;
  aiConfigured: boolean;
  onboardingComplete: boolean;
  tourCompleted: boolean;
}

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<SystemState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch("/api/system");
        if (res.ok) {
          const data = await res.json();
          setState(data);
          if (!data.onboardingComplete && pathname !== "/onboarding") {
            router.replace("/onboarding");
          }
        }
      } catch {
        // If system check fails, allow through
      } finally {
        setLoading(false);
      }
    }
    check();
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}

export function OnboardingStatusBadge() {
  const [state, setState] = useState<SystemState | null>(null);

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch("/api/system");
        if (res.ok) {
          setState(await res.json());
        }
      } catch {
        // Silently fail
      }
    }
    check();
  }, []);

  if (!state) return null;

  if (state.onboardingComplete) {
    return (
      <Link href="/onboarding">
        <Badge
          variant="outline"
          className="gap-1 cursor-pointer text-xs bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20"
        >
          <CheckCircle className="size-3" />
          Ready
        </Badge>
      </Link>
    );
  }

  return (
    <Link href="/onboarding">
      <Badge
        variant="outline"
        className="gap-1 cursor-pointer text-xs bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20"
      >
        <AlertCircle className="size-3" />
        Setup Required
      </Badge>
    </Link>
  );
}
