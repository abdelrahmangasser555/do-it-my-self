// Presentational table for listing all buckets with status indicators
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Trash2, Rocket, Database } from "lucide-react";
import type { Bucket } from "@/lib/types";

interface BucketsTableProps {
  buckets: Bucket[];
  onDelete: (id: string) => void;
  onDeploy: (bucket: Bucket) => void;
}

const statusColors: Record<Bucket["status"], string> = {
  pending: "secondary",
  deploying: "default",
  active: "default",
  failed: "destructive",
};

export function BucketsTable({ buckets, onDelete, onDeploy }: BucketsTableProps) {
  if (buckets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Database className="mb-3 size-10" />
        <p className="text-sm">No buckets yet. Create one to get started.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>S3 Bucket</TableHead>
          <TableHead>Region</TableHead>
          <TableHead>CloudFront</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {buckets.map((bucket) => (
          <TableRow key={bucket.id}>
            <TableCell className="font-medium">{bucket.name}</TableCell>
            <TableCell className="font-mono text-xs">
              {bucket.s3BucketName}
            </TableCell>
            <TableCell>{bucket.region}</TableCell>
            <TableCell className="max-w-[200px] truncate font-mono text-xs">
              {bucket.cloudFrontDomain || "—"}
            </TableCell>
            <TableCell>
              <Badge
                variant={
                  statusColors[bucket.status] as
                    | "default"
                    | "secondary"
                    | "destructive"
                    | "outline"
                }
              >
                {bucket.status}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {new Date(bucket.createdAt).toLocaleDateString()}
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-xs">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {bucket.status === "pending" && (
                    <DropdownMenuItem onClick={() => onDeploy(bucket)}>
                      <Rocket className="mr-2 size-4" />
                      Deploy with CDK
                    </DropdownMenuItem>
                  )}
                  {bucket.status === "failed" && (
                    <DropdownMenuItem onClick={() => onDeploy(bucket)}>
                      <Rocket className="mr-2 size-4" />
                      Retry Deploy
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onDelete(bucket.id)}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
