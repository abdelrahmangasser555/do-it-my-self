// Next.js API route for file metadata CRUD and presigned URL generation
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  readJsonFile,
  appendToJsonFile,
  deleteFromJsonFile,
  findInJsonFile,
} from "@/lib/filesystem";
import { generatePresignedUploadUrl, buildCloudFrontUrl } from "@/lib/aws";
import { uploadSchema } from "@/lib/validations";
import type { FileRecord, Bucket, Project } from "@/lib/types";

const FILE = "files.json";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const bucketName = searchParams.get("bucketName");

  let files = await readJsonFile<FileRecord>(FILE);
  if (projectId) {
    files = files.filter((f) => f.projectId === projectId);
  }
  if (bucketName) {
    files = files.filter((f) => f.bucketName === bucketName);
  }
  return NextResponse.json(files);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = uploadSchema.parse(body);

    // Validate project exists and check limits
    const project = await findInJsonFile<Project>(
      "projects.json",
      parsed.projectId
    );
    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Check file size limit
    const maxBytes = project.maxFileSizeMB * 1024 * 1024;
    if (parsed.fileSize > maxBytes) {
      return NextResponse.json(
        { error: `File exceeds max size of ${project.maxFileSizeMB} MB` },
        { status: 400 }
      );
    }

    // Check MIME type
    if (!project.allowedMimeTypes.includes(parsed.mimeType)) {
      return NextResponse.json(
        { error: `MIME type ${parsed.mimeType} is not allowed` },
        { status: 400 }
      );
    }

    // Find the bucket
    const buckets = await readJsonFile<Bucket>("buckets.json");
    const bucket = buckets.find(
      (b) =>
        b.s3BucketName === parsed.bucketName &&
        b.projectId === parsed.projectId
    );
    if (!bucket) {
      return NextResponse.json(
        { error: "Bucket not found for this project" },
        { status: 404 }
      );
    }

    // Generate object key and presigned URL
    const objectKey = `${parsed.projectId}/${uuidv4()}-${parsed.fileName}`;
    const uploadUrl = await generatePresignedUploadUrl(
      bucket.s3BucketName,
      objectKey,
      parsed.mimeType,
      bucket.region
    );

    const cloudFrontUrl = bucket.cloudFrontDomain
      ? buildCloudFrontUrl(bucket.cloudFrontDomain, objectKey)
      : "";

    // Store file metadata
    const fileRecord: FileRecord = {
      id: uuidv4(),
      projectId: parsed.projectId,
      bucketName: bucket.s3BucketName,
      objectKey,
      cloudFrontUrl,
      size: parsed.fileSize,
      mimeType: parsed.mimeType,
      linkedModel: parsed.linkedModel || "",
      linkedModelId: parsed.linkedModelId || "",
      createdAt: new Date().toISOString(),
    };

    await appendToJsonFile(FILE, fileRecord);

    return NextResponse.json(
      { uploadUrl, objectKey, cloudFrontUrl, file: fileRecord },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
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
  const deleted = await deleteFromJsonFile<FileRecord>(FILE, id);
  if (!deleted) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
