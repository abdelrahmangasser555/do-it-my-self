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

// Infer MIME type from file extension as a fallback
function inferMimeType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const mimeMap: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif",
    webp: "image/webp", svg: "image/svg+xml", bmp: "image/bmp", ico: "image/x-icon",
    pdf: "application/pdf", json: "application/json", xml: "application/xml",
    csv: "text/csv", txt: "text/plain", html: "text/html", css: "text/css",
    js: "application/javascript", ts: "application/typescript",
    zip: "application/zip", gz: "application/gzip", tar: "application/x-tar",
    mp4: "video/mp4", webm: "video/webm", avi: "video/x-msvideo",
    mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
  return mimeMap[ext] || "application/octet-stream";
}

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

    // Sanitize file name: trim whitespace, replace problematic characters
    const sanitizedFileName = parsed.fileName
      .trim()
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_{2,}/g, "_");

    if (!sanitizedFileName || sanitizedFileName === "_") {
      return NextResponse.json(
        { error: "Invalid file name" },
        { status: 400 }
      );
    }

    // Resolve MIME type: use extension-based inference as fallback
    let resolvedMimeType = parsed.mimeType;
    if (
      resolvedMimeType === "application/octet-stream" ||
      !resolvedMimeType
    ) {
      const inferred = inferMimeType(parsed.fileName);
      if (inferred !== "application/octet-stream") {
        resolvedMimeType = inferred;
      }
    }

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

    // Check MIME type against allowed list
    // If inferred type is still octet-stream, allow it as a wildcard fallback
    if (
      !project.allowedMimeTypes.includes(resolvedMimeType) &&
      resolvedMimeType !== "application/octet-stream"
    ) {
      return NextResponse.json(
        {
          error: `MIME type ${resolvedMimeType} is not allowed for project "${project.name}". Allowed: ${project.allowedMimeTypes.join(", ")}`,
        },
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

    // Check file size limit — bucket-level is authoritative, project-level is the default fallback
    const bucketMaxMB = bucket.config?.maxFileSizeMB ?? project.maxFileSizeMB;
    const effectiveMaxMB = Math.min(bucketMaxMB, project.maxFileSizeMB);
    const maxBytes = effectiveMaxMB * 1024 * 1024;
    const fileSizeMB = (parsed.fileSize / (1024 * 1024)).toFixed(2);

    if (parsed.fileSize > maxBytes) {
      const source = bucketMaxMB <= project.maxFileSizeMB ? "bucket" : "project";
      return NextResponse.json(
        {
          error: `File size (${fileSizeMB} MB) exceeds the ${source}-level limit of ${effectiveMaxMB} MB.`,
          details: {
            fileSizeMB: Number(fileSizeMB),
            bucketLimitMB: bucketMaxMB,
            projectLimitMB: project.maxFileSizeMB,
            effectiveLimitMB: effectiveMaxMB,
            enforcedBy: source,
          },
        },
        { status: 400 }
      );
    }

    // Generate object key and presigned URL
    // Support optional folderPrefix for organizing files into folders
    const rawPrefix = body.folderPrefix
      ? body.folderPrefix.replace(/^\/+|\/+$/g, "").replace(/\/\//g, "/")
      : parsed.projectId;
    const folderPrefix = rawPrefix || parsed.projectId; // ensure never empty
    const objectKey = `${folderPrefix}/${uuidv4()}-${sanitizedFileName}`;
    const uploadUrl = await generatePresignedUploadUrl(
      bucket.s3BucketName,
      objectKey,
      resolvedMimeType,
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
      mimeType: resolvedMimeType,
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

  // Find the file record first so we can delete from S3
  const file = await findInJsonFile<FileRecord>(FILE, id);
  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  // Attempt S3 deletion
  try {
    const buckets = await readJsonFile<Bucket>("buckets.json");
    const bucket = buckets.find((b) => b.s3BucketName === file.bucketName);
    if (bucket && bucket.status === "active") {
      const { deleteS3Object } = await import("@/lib/aws");
      await deleteS3Object(file.bucketName, file.objectKey, bucket.region);
    }
  } catch {
    // S3 deletion failed — continue with metadata removal and report
  }

  const deleted = await deleteFromJsonFile<FileRecord>(FILE, id);
  if (!deleted) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
