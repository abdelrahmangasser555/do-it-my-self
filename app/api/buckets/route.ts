// Next.js API route handler for bucket CRUD
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  readJsonFile,
  appendToJsonFile,
  updateInJsonFile,
  deleteFromJsonFile,
  findInJsonFile,
} from "@/lib/filesystem";
import { bucketSchema } from "@/lib/validations";
import type { Bucket, FileRecord } from "@/lib/types";
import {
  emptyBucket,
  deleteS3Bucket,
  deleteCloudFrontDistribution,
  deleteS3Object,
} from "@/lib/aws";

const FILE = "buckets.json";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const id = searchParams.get("id");

  if (id) {
    const bucket = await findInJsonFile<Bucket>(FILE, id);
    if (!bucket) return NextResponse.json({ error: "Bucket not found" }, { status: 404 });
    return NextResponse.json(bucket);
  }

  let buckets = await readJsonFile<Bucket>(FILE);
  if (projectId) {
    buckets = buckets.filter((b) => b.projectId === projectId);
  }
  return NextResponse.json(buckets);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = bucketSchema.parse(body);

    const s3BucketName = `scr-${parsed.name}-${Date.now()}`;

    const bucket: Bucket = {
      id: uuidv4(),
      projectId: parsed.projectId,
      name: parsed.name,
      s3BucketName,
      s3BucketArn: "",
      cloudFrontDomain: "",
      cloudFrontDistributionId: "",
      region: parsed.region,
      status: "pending",
      config: {
        versioning: parsed.versioning ?? false,
        encryption: parsed.encryption ?? "s3",
        backupEnabled: parsed.backupEnabled ?? false,
        maxFileSizeMB: parsed.maxFileSizeMB ?? 100,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await appendToJsonFile(FILE, bucket);
    return NextResponse.json(bucket, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Validation failed" },
      { status: 400 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }
    const updated = await updateInJsonFile<Bucket>(FILE, id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    if (!updated) {
      return NextResponse.json({ error: "Bucket not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 400 }
    );
  }
}

/**
 * DELETE handler — supports two modes:
 *
 *   ?id=xxx              — soft delete: remove metadata only (old behaviour)
 *   ?id=xxx&full=true    — full delete: files → CloudFront → S3 bucket → metadata
 *
 * The full delete streams progress as newline-delimited JSON so the UI can
 * update a step-by-step progress bar.
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const full = searchParams.get("full") === "true";

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  const bucket = await findInJsonFile<Bucket>(FILE, id);
  if (!bucket) {
    return NextResponse.json({ error: "Bucket not found" }, { status: 404 });
  }

  if (!full) {
    // Soft delete — just remove metadata
    await deleteFromJsonFile<Bucket>(FILE, id);
    // Also remove associated file records
    const files = await readJsonFile<FileRecord>("files.json");
    const remaining = files.filter((f) => f.bucketName !== bucket.s3BucketName);
    const { writeJsonFile } = await import("@/lib/filesystem");
    await writeJsonFile("files.json", remaining);
    return NextResponse.json({ success: true });
  }

  // ── Full delete with streamed progress ─────────────────────────────────
  await updateInJsonFile<Bucket>(FILE, id, { status: "deleting" } as Partial<Bucket>);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (step: string, status: string, error?: string) => {
        controller.enqueue(
          encoder.encode(JSON.stringify({ step, status, error }) + "\n")
        );
      };

      try {
        // Step 1 — Delete all files in S3
        send("files", "running");
        try {
          if (bucket.s3BucketName) {
            const deleted = await emptyBucket(bucket.s3BucketName, bucket.region);
            send("files", "done");
          } else {
            send("files", "done");
          }
        } catch (e) {
          send("files", "error", e instanceof Error ? e.message : "Failed to delete files");
        }

        // Step 2 — Delete CloudFront distribution
        send("cloudfront", "running");
        try {
          if (bucket.cloudFrontDistributionId) {
            await deleteCloudFrontDistribution(bucket.cloudFrontDistributionId);
          }
          send("cloudfront", "done");
        } catch (e) {
          send("cloudfront", "error", e instanceof Error ? e.message : "Failed to delete CloudFront");
        }

        // Step 3 — Delete S3 bucket
        send("bucket", "running");
        try {
          if (bucket.s3BucketName) {
            await deleteS3Bucket(bucket.s3BucketName, bucket.region);
          }
          send("bucket", "done");
        } catch (e) {
          send("bucket", "error", e instanceof Error ? e.message : "Failed to delete bucket");
        }

        // Step 4 — Remove metadata
        send("metadata", "running");
        await deleteFromJsonFile<Bucket>(FILE, id);
        const files = await readJsonFile<FileRecord>("files.json");
        const remaining = files.filter((f) => f.bucketName !== bucket.s3BucketName);
        const { writeJsonFile } = await import("@/lib/filesystem");
        await writeJsonFile("files.json", remaining);
        send("metadata", "done");

        send("complete", "done");
      } catch (e) {
        send("complete", "error", e instanceof Error ? e.message : "Deletion failed");
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
