// Next.js API route for analytics - aggregates data from all JSON stores
import { NextRequest, NextResponse } from "next/server";
import { readJsonFile } from "@/lib/filesystem";
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

  const summary: AnalyticsSummary = {
    totalProjects: projectId ? 1 : projects.length,
    totalBuckets: filteredBuckets.length,
    totalFiles: filteredFiles.length,
    totalStorageBytes: filteredFiles.reduce((acc, f) => acc + f.size, 0),
  };

  const bucketAnalytics: BucketAnalytics[] = filteredBuckets.map((bucket) => {
    const bucketFiles = filteredFiles.filter(
      (f) => f.bucketName === bucket.s3BucketName
    );
    return {
      bucketName: bucket.s3BucketName,
      fileCount: bucketFiles.length,
      totalSizeBytes: bucketFiles.reduce((acc, f) => acc + f.size, 0),
      orphanedFiles: bucketFiles.filter(
        (f) => !f.linkedModel || !f.linkedModelId
      ).length,
    };
  });

  return NextResponse.json({ summary, bucketAnalytics });
}
