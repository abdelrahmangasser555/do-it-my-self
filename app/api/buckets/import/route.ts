// API route to import existing AWS S3 buckets into local tracking
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { appendToJsonFile, readJsonFile } from "@/lib/filesystem";
import type { Bucket } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { buckets } = body as {
      buckets: { name: string; region: string; creationDate?: string }[];
    };

    if (!Array.isArray(buckets) || buckets.length === 0) {
      return NextResponse.json(
        { error: "No buckets provided" },
        { status: 400 },
      );
    }

    // Read existing buckets to avoid duplicates
    const existing = await readJsonFile<Bucket>("buckets.json");
    const existingNames = new Set(existing.map((b) => b.s3BucketName));

    const imported: Bucket[] = [];

    for (const ab of buckets) {
      if (!ab.name || existingNames.has(ab.name)) continue;

      const bucket: Bucket = {
        id: uuidv4(),
        projectId: "",
        name: ab.name,
        s3BucketName: ab.name,
        s3BucketArn: `arn:aws:s3:::${ab.name}`,
        cloudFrontDomain: "",
        cloudFrontDistributionId: "",
        region: ab.region || "us-east-1",
        status: "active",
        config: {
          versioning: false,
          encryption: "s3",
          backupEnabled: false,
          maxFileSizeMB: 100,
        },
        createdAt: ab.creationDate || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await appendToJsonFile("buckets.json", bucket);
      imported.push(bucket);
      existingNames.add(ab.name);
    }

    return NextResponse.json({
      imported: imported.length,
      buckets: imported,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to import buckets",
      },
      { status: 500 },
    );
  }
}
