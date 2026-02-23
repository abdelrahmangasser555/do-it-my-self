// Reusable cost breakdown components — tables, cards, charts for expenses
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AnimatedCard } from "@/components/animated-card";
import {
  DollarSign,
  HardDrive,
  ArrowUpDown,
  Globe,
  Server,
  FileUp,
  FileDown,
  List,
  Trash2,
  TrendingUp,
} from "lucide-react";
import type {
  CostBreakdownData,
  BucketExpense,
  ProjectExpense,
  OverallCostSummary,
} from "@/lib/types";

// ── Formatters ───────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatCost(cost: number): string {
  if (cost === 0) return "$0.00";
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

function formatRequests(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

// ── Cost Breakdown Detail Table ──────────────────────────────────────────────

interface CostBreakdownTableProps {
  breakdown: CostBreakdownData;
  title?: string;
}

export function CostBreakdownTable({ breakdown, title }: CostBreakdownTableProps) {
  const rows = [
    { label: "S3 Storage", cost: breakdown.s3Storage, icon: HardDrive, category: "S3" },
    { label: "S3 PUT Requests", cost: breakdown.s3PutRequests, icon: FileUp, category: "S3" },
    { label: "S3 GET Requests", cost: breakdown.s3GetRequests, icon: FileDown, category: "S3" },
    { label: "S3 DELETE Requests", cost: breakdown.s3DeleteRequests, icon: Trash2, category: "S3" },
    { label: "S3 LIST Requests", cost: breakdown.s3ListRequests, icon: List, category: "S3" },
    { label: "S3 Data Transfer", cost: breakdown.s3DataTransfer, icon: ArrowUpDown, category: "S3" },
    { label: "CloudFront Transfer", cost: breakdown.cfDataTransfer, icon: Globe, category: "CloudFront" },
    { label: "CloudFront Requests", cost: breakdown.cfRequests, icon: Server, category: "CloudFront" },
  ];

  const maxCost = Math.max(...rows.map((r) => r.cost), 0.0001);

  return (
    <Card>
      {title && (
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="size-4" />
            {title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={title ? "" : "pt-6"}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service</TableHead>
              <TableHead>Line Item</TableHead>
              <TableHead className="w-50">Share</TableHead>
              <TableHead className="text-right">Est. Cost/mo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const Icon = row.icon;
              const share = maxCost > 0 ? (row.cost / breakdown.total) * 100 : 0;
              return (
                <TableRow key={row.label}>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {row.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Icon className="size-3.5 text-muted-foreground" />
                      <span className="text-sm">{row.label}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={share}
                        className="h-1.5 flex-1"
                      />
                      <span className="text-xs text-muted-foreground w-10 text-right">
                        {share > 0.01 ? `${share.toFixed(0)}%` : "—"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatCost(row.cost)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3} className="font-medium">
                Total Estimated Monthly Cost
              </TableCell>
              <TableCell className="text-right font-mono font-bold">
                {formatCost(breakdown.total)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}

// ── Bucket Expenses Table ────────────────────────────────────────────────────

interface BucketExpensesTableProps {
  expenses: BucketExpense[];
}

export function BucketExpensesTable({ expenses }: BucketExpensesTableProps) {
  if (expenses.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No bucket expense data available.
      </p>
    );
  }

  const totalCost = expenses.reduce((a, b) => a + b.costBreakdown.total, 0);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Bucket</TableHead>
          <TableHead>Region</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Files</TableHead>
          <TableHead>Storage</TableHead>
          <TableHead>Reads</TableHead>
          <TableHead>Writes</TableHead>
          <TableHead>Data Transfer</TableHead>
          <TableHead>S3 Cost</TableHead>
          <TableHead>CF Cost</TableHead>
          <TableHead className="text-right">Total/mo</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {expenses.map((expense) => {
          const s3Cost =
            expense.costBreakdown.s3Storage +
            expense.costBreakdown.s3PutRequests +
            expense.costBreakdown.s3GetRequests +
            expense.costBreakdown.s3DeleteRequests +
            expense.costBreakdown.s3ListRequests +
            expense.costBreakdown.s3DataTransfer;
          const cfCost =
            expense.costBreakdown.cfDataTransfer +
            expense.costBreakdown.cfRequests;

          return (
            <TableRow key={expense.bucketId}>
              <TableCell>
                <div>
                  <span className="font-medium">{expense.displayName}</span>
                  <p className="font-mono text-xs text-muted-foreground">
                    {expense.bucketName}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {expense.region}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    expense.status === "active"
                      ? "default"
                      : expense.status === "failed"
                      ? "destructive"
                      : "secondary"
                  }
                  className="text-xs"
                >
                  {expense.status}
                </Badge>
              </TableCell>
              <TableCell>{expense.fileCount}</TableCell>
              <TableCell className="text-sm">
                {formatBytes(expense.totalSizeBytes)}
              </TableCell>
              <TableCell className="text-sm">
                {formatRequests(expense.readRequests)}
              </TableCell>
              <TableCell className="text-sm">
                {formatRequests(expense.writeRequests)}
              </TableCell>
              <TableCell className="text-sm">
                {formatBytes(expense.dataTransferBytes)}
              </TableCell>
              <TableCell className="font-mono text-sm">
                {formatCost(s3Cost)}
              </TableCell>
              <TableCell className="font-mono text-sm">
                {formatCost(cfCost)}
              </TableCell>
              <TableCell className="text-right font-mono font-medium">
                {formatCost(expense.costBreakdown.total)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={10} className="font-medium">
            Total
          </TableCell>
          <TableCell className="text-right font-mono font-bold">
            {formatCost(totalCost)}
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}

// ── Project Expenses Table ───────────────────────────────────────────────────

interface ProjectExpensesTableProps {
  expenses: ProjectExpense[];
}

export function ProjectExpensesTable({ expenses }: ProjectExpensesTableProps) {
  if (expenses.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No project expense data available.
      </p>
    );
  }

  const totalCost = expenses.reduce((a, b) => a + b.costBreakdown.total, 0);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Project</TableHead>
          <TableHead>Env</TableHead>
          <TableHead>Buckets</TableHead>
          <TableHead>Files</TableHead>
          <TableHead>Storage</TableHead>
          <TableHead>Reads</TableHead>
          <TableHead>Writes</TableHead>
          <TableHead>Data Transfer</TableHead>
          <TableHead>S3 Cost</TableHead>
          <TableHead>CF Cost</TableHead>
          <TableHead className="text-right">Total/mo</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {expenses.map((expense) => {
          const s3Cost =
            expense.costBreakdown.s3Storage +
            expense.costBreakdown.s3PutRequests +
            expense.costBreakdown.s3GetRequests +
            expense.costBreakdown.s3DeleteRequests +
            expense.costBreakdown.s3ListRequests +
            expense.costBreakdown.s3DataTransfer;
          const cfCost =
            expense.costBreakdown.cfDataTransfer +
            expense.costBreakdown.cfRequests;

          return (
            <TableRow key={expense.projectId}>
              <TableCell>
                <span className="font-medium">{expense.projectName}</span>
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    expense.environment === "prod" ? "default" : "secondary"
                  }
                  className="text-xs"
                >
                  {expense.environment}
                </Badge>
              </TableCell>
              <TableCell>{expense.bucketCount}</TableCell>
              <TableCell>{expense.totalFiles}</TableCell>
              <TableCell className="text-sm">
                {formatBytes(expense.totalSizeBytes)}
              </TableCell>
              <TableCell className="text-sm">
                {formatRequests(expense.totalReadRequests)}
              </TableCell>
              <TableCell className="text-sm">
                {formatRequests(expense.totalWriteRequests)}
              </TableCell>
              <TableCell className="text-sm">
                {formatBytes(expense.totalDataTransferBytes)}
              </TableCell>
              <TableCell className="font-mono text-sm">
                {formatCost(s3Cost)}
              </TableCell>
              <TableCell className="font-mono text-sm">
                {formatCost(cfCost)}
              </TableCell>
              <TableCell className="text-right font-mono font-medium">
                {formatCost(expense.costBreakdown.total)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={10} className="font-medium">
            Total
          </TableCell>
          <TableCell className="text-right font-mono font-bold">
            {formatCost(totalCost)}
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}

// ── Overall Cost Summary Cards ───────────────────────────────────────────────

interface CostSummaryCardsProps {
  summary: OverallCostSummary | null;
  loading: boolean;
}

export function CostSummaryCards({ summary, loading }: CostSummaryCardsProps) {
  const cards = [
    {
      title: "Total Monthly Cost",
      value: summary ? formatCost(summary.totalMonthlyCost) : "$0.00",
      subtitle: summary
        ? `Projected: ${formatCost(summary.projectedMonthlyCost)}`
        : null,
      icon: DollarSign,
      accent: true,
    },
    {
      title: "S3 Storage",
      value: summary ? formatCost(summary.s3StorageCost) : "$0.00",
      subtitle: summary ? formatBytes(summary.totalStorageBytes) : null,
      icon: HardDrive,
    },
    {
      title: "S3 Requests",
      value: summary ? formatCost(summary.s3RequestsCost) : "$0.00",
      subtitle: "PUT + GET + DELETE + LIST",
      icon: ArrowUpDown,
    },
    {
      title: "S3 Data Transfer",
      value: summary ? formatCost(summary.s3DataTransferCost) : "$0.00",
      subtitle: "S3 to Internet",
      icon: FileDown,
    },
    {
      title: "CloudFront Transfer",
      value: summary ? formatCost(summary.cfDataTransferCost) : "$0.00",
      subtitle: "Edge transfer",
      icon: Globe,
    },
    {
      title: "CloudFront Requests",
      value: summary ? formatCost(summary.cfRequestsCost) : "$0.00",
      subtitle: "HTTPS requests",
      icon: Server,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <AnimatedCard key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-7 w-16 animate-pulse rounded bg-muted" />
            ) : (
              <div className="space-y-1">
                <p
                  className={`text-xl font-bold ${
                    card.accent ? "text-primary" : ""
                  }`}
                >
                  {card.value}
                </p>
                {card.subtitle && (
                  <p className="text-xs text-muted-foreground">
                    {card.subtitle}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </AnimatedCard>
      ))}
    </div>
  );
}

// ── Cost by Service Bar (simple visual) ──────────────────────────────────────

interface CostByServiceProps {
  services: { service: string; cost: number }[];
}

export function CostByServiceBreakdown({ services }: CostByServiceProps) {
  const totalCost = services.reduce((a, b) => a + b.cost, 0);
  if (totalCost === 0) return null;

  const COLORS = [
    "bg-chart-1",
    "bg-chart-2",
    "bg-chart-3",
    "bg-chart-4",
    "bg-chart-5",
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Cost by Service</CardTitle>
        <CardDescription>Monthly breakdown by AWS service</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {services.map((s, i) => {
          const pct = (s.cost / totalCost) * 100;
          return (
            <div key={s.service} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>{s.service}</span>
                <span className="font-mono text-muted-foreground">
                  {formatCost(s.cost)}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${COLORS[i % COLORS.length]}`}
                  style={{ width: `${Math.max(pct, 1)}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
