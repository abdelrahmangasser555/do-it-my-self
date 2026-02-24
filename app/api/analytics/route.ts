// Next.js API route for analytics — live S3 sync with cost estimates
import { NextRequest, NextResponse } from "next/server";
import { readJsonFile } from "@/lib/filesystem";
import { estimateMonthlyCost, listS3Objects } from "@/lib/aws";
import type {
  Project,
  Bucket,
  FileRecord,
  AnalyticsSummary,
  BucketAnalytics,
} from "@/lib/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const liveSync = searchParams.get("sync") !== "false"; // default true

  const [projects, buckets, files] = await Promise.all([
    readJsonFile<Project>("projects.json"),
    readJsonFile<Bucket>("buckets.json"),
    readJsonFile<FileRecord>("files.json"),
  ]);

  const filteredBuckets = projectId
    ? buckets.filter((b) => b.projectId === projectId)
    : buckets;
  const filteredFiles = projectId
    ? files.filter((f) => f.projectId === projectId)
    : files;

  // If liveSync, fetch real S3 data for active buckets in parallel
  const s3DataMap = new Map<string, { totalSizeBytes: number; fileCount: number }>();

  if (liveSync) {
    const s3Promises = filteredBuckets
      .filter((b) => b.status === "active")
      .map(async (bucket) => {
        try {
          const objects = await listS3Objects(bucket.s3BucketName, bucket.region);
          const totalSizeBytes = objects.reduce((sum, o) => sum + o.size, 0);
          s3DataMap.set(bucket.id, { totalSizeBytes, fileCount: objects.length });
        } catch {
          // Fallback to metadata if S3 call fails
        }
      });
    await Promise.allSettled(s3Promises);
  }

  const bucketAnalytics: BucketAnalytics[] = filteredBuckets.map((bucket) => {
    const s3Data = s3DataMap.get(bucket.id);
    const bucketFiles = filteredFiles.filter(
      (f) => f.bucketName === bucket.s3BucketName
    );

    // Use live S3 data when available, fall back to metadata
    const totalSizeBytes = s3Data?.totalSizeBytes ?? bucketFiles.reduce((acc, f) => acc + f.size, 0);
    const fileCount = s3Data?.fileCount ?? bucketFiles.length;

    // Simulate read/write counts based on file count
    const readRequests = fileCount * 12;
    const writeRequests = fileCount * 3;

    return {
      bucketId: bucket.id,
      bucketName: bucket.s3BucketName,
      displayName: bucket.name,
      region: bucket.region,
      fileCount,
      totalSizeBytes,
      orphanedFiles: bucketFiles.filter(
        (f) => !f.linkedModel || !f.linkedModelId
      ).length,
      estimatedMonthlyCost: estimateMonthlyCost(totalSizeBytes, writeRequests, readRequests),
      readRequests,
      writeRequests,
    };
  });

  const totalStorageBytes = bucketAnalytics.reduce((acc, b) => acc + b.totalSizeBytes, 0);
  const totalFiles = bucketAnalytics.reduce((acc, b) => acc + b.fileCount, 0);
  const totalReads = bucketAnalytics.reduce((a, b) => a + b.readRequests, 0);
  const totalWrites = bucketAnalytics.reduce((a, b) => a + b.writeRequests, 0);
  const estimatedMonthlyCost = estimateMonthlyCost(totalStorageBytes, totalWrites, totalReads);

  const summary: AnalyticsSummary = {
    totalProjects: projectId ? 1 : projects.length,
    totalBuckets: filteredBuckets.length,
    totalFiles,
    totalStorageBytes,
    estimatedMonthlyCost,
    projectedMonthlyCost: Math.round(estimatedMonthlyCost * 1.15 * 100) / 100,
  };

  return NextResponse.json({
    summary,
    bucketAnalytics,
    syncedAt: new Date().toISOString(),
    liveSync,
  });
}
