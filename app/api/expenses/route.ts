// Next.js API route for cost/expense analytics — detailed breakdown per bucket and project
import { NextRequest, NextResponse } from "next/server";
import { readJsonFile } from "@/lib/filesystem";
import { calculateCostBreakdown, listS3Objects } from "@/lib/aws";
import type {
  Project,
  Bucket,
  FileRecord,
  BucketExpense,
  ProjectExpense,
  OverallCostSummary,
  CostBreakdownData,
} from "@/lib/types";

function sumCosts(costs: CostBreakdownData[]): CostBreakdownData {
  return {
    s3Storage: round(costs.reduce((a, c) => a + c.s3Storage, 0)),
    s3PutRequests: round(costs.reduce((a, c) => a + c.s3PutRequests, 0)),
    s3GetRequests: round(costs.reduce((a, c) => a + c.s3GetRequests, 0)),
    s3DeleteRequests: round(costs.reduce((a, c) => a + c.s3DeleteRequests, 0)),
    s3ListRequests: round(costs.reduce((a, c) => a + c.s3ListRequests, 0)),
    s3DataTransfer: round(costs.reduce((a, c) => a + c.s3DataTransfer, 0)),
    cfDataTransfer: round(costs.reduce((a, c) => a + c.cfDataTransfer, 0)),
    cfRequests: round(costs.reduce((a, c) => a + c.cfRequests, 0)),
    total: round(costs.reduce((a, c) => a + c.total, 0)),
  };
}

function round(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const bucketId = searchParams.get("bucketId");
  const scope = searchParams.get("scope") || "all"; // all | project | bucket

  const [projects, buckets, files] = await Promise.all([
    readJsonFile<Project>("projects.json"),
    readJsonFile<Bucket>("buckets.json"),
    readJsonFile<FileRecord>("files.json"),
  ]);

  // Filter scope
  let filteredBuckets = buckets;
  if (bucketId) {
    filteredBuckets = buckets.filter((b) => b.id === bucketId);
  } else if (projectId) {
    filteredBuckets = buckets.filter((b) => b.projectId === projectId);
  }

  // Build per-bucket expenses
  const bucketExpenses: BucketExpense[] = filteredBuckets.map((bucket) => {
    const bucketFiles = files.filter(
      (f) => f.bucketName === bucket.s3BucketName
    );
    const totalSizeBytes = bucketFiles.reduce((acc, f) => acc + f.size, 0);
    // Simulate request counts based on file activity
    const readRequests = bucketFiles.length * 12;
    const writeRequests = bucketFiles.length * 3;
    const deleteRequests = Math.floor(bucketFiles.length * 0.5);
    const listRequests = Math.floor(bucketFiles.length * 2);
    const dataTransferBytes = Math.floor(totalSizeBytes * 0.15); // ~15% egress estimate

    const costBreakdown = calculateCostBreakdown(
      totalSizeBytes,
      writeRequests,
      readRequests,
      deleteRequests,
      listRequests,
      dataTransferBytes
    );

    return {
      bucketId: bucket.id,
      bucketName: bucket.s3BucketName,
      displayName: bucket.name,
      region: bucket.region,
      status: bucket.status,
      fileCount: bucketFiles.length,
      totalSizeBytes,
      readRequests,
      writeRequests,
      deleteRequests,
      listRequests,
      dataTransferBytes,
      costBreakdown,
    };
  });

  // Build per-project expenses
  const filteredProjects = projectId
    ? projects.filter((p) => p.id === projectId)
    : projects;

  const projectExpenses: ProjectExpense[] = filteredProjects.map((project) => {
    const projectBucketExpenses = bucketExpenses.filter((be) => {
      const bucket = buckets.find((b) => b.id === be.bucketId);
      return bucket?.projectId === project.id;
    });

    return {
      projectId: project.id,
      projectName: project.name,
      environment: project.environment,
      bucketCount: projectBucketExpenses.length,
      totalFiles: projectBucketExpenses.reduce((a, b) => a + b.fileCount, 0),
      totalSizeBytes: projectBucketExpenses.reduce(
        (a, b) => a + b.totalSizeBytes,
        0
      ),
      totalReadRequests: projectBucketExpenses.reduce(
        (a, b) => a + b.readRequests,
        0
      ),
      totalWriteRequests: projectBucketExpenses.reduce(
        (a, b) => a + b.writeRequests,
        0
      ),
      totalDeleteRequests: projectBucketExpenses.reduce(
        (a, b) => a + b.deleteRequests,
        0
      ),
      totalListRequests: projectBucketExpenses.reduce(
        (a, b) => a + b.listRequests,
        0
      ),
      totalDataTransferBytes: projectBucketExpenses.reduce(
        (a, b) => a + b.dataTransferBytes,
        0
      ),
      costBreakdown: sumCosts(
        projectBucketExpenses.map((be) => be.costBreakdown)
      ),
      buckets: projectBucketExpenses,
    };
  });

  // Overall summary
  const allCosts = bucketExpenses.map((be) => be.costBreakdown);
  const totalCost = sumCosts(allCosts);

  const overallSummary: OverallCostSummary = {
    totalMonthlyCost: totalCost.total,
    projectedMonthlyCost: round(totalCost.total * 1.15),
    s3StorageCost: totalCost.s3Storage,
    s3RequestsCost: round(
      totalCost.s3PutRequests +
        totalCost.s3GetRequests +
        totalCost.s3DeleteRequests +
        totalCost.s3ListRequests
    ),
    s3DataTransferCost: totalCost.s3DataTransfer,
    cfDataTransferCost: totalCost.cfDataTransfer,
    cfRequestsCost: totalCost.cfRequests,
    totalStorageBytes: bucketExpenses.reduce(
      (a, b) => a + b.totalSizeBytes,
      0
    ),
    totalFiles: bucketExpenses.reduce((a, b) => a + b.fileCount, 0),
    totalBuckets: filteredBuckets.length,
    totalProjects: filteredProjects.length,
    costByProject: projectExpenses.map((pe) => ({
      name: pe.projectName,
      cost: pe.costBreakdown.total,
    })),
    costByService: [
      { service: "S3 Storage", cost: totalCost.s3Storage },
      {
        service: "S3 Requests",
        cost: round(
          totalCost.s3PutRequests +
            totalCost.s3GetRequests +
            totalCost.s3DeleteRequests +
            totalCost.s3ListRequests
        ),
      },
      { service: "S3 Data Transfer", cost: totalCost.s3DataTransfer },
      { service: "CloudFront Transfer", cost: totalCost.cfDataTransfer },
      { service: "CloudFront Requests", cost: totalCost.cfRequests },
    ],
  };

  return NextResponse.json({
    summary: overallSummary,
    projects: projectExpenses,
    buckets: bucketExpenses,
  });
}
