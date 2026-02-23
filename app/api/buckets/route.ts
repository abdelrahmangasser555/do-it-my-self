// Next.js API route handler for bucket CRUD and CDK deployment triggers
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  readJsonFile,
  appendToJsonFile,
  updateInJsonFile,
  deleteFromJsonFile,
} from "@/lib/filesystem";
import { bucketSchema } from "@/lib/validations";
import type { Bucket } from "@/lib/types";

const FILE = "buckets.json";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
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

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }
  const deleted = await deleteFromJsonFile<Bucket>(FILE, id);
  if (!deleted) {
    return NextResponse.json({ error: "Bucket not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
