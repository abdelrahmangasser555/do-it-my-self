// Presentational component for analytics overview cards with cost estimates
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedCard } from "@/components/animated-card";
import {
  Database,
  FileUp,
  FolderKanban,
  HardDrive,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
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

function TrendIndicator({ current, projected }: { current: number; projected: number }) {
  const diff = projected - current;
  if (Math.abs(diff) < 0.01)
    return <Minus className="size-3.5 text-muted-foreground" />;
  if (diff > 0)
    return <TrendingUp className="size-3.5 text-orange-500" />;
  return <TrendingDown className="size-3.5 text-green-500" />;
}

export function AnalyticsCards({ summary, loading }: AnalyticsCardsProps) {
  const cards = [
    {
      title: "Total Projects",
      value: summary?.totalProjects ?? 0,
      icon: FolderKanban,
      subtitle: null,
    },
    {
      title: "Total Buckets",
      value: summary?.totalBuckets ?? 0,
      icon: Database,
      subtitle: null,
    },
    {
      title: "Total Files",
      value: summary?.totalFiles ?? 0,
      icon: FileUp,
      subtitle: null,
    },
    {
      title: "Storage Used",
      value: summary ? formatBytes(summary.totalStorageBytes) : "0 B",
      icon: HardDrive,
      subtitle: null,
    },
    {
      title: "Est. Monthly Cost",
      value: summary ? `$${summary.estimatedMonthlyCost.toFixed(2)}` : "$0.00",
      icon: DollarSign,
      subtitle: summary
        ? `Projected: $${summary.projectedMonthlyCost.toFixed(2)}`
        : null,
      trend: summary
        ? { current: summary.estimatedMonthlyCost, projected: summary.projectedMonthlyCost }
        : null,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{card.value}</p>
                  {"trend" in card && card.trend && (
                    <TrendIndicator
                      current={card.trend.current}
                      projected={card.trend.projected}
                    />
                  )}
                </div>
                {card.subtitle && (
                  <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                )}
              </div>
            )}
          </CardContent>
        </AnimatedCard>
      ))}
    </div>
  );
}
