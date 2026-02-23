// Next.js API route for analytics — aggregates data from all JSON stores with cost estimates
import { NextRequest, NextResponse } from "next/server";
import { readJsonFile } from "@/lib/filesystem";
import { estimateMonthlyCost } from "@/lib/aws";
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

  const bucketAnalytics: BucketAnalytics[] = filteredBuckets.map((bucket) => {
    const bucketFiles = filteredFiles.filter(
      (f) => f.bucketName === bucket.s3BucketName
    );
    const totalSizeBytes = bucketFiles.reduce((acc, f) => acc + f.size, 0);
    // Simulate read/write counts based on file count
    const readRequests = bucketFiles.length * 12;
    const writeRequests = bucketFiles.length * 3;

    return {
      bucketId: bucket.id,
      bucketName: bucket.s3BucketName,
      displayName: bucket.name,
      region: bucket.region,
      fileCount: bucketFiles.length,
      totalSizeBytes,
      orphanedFiles: bucketFiles.filter(
        (f) => !f.linkedModel || !f.linkedModelId
      ).length,
      estimatedMonthlyCost: estimateMonthlyCost(totalSizeBytes, writeRequests, readRequests),
      readRequests,
      writeRequests,
    };
  });

  const totalStorageBytes = filteredFiles.reduce((acc, f) => acc + f.size, 0);
  const totalReads = bucketAnalytics.reduce((a, b) => a + b.readRequests, 0);
  const totalWrites = bucketAnalytics.reduce((a, b) => a + b.writeRequests, 0);
  const estimatedMonthlyCost = estimateMonthlyCost(totalStorageBytes, totalWrites, totalReads);

  const summary: AnalyticsSummary = {
    totalProjects: projectId ? 1 : projects.length,
    totalBuckets: filteredBuckets.length,
    totalFiles: filteredFiles.length,
    totalStorageBytes,
    estimatedMonthlyCost,
    projectedMonthlyCost: Math.round(estimatedMonthlyCost * 1.15 * 100) / 100, // +15% growth
  };

  return NextResponse.json({ summary, bucketAnalytics });
}
