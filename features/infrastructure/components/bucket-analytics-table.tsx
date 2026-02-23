// Presentational component for per-bucket analytics breakdown with cost and requests
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
          <TableHead>Region</TableHead>
          <TableHead>Files</TableHead>
          <TableHead>Storage</TableHead>
          <TableHead>Reads</TableHead>
          <TableHead>Writes</TableHead>
          <TableHead>Orphans</TableHead>
          <TableHead className="text-right">Est. Cost/mo</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item) => (
          <TableRow key={item.bucketName}>
            <TableCell>
              <div>
                <span className="font-medium">{item.displayName || item.bucketName}</span>
                {item.displayName && (
                  <p className="font-mono text-xs text-muted-foreground">
                    {item.bucketName}
                  </p>
                )}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{item.region}</Badge>
            </TableCell>
            <TableCell>{item.fileCount}</TableCell>
            <TableCell>{formatBytes(item.totalSizeBytes)}</TableCell>
            <TableCell>{item.readRequests.toLocaleString()}</TableCell>
            <TableCell>{item.writeRequests.toLocaleString()}</TableCell>
            <TableCell>
              {item.orphanedFiles > 0 ? (
                <Badge variant="secondary">{item.orphanedFiles}</Badge>
              ) : (
                <span className="text-muted-foreground">0</span>
              )}
            </TableCell>
            <TableCell className="text-right font-mono">
              ${item.estimatedMonthlyCost.toFixed(4)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
