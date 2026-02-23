// Presentational component for per-bucket analytics breakdown
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { BucketAnalytics } from "@/lib/types";

interface BucketAnalyticsTableProps {
  data: BucketAnalytics[];
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function BucketAnalyticsTable({ data }: BucketAnalyticsTableProps) {
  if (data.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No bucket analytics available.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Bucket</TableHead>
          <TableHead>Files</TableHead>
          <TableHead>Storage Used</TableHead>
          <TableHead>Orphaned Files</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item) => (
          <TableRow key={item.bucketName}>
            <TableCell className="font-mono text-sm">
              {item.bucketName}
            </TableCell>
            <TableCell>{item.fileCount}</TableCell>
            <TableCell>{formatBytes(item.totalSizeBytes)}</TableCell>
            <TableCell>
              {item.orphanedFiles > 0 ? (
                <Badge variant="secondary">{item.orphanedFiles}</Badge>
              ) : (
                <span className="text-muted-foreground">0</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
