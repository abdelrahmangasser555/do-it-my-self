// Tour launcher — wraps TourProvider with defined tours and handles auto-start
"use client";

import { TourProvider } from "@/components/ui/tour";
import { PRODUCT_TOUR, useProductTour } from "@/features/onboarding/components/product-tour";
import { useCallback, type ReactNode } from "react";

const tours = [PRODUCT_TOUR];

/** Inner component that auto-starts the tour after onboarding */
function TourAutoStart({ onTourComplete }: { onTourComplete: () => void }) {
  // This hook handles auto-start and state management
  // We pass the completeTour back up so TourProvider's onComplete can use it
  useProductTour({ onComplete: onTourComplete });
  return null;
}

export function TourWrapper({ children }: { children: ReactNode }) {
  // We use a ref-like approach: store the completeTour callback
  // and wire it through TourProvider.onComplete
  const completeTourRef = useCallback(async () => {
    try {
      await fetch("/api/system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tourCompleted: true }),
      });
    } catch {
      // Best-effort persistence
    }
  }, []);

  return (
    <TourProvider tours={tours} onComplete={completeTourRef}>
      <TourAutoStart onTourComplete={completeTourRef} />
      {children}
    </TourProvider>
  );
}
