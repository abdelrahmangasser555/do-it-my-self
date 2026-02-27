// Product tour — multi-page guided tour triggered after onboarding completes
"use client";

import { useEffect, useState } from "react";
import { useTour, type Tour } from "@/components/ui/tour";

/** Tour step definitions for the product walkthrough */
export const PRODUCT_TOUR: Tour = {
  id: "product-tour",
  steps: [
    // ── Dashboard page ──────────────────────────────────────────────────
    {
      id: "tour-dashboard-heading",
      title: "Welcome to Storage Control Room",
      content:
        "This is your dashboard — a bird's-eye view of all S3 buckets, storage analytics, and estimated AWS costs.",
      side: "bottom",
      sideOffset: 12,
      align: "start",
      nextLabel: "Next",
    },
    {
      id: "tour-analytics-cards",
      title: "Storage Analytics",
      content:
        "These cards show your total projects, buckets, files, and storage size at a glance.",
      side: "bottom",
      sideOffset: 12,
      nextLabel: "Next",
    },
    {
      id: "tour-cost-section",
      title: "Cost Overview",
      content:
        "Monitor your estimated AWS costs for S3 and CloudFront. All calculations are local — no billing API needed.",
      side: "top",
      sideOffset: 12,
      nextLabel: "Go to Projects",
      nextRoute: "/projects",
    },

    // ── Projects page ───────────────────────────────────────────────────
    {
      id: "tour-new-project",
      title: "Create a Project",
      content:
        "Projects group buckets together. Click here to create your first project with environment settings and MIME type rules.",
      side: "bottom",
      sideOffset: 12,
      previousRoute: "/",
      previousLabel: "Back to Dashboard",
      nextLabel: "Go to Buckets",
      nextRoute: "/buckets",
    },

    // ── Buckets page ────────────────────────────────────────────────────
    {
      id: "tour-new-bucket",
      title: "Create a Bucket",
      content:
        "Buckets are S3 + CloudFront pairs. Create one, then deploy it directly from the dashboard using AWS CDK.",
      side: "bottom",
      sideOffset: 12,
      previousRoute: "/projects",
      previousLabel: "Back to Projects",
      nextLabel: "Next",
    },
    {
      id: "tour-sync-aws",
      title: "Sync with AWS",
      content:
        "Already have buckets deployed? Click Sync to import their live status from CloudFormation.",
      side: "bottom",
      sideOffset: 12,
      nextLabel: "Go to Files",
      nextRoute: "/files",
    },

    // ── Files page ──────────────────────────────────────────────────────
    {
      id: "tour-files-area",
      title: "File Management",
      content:
        "View and manage files across all your buckets. Upload, delete, and track files with CDN URLs.",
      side: "bottom",
      sideOffset: 12,
      previousRoute: "/buckets",
      previousLabel: "Back to Buckets",
      nextLabel: "Go to Commands",
      nextRoute: "/commands",
    },

    // ── Commands page ───────────────────────────────────────────────────
    {
      id: "tour-commands-area",
      title: "Quick Commands",
      content:
        "Run pre-built AWS and CDK commands, save custom ones, or use AI to generate commands from natural language.",
      side: "bottom",
      sideOffset: 12,
      previousRoute: "/files",
      previousLabel: "Back to Files",
      nextLabel: "Finish Tour",
    },
  ],
};

/**
 * Manages the product tour lifecycle:
 * - Auto-starts after onboarding completes (if tour not yet completed)
 * - Can be manually triggered via the returned `startTour` function
 */
export function useProductTour(opts?: { onComplete?: () => void }) {
  const tour = useTour();
  const [tourCompleted, setTourCompleted] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    async function checkTourState() {
      try {
        const res = await fetch("/api/system");
        if (res.ok) {
          const data = await res.json();
          setTourCompleted(data.tourCompleted ?? false);

          // Auto-start tour if onboarding is complete but tour hasn't been done
          if (data.onboardingComplete && !data.tourCompleted) {
            // Small delay to let the dashboard render
            setTimeout(() => {
              tour.start("product-tour");
            }, 1000);
          }
        }
      } catch {
        // Silently fail
      } finally {
        setChecked(true);
      }
    }
    checkTourState();
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startTour = () => {
    tour.start("product-tour");
  };

  const completeTour = async () => {
    tour.close();
    setTourCompleted(true);
    opts?.onComplete?.();
  };

  return { startTour, completeTour, tourCompleted, checked };
}
