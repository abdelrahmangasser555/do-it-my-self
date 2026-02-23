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
import type { MergedS3File } from "@/features/files/hooks/use-files";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
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
    storage: { label: "Storage (KB)", color: "var(--chart-1)" },
    files: { label: "Files", color: "var(--chart-2)" },
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
    cost: { label: "Est. Monthly ($)", color: "var(--chart-3)" },
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
    reads: { label: "Reads", color: "var(--chart-4)" },
    writes: { label: "Writes", color: "var(--chart-5)" },
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

// ── File Type Distribution Chart (from real S3 data) ─────────────────────────

function getFileExtension(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase();
  if (!ext || ext === key.toLowerCase() || ext.length > 10) return "other";
  return ext;
}

const FILE_TYPE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
];

interface S3FileChartsProps {
  s3Files: MergedS3File[];
}

export function FileTypeDistributionChart({ s3Files }: S3FileChartsProps) {
  // Group by file extension
  const extCounts: Record<string, { count: number; size: number }> = {};
  for (const file of s3Files) {
    const ext = getFileExtension(file.key);
    if (!extCounts[ext]) extCounts[ext] = { count: 0, size: 0 };
    extCounts[ext].count++;
    extCounts[ext].size += file.size;
  }

  const data = Object.entries(extCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([ext, stats], i) => ({
      name: `.${ext}`,
      value: stats.count,
      size: stats.size,
      fill: FILE_TYPE_COLORS[i % FILE_TYPE_COLORS.length],
    }));

  const chartConfig = data.reduce((acc, d, i) => {
    acc[d.name] = { label: d.name, color: FILE_TYPE_COLORS[i % FILE_TYPE_COLORS.length] };
    return acc;
  }, {} as ChartConfig);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>File Type Distribution</CardTitle>
          <CardDescription>No files to analyze</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>File Type Distribution</CardTitle>
        <CardDescription>Breakdown by file extension ({s3Files.length} files total)</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px]">
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => `${value} files`}
                />
              }
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={45}
              strokeWidth={2}
            >
              {data.map((entry, i) => (
                <Cell key={entry.name} fill={FILE_TYPE_COLORS[i % FILE_TYPE_COLORS.length]} />
              ))}
            </Pie>
            <ChartLegend content={<ChartLegendContent nameKey="name" />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// ── File Size Range Distribution Chart ───────────────────────────────────────

const SIZE_RANGES = [
  { label: "< 1 KB", min: 0, max: 1024 },
  { label: "1-10 KB", min: 1024, max: 10240 },
  { label: "10-100 KB", min: 10240, max: 102400 },
  { label: "100 KB-1 MB", min: 102400, max: 1048576 },
  { label: "1-10 MB", min: 1048576, max: 10485760 },
  { label: "10-100 MB", min: 10485760, max: 104857600 },
  { label: "> 100 MB", min: 104857600, max: Infinity },
];

export function FileSizeRangeChart({ s3Files }: S3FileChartsProps) {
  const rangeCounts = SIZE_RANGES.map((range) => ({
    name: range.label,
    count: s3Files.filter((f) => f.size >= range.min && f.size < range.max).length,
  })).filter((d) => d.count > 0);

  const chartConfig = {
    count: { label: "Files", color: "var(--chart-2)" },
  } satisfies ChartConfig;

  if (rangeCounts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>File Size Distribution</CardTitle>
          <CardDescription>No files to analyze</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>File Size Distribution</CardTitle>
        <CardDescription>Number of files by size range</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
          <BarChart data={rangeCounts} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              fontSize={11}
            />
            <YAxis tickLine={false} axisLine={false} />
            <ChartTooltip
              content={<ChartTooltipContent formatter={(value) => `${value} files`} />}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="var(--color-count)" />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
