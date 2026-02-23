// API route to list actual S3 objects and merge with local metadata
import { NextRequest, NextResponse } from "next/server";
import { listS3Objects } from "@/lib/aws";
import { readJsonFile } from "@/lib/filesystem";
import type { FileRecord, Bucket } from "@/lib/types";

export interface MergedS3File {
  key: string;
  size: number;
  lastModified: string;
  etag?: string;
  storageClass?: string;
  /** true if this file also exists in our local metadata (uploaded from the system) */
  uploadedFromSystem: boolean;
  /** metadata record if it was uploaded from the system */
  metadata?: FileRecord;
  /** CDN URL built from CloudFront domain */
  cdnUrl?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bucketName = searchParams.get("bucketName");
  const region = searchParams.get("region");
  const prefix = searchParams.get("prefix");

  if (!bucketName) {
    return NextResponse.json(
      { error: "bucketName is required" },
      { status: 400 }
    );
  }

  try {
    // Fetch actual S3 objects
    const s3Objects = await listS3Objects(
      bucketName,
      region || undefined,
      prefix || undefined
    );

    // Fetch local metadata
    const allMetadata = await readJsonFile<FileRecord>("files.json");
    const bucketMetadata = allMetadata.filter(
      (f) => f.bucketName === bucketName
    );

    // Build a set of object keys from metadata for fast lookup
    const metadataByKey = new Map<string, FileRecord>();
    for (const record of bucketMetadata) {
      metadataByKey.set(record.objectKey, record);
    }

    // Find the bucket to get CloudFront domain
    const buckets = await readJsonFile<Bucket>("buckets.json");
    const bucket = buckets.find((b) => b.s3BucketName === bucketName);
    const cfDomain = bucket?.cloudFrontDomain;

    // Merge S3 objects with metadata
    const merged: MergedS3File[] = s3Objects.map((obj) => {
      const meta = metadataByKey.get(obj.key);
      return {
        key: obj.key,
        size: obj.size,
        lastModified: obj.lastModified,
        etag: obj.etag,
        storageClass: obj.storageClass,
        uploadedFromSystem: !!meta,
        metadata: meta || undefined,
        cdnUrl: cfDomain ? `https://${cfDomain}/${obj.key}` : undefined,
      };
    });

    // Calculate totals
    const totalSize = s3Objects.reduce((sum, o) => sum + o.size, 0);
    const totalFiles = s3Objects.length;
    const systemUploaded = merged.filter((f) => f.uploadedFromSystem).length;

    return NextResponse.json({
      files: merged,
      totalSize,
      totalFiles,
      systemUploaded,
      bucketName,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to list S3 objects",
      },
      { status: 500 }
    );
  }
}
