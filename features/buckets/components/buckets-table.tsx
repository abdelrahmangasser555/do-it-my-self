// Presentational table for listing all buckets with status indicators and actions
"use client";

import Link from "next/link";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Trash2,
  Rocket,
  Database,
  ExternalLink,
  AlertTriangle,
  Loader2,
  Shield,
  Eye,
} from "lucide-react";
import type { Bucket } from "@/lib/types";

interface BucketsTableProps {
  buckets: Bucket[];
  onDelete: (id: string) => void;
  onFullDelete?: (bucket: Bucket) => void;
  onDeploy: (bucket: Bucket) => void;
}

const statusColors: Record<Bucket["status"], string> = {
  pending: "secondary",
  deploying: "default",
  active: "default",
  failed: "destructive",
  deleting: "outline",
};

const statusIcons: Partial<Record<Bucket["status"], React.ReactNode>> = {
  deleting: <Loader2 className="mr-1 size-3 animate-spin" />,
};

export function BucketsTable({ buckets, onDelete, onFullDelete, onDeploy }: BucketsTableProps) {
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
          <TableHead>Config</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {buckets.map((bucket) => (
          <TableRow key={bucket.id} className={bucket.status === "deleting" ? "opacity-50" : ""}>
            <TableCell>
              <Link
                href={`/buckets/${bucket.id}`}
                className="font-medium text-primary hover:underline"
              >
                {bucket.name}
              </Link>
            </TableCell>
            <TableCell className="font-mono text-xs">
              {bucket.s3BucketName}
            </TableCell>
            <TableCell>{bucket.region}</TableCell>
            <TableCell className="max-w-[200px] truncate font-mono text-xs">
              {bucket.cloudFrontDomain || "—"}
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                {bucket.config?.versioning && (
                  <Badge variant="outline" className="text-xs">V</Badge>
                )}
                {bucket.config?.encryption && bucket.config.encryption !== "none" && (
                  <Badge variant="outline" className="text-xs">
                    <Shield className="mr-0.5 size-3" />
                    {bucket.config.encryption.toUpperCase()}
                  </Badge>
                )}
                {bucket.config?.backupEnabled && (
                  <Badge variant="outline" className="text-xs">BK</Badge>
                )}
              </div>
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
                {statusIcons[bucket.status]}
                {bucket.status}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {new Date(bucket.createdAt).toLocaleDateString()}
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-xs" disabled={bucket.status === "deleting"}>
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/buckets/${bucket.id}`}>
                      <Eye className="mr-2 size-4" />
                      View Details
                    </Link>
                  </DropdownMenuItem>
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
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onDelete(bucket.id)}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Remove Metadata
                  </DropdownMenuItem>
                  {onFullDelete && bucket.status === "active" && (
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => onFullDelete(bucket)}
                    >
                      <AlertTriangle className="mr-2 size-4" />
                      Full Delete (AWS)
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
