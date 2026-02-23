// Presentational component for analytics overview cards
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedCard } from "@/components/animated-card";
import { Database, FileUp, FolderKanban, HardDrive } from "lucide-react";
import type { AnalyticsSummary } from "@/lib/types";

interface AnalyticsCardsProps {
  summary: AnalyticsSummary | null;
  loading: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function AnalyticsCards({ summary, loading }: AnalyticsCardsProps) {
  const cards = [
    {
      title: "Total Projects",
      value: summary?.totalProjects ?? 0,
      icon: FolderKanban,
    },
    {
      title: "Total Buckets",
      value: summary?.totalBuckets ?? 0,
      icon: Database,
    },
    {
      title: "Total Files",
      value: summary?.totalFiles ?? 0,
      icon: FileUp,
    },
    {
      title: "Storage Used",
      value: summary ? formatBytes(summary.totalStorageBytes) : "0 B",
      icon: HardDrive,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <AnimatedCard key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-20 animate-pulse rounded bg-muted" />
            ) : (
              <p className="text-2xl font-bold">{card.value}</p>
            )}
          </CardContent>
        </AnimatedCard>
      ))}
    </div>
  );
}
