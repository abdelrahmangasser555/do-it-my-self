// API route for listing and managing CloudFront distributions
import { NextRequest, NextResponse } from "next/server";
import {
  listCloudFrontDistributions,
  deleteCloudFrontDistribution,
} from "@/lib/aws";
import { readJsonFile } from "@/lib/filesystem";
import type { Bucket } from "@/lib/types";

export async function GET() {
  try {
    const distributions = await listCloudFrontDistributions();

    // Enrich with local bucket data — match by CloudFront domain
    const buckets = await readJsonFile<Bucket>("buckets.json");
    const bucketByDomain = new Map<string, Bucket>();
    for (const b of buckets) {
      if (b.cloudFrontDomain) {
        bucketByDomain.set(b.cloudFrontDomain, b);
      }
    }

    const enriched = distributions.map((dist) => {
      const linkedBucket = bucketByDomain.get(dist.domainName) || null;
      return {
        ...dist,
        linkedBucket: linkedBucket
          ? {
              id: linkedBucket.id,
              name: linkedBucket.name,
              s3BucketName: linkedBucket.s3BucketName,
              status: linkedBucket.status,
            }
          : null,
      };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to list distributions",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { distributionId } = body;

    if (!distributionId) {
      return NextResponse.json(
        { error: "distributionId is required" },
        { status: 400 }
      );
    }

    await deleteCloudFrontDistribution(distributionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete distribution",
      },
      { status: 500 }
    );
  }
}
