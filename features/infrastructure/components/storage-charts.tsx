// Storage analytics charts — bar chart for per-bucket storage + pie chart for distribution
"use client";

import {
  Bar,
  BarChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { BucketAnalytics } from "@/lib/types";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

interface StorageChartsProps {
  bucketAnalytics: BucketAnalytics[];
}

export function StorageBarChart({ bucketAnalytics }: StorageChartsProps) {
  const data = bucketAnalytics.map((b, i) => ({
    name: b.displayName || b.bucketName.slice(0, 20),
    storage: Math.round(b.totalSizeBytes / 1024), // KB
    files: b.fileCount,
    fill: COLORS[i % COLORS.length],
  }));

  const chartConfig = {
    storage: { label: "Storage (KB)", color: "hsl(var(--chart-1))" },
    files: { label: "Files", color: "hsl(var(--chart-2))" },
  } satisfies ChartConfig;

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Storage per Bucket</CardTitle>
          <CardDescription>No bucket data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Storage per Bucket
          <TrendingUp className="size-4 text-green-500" />
        </CardTitle>
        <CardDescription>Storage breakdown by bucket</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
          <BarChart data={data} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <YAxis tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="storage" radius={[4, 4, 0, 0]} fill="var(--color-storage)" />
            <Bar dataKey="files" radius={[4, 4, 0, 0]} fill="var(--color-files)" />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export function StoragePieChart({ bucketAnalytics }: StorageChartsProps) {
  const data = bucketAnalytics
    .filter((b) => b.totalSizeBytes > 0)
    .map((b, i) => ({
      name: b.displayName || b.bucketName.slice(0, 20),
      value: b.totalSizeBytes,
      fill: COLORS[i % COLORS.length],
    }));

  const chartConfig = bucketAnalytics.reduce((acc, b, i) => {
    const key = b.displayName || b.bucketName.slice(0, 20);
    acc[key] = { label: key, color: COLORS[i % COLORS.length] };
    return acc;
  }, {} as ChartConfig);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Storage Distribution</CardTitle>
          <CardDescription>No storage data to show</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Storage Distribution</CardTitle>
        <CardDescription>Share of total storage per bucket</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px]">
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => formatBytes(Number(value))}
                />
              }
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={50}
              strokeWidth={2}
            >
              {data.map((entry, i) => (
                <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <ChartLegend content={<ChartLegendContent nameKey="name" />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export function CostBarChart({ bucketAnalytics }: StorageChartsProps) {
  const data = bucketAnalytics.map((b, i) => ({
    name: b.displayName || b.bucketName.slice(0, 20),
    cost: b.estimatedMonthlyCost,
    fill: COLORS[i % COLORS.length],
  }));

  const chartConfig = {
    cost: { label: "Est. Monthly ($)", color: "hsl(var(--chart-3))" },
  } satisfies ChartConfig;

  if (data.length === 0) return null;

  const totalCost = data.reduce((a, b) => a + b.cost, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Estimated Monthly Cost
          {totalCost > 1 ? (
            <TrendingUp className="size-4 text-orange-500" />
          ) : (
            <Minus className="size-4 text-muted-foreground" />
          )}
        </CardTitle>
        <CardDescription>
          ${totalCost.toFixed(2)}/month projected
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
          <BarChart data={data} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
            <ChartTooltip
              content={
                <ChartTooltipContent formatter={(value) => `$${Number(value).toFixed(4)}`} />
              }
            />
            <Bar dataKey="cost" radius={[4, 4, 0, 0]} fill="var(--color-cost)" />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export function RequestsBarChart({ bucketAnalytics }: StorageChartsProps) {
  const data = bucketAnalytics.map((b) => ({
    name: b.displayName || b.bucketName.slice(0, 20),
    reads: b.readRequests,
    writes: b.writeRequests,
  }));

  const chartConfig = {
    reads: { label: "Reads", color: "hsl(var(--chart-4))" },
    writes: { label: "Writes", color: "hsl(var(--chart-5))" },
  } satisfies ChartConfig;

  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Request Activity
          <TrendingUp className="size-4 text-blue-500" />
        </CardTitle>
        <CardDescription>Estimated reads & writes per bucket</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
          <BarChart data={data} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <YAxis tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="reads" radius={[4, 4, 0, 0]} fill="var(--color-reads)" />
            <Bar dataKey="writes" radius={[4, 4, 0, 0]} fill="var(--color-writes)" />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
