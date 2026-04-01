// Utility to generate framework-aware code snippets for bucket integration
import type { Bucket } from '@/lib/types';

// --- Install Commands ---
export function generateInstallSnippet(framework: 'nextjs' | 'node' | 'python' | 'java'): string {
  switch (framework) {
    case 'nextjs':
      return `# Install AWS SDK v3 packages + UUID helper
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner uuid

# Or with pnpm / yarn
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner uuid
yarn add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner uuid`;
    case 'node':
      return `# Install AWS SDK v3 packages + Express + UUID
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner express uuid

# Or with pnpm / yarn
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner express uuid
yarn add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner express uuid`;
    case 'python':
      return `# Install boto3 (AWS SDK for Python) + Flask
pip install boto3 flask

# Or with a requirements.txt
echo "boto3\\nflask" >> requirements.txt
pip install -r requirements.txt`;
    case 'java':
      return `<!-- Add to pom.xml (Maven) -->
<dependency>
  <groupId>software.amazon.awssdk</groupId>
  <artifactId>s3</artifactId>
  <version>2.25.0</version>
</dependency>
<dependency>
  <groupId>software.amazon.awssdk</groupId>
  <artifactId>s3-transfer-manager</artifactId>
  <version>2.25.0</version>
</dependency>

# Or with Gradle (build.gradle)
# implementation 'software.amazon.awssdk:s3:2.25.0'`;
  }
}

// --- Environment ---
export interface AwsCredentials {
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
}

export function generateEnvSnippet(bucket: Bucket, creds?: AwsCredentials): string {
  const keyId = creds?.accessKeyId || 'YOUR_AWS_ACCESS_KEY_ID';
  const secret = creds?.secretAccessKey || 'YOUR_AWS_SECRET_ACCESS_KEY';
  return `# Environment variables for ${bucket.name}
NEXT_PUBLIC_S3_BUCKET=${bucket.s3BucketName}
NEXT_PUBLIC_CLOUDFRONT_DOMAIN=${bucket.cloudFrontDomain || 'your-distribution.cloudfront.net'}
AWS_REGION=${bucket.region}
AWS_ACCESS_KEY_ID=${keyId}
AWS_SECRET_ACCESS_KEY=${secret}`;
}

// --- Upload API Snippets ---
export function generateNextjsUploadApi(bucket: Bucket): string {
  const cf = bucket.cloudFrontDomain || 'your-distribution.cloudfront.net';
  return `// app/api/upload/route.ts — Next.js App Router presigned upload
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

const s3 = new S3Client({ region: "${bucket.region}" });

const MAX_FILE_SIZE_MB = ${bucket.config?.maxFileSizeMB ?? 100};

export async function POST(request: NextRequest) {
  const { fileName, contentType, fileSize } = await request.json();

  // Validate file size (bucket limit: ${bucket.config?.maxFileSizeMB ?? 100} MB)
  if (fileSize > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return NextResponse.json(
      { error: \`File exceeds max size of \${MAX_FILE_SIZE_MB} MB\` },
      { status: 400 }
    );
  }

  const objectKey = \`uploads/\${uuidv4()}-\${fileName}\`;

  const command = new PutObjectCommand({
    Bucket: "${bucket.s3BucketName}",
    Key: objectKey,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
  const cdnUrl = \`https://${cf}/\${objectKey}\`;

  return NextResponse.json({ uploadUrl, objectKey, cdnUrl });
}`;
}

export function generateNodeExpressUploadApi(bucket: Bucket): string {
  const cf = bucket.cloudFrontDomain || 'your-distribution.cloudfront.net';
  return `// routes/upload.js — Express.js presigned upload endpoint
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { v4: uuidv4 } = require("uuid");
const express = require("express");

const router = express.Router();
const s3 = new S3Client({ region: "${bucket.region}" });

const MAX_FILE_SIZE_MB = ${bucket.config?.maxFileSizeMB ?? 100};

router.post("/upload", async (req, res) => {
  try {
    const { fileName, contentType, fileSize } = req.body;

    if (fileSize > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return res.status(400).json({
        error: \`File exceeds max size of \${MAX_FILE_SIZE_MB} MB\`,
      });
    }

    const objectKey = \`uploads/\${uuidv4()}-\${fileName}\`;

    const command = new PutObjectCommand({
      Bucket: "${bucket.s3BucketName}",
      Key: objectKey,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
    const cdnUrl = \`https://${cf}/\${objectKey}\`;

    res.json({ uploadUrl, objectKey, cdnUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;`;
}

export function generatePythonUploadApi(bucket: Bucket): string {
  const cf = bucket.cloudFrontDomain || 'your-distribution.cloudfront.net';
  return `# upload.py — Python (Flask / FastAPI) presigned upload
import boto3
import uuid
from flask import Flask, request, jsonify

app = Flask(__name__)
s3 = boto3.client("s3", region_name="${bucket.region}")

MAX_FILE_SIZE_MB = ${bucket.config?.maxFileSizeMB ?? 100}

@app.route("/upload", methods=["POST"])
def upload():
    data = request.json
    file_name = data["fileName"]
    content_type = data["contentType"]
    file_size = data.get("fileSize", 0)

    # Validate file size (bucket limit: ${bucket.config?.maxFileSizeMB ?? 100} MB)
    if file_size > MAX_FILE_SIZE_MB * 1024 * 1024:
        return jsonify({"error": f"File exceeds max size of {MAX_FILE_SIZE_MB} MB"}), 400

    object_key = f"uploads/{uuid.uuid4()}-{file_name}"

    upload_url = s3.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": "${bucket.s3BucketName}",
            "Key": object_key,
            "ContentType": content_type,
        },
        ExpiresIn=3600,
    )

    cdn_url = f"https://${cf}/{object_key}"
    return jsonify({"uploadUrl": upload_url, "objectKey": object_key, "cdnUrl": cdn_url})`;
}

export function generateJavaUploadApi(bucket: Bucket): string {
  const cf = bucket.cloudFrontDomain || 'your-distribution.cloudfront.net';
  return `// UploadController.java — Spring Boot presigned upload
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import org.springframework.web.bind.annotation.*;
import java.time.Duration;
import java.util.*;

@RestController
public class UploadController {

    private static final long MAX_FILE_SIZE_MB = ${bucket.config?.maxFileSizeMB ?? 100};

    @PostMapping("/upload")
    public Map<String, String> upload(@RequestBody Map<String, Object> body) {
        String fileName = (String) body.get("fileName");
        String contentType = (String) body.get("contentType");
        long fileSize = ((Number) body.getOrDefault("fileSize", 0)).longValue();

        if (fileSize > MAX_FILE_SIZE_MB * 1024 * 1024) {
            throw new RuntimeException("File exceeds max size of " + MAX_FILE_SIZE_MB + " MB");
        }

        String objectKey = "uploads/" + UUID.randomUUID() + "-" + fileName;

        S3Presigner presigner = S3Presigner.builder()
                .region(software.amazon.awssdk.regions.Region.of("${bucket.region}"))
                .build();

        PutObjectRequest putRequest = PutObjectRequest.builder()
                .bucket("${bucket.s3BucketName}")
                .key(objectKey)
                .contentType(contentType)
                .build();

        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(Duration.ofHours(1))
                .putObjectRequest(putRequest)
                .build();

        String uploadUrl = presigner.presignPutObject(presignRequest)
                .url().toString();

        String cdnUrl = "https://${cf}/" + objectKey;

        return Map.of(
            "uploadUrl", uploadUrl,
            "objectKey", objectKey,
            "cdnUrl", cdnUrl
        );
    }
}`;
}

// --- Frontend Upload Snippet ---
export function generateFrontendUploadSnippet(bucket: Bucket): string {
  return `// components/file-upload.tsx — Drag & drop upload with progress + file list
"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, X, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: "uploading" | "complete" | "error";
  cdnUrl?: string;
  error?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function FileUpload() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const MAX_SIZE = ${bucket.config?.maxFileSizeMB ?? 100} * 1024 * 1024;

  const uploadFile = useCallback(async (file: File) => {
    if (file.size > MAX_SIZE) {
      const entry: UploadedFile = {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        progress: 0,
        status: "error",
        error: "File exceeds ${bucket.config?.maxFileSizeMB ?? 100} MB limit",
      };
      setFiles((prev) => [...prev, entry]);
      return;
    }

    const id = crypto.randomUUID();
    const entry: UploadedFile = {
      id,
      name: file.name,
      size: file.size,
      progress: 0,
      status: "uploading",
    };
    setFiles((prev) => [...prev, entry]);

    try {
      // Step 1: Get presigned URL from your API
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
        }),
      });
      const { uploadUrl, cdnUrl } = await res.json();

      // Step 2: Upload directly to S3 with progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setFiles((prev) =>
              prev.map((f) => (f.id === id ? { ...f, progress } : f))
            );
          }
        };
        xhr.onload = () => {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === id ? { ...f, progress: 100, status: "complete", cdnUrl } : f
            )
          );
          resolve();
        };
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });
    } catch (err) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, status: "error", error: err instanceof Error ? err.message : "Upload failed" }
            : f
        )
      );
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const dropped = Array.from(e.dataTransfer.files);
      dropped.forEach(uploadFile);
    },
    [uploadFile]
  );

  const handleSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files || []);
      selected.forEach(uploadFile);
      e.target.value = "";
    },
    [uploadFile]
  );

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors",
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        )}
      >
        <div className="rounded-full bg-muted p-3">
          <Upload className="size-5 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">
            Drop files here or click to browse
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Max file size: ${bucket.config?.maxFileSizeMB ?? 100} MB
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleSelect}
          className="hidden"
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 rounded-lg border bg-card p-3"
            >
              <FileText className="size-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <span className="text-xs text-muted-foreground ml-2 shrink-0">
                    {formatBytes(file.size)}
                  </span>
                </div>
                {file.status === "uploading" && (
                  <Progress value={file.progress} className="mt-1.5 h-1" />
                )}
                {file.status === "error" && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="size-3" /> {file.error}
                  </p>
                )}
                {file.status === "complete" && (
                  <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="size-3" /> Uploaded
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 shrink-0"
                onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
              >
                <X className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Usage example:
// import { FileUpload } from "@/components/file-upload";
// <FileUpload />`;
}

// --- Delete Snippet ---
export function generateDeleteSnippet(bucket: Bucket): string {
  return `// app/api/delete-file/route.ts — Delete file from S3
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";

const s3 = new S3Client({ region: "${bucket.region}" });

export async function DELETE(request: NextRequest) {
  const { objectKey } = await request.json();

  const command = new DeleteObjectCommand({
    Bucket: "${bucket.s3BucketName}",
    Key: objectKey,
  });

  await s3.send(command);
  return NextResponse.json({ success: true });
}`;
}

// Re-export aliases for backward compatibility
export const generateUploadApiSnippet = generateNextjsUploadApi;

// --- Linked vs Orphan File Upload Example ---
export function generateLinkedUploadSnippet(bucket: Bucket): string {
  return `// Example: Upload a FILE that is LINKED to a model record
// This makes the file traceable and NOT an orphan in your system.
//
// ╔══════════════════════════════════════════════════════════════╗
// ║  LINKED FILE:  Has linkedModel + linkedModelId set          ║
// ║  ORPHAN FILE:  Missing linkedModel or linkedModelId         ║
// ╚══════════════════════════════════════════════════════════════╝
//
// When you upload a file through the Storage Control Room API and
// provide linkedModel and linkedModelId, the file is associated
// with a specific record in your application (e.g., a user avatar,
// a product image, a document attachment).
//
// Files uploaded WITHOUT these fields are marked as "Orphan" —
// they exist in S3 but are not linked to any application record.

// Step 1: Request a presigned upload URL WITH linking metadata
const response = await fetch("/api/files", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    projectId: "your-project-id",
    bucketName: "${bucket.s3BucketName}",
    fileName: "profile-photo.jpg",
    fileSize: 204800, // 200 KB
    mimeType: "image/jpeg",

    // ✅ LINKED — These two fields prevent the file from being an orphan
    linkedModel: "User",           // The model/table name in your app
    linkedModelId: "user-12345",   // The specific record ID
  }),
});

const { uploadUrl, objectKey, cloudFrontUrl } = await response.json();
// uploadUrl → presigned S3 PUT URL (expires in 1 hour)
// objectKey → e.g., "your-project-id/abc123-profile-photo.jpg"
// cloudFrontUrl → e.g., "https://${bucket.cloudFrontDomain || 'xxx.cloudfront.net'}/your-project-id/abc123-profile-photo.jpg"

// Step 2: Upload the actual file to S3 using the presigned URL
await fetch(uploadUrl, {
  method: "PUT",
  headers: { "Content-Type": "image/jpeg" },
  body: fileBlob, // File or Blob object
});

// Step 3: Save the CDN URL in your application database
// e.g., UPDATE users SET avatar_url = cloudFrontUrl WHERE id = 'user-12345';
console.log("File accessible at:", cloudFrontUrl);

// ──────────────────────────────────────────────────────
// ORPHAN example (what NOT to do if you want linking):
// ──────────────────────────────────────────────────────
// const orphanResponse = await fetch("/api/files", {
//   method: "POST",
//   body: JSON.stringify({
//     projectId: "your-project-id",
//     bucketName: "${bucket.s3BucketName}",
//     fileName: "random-file.pdf",
//     fileSize: 102400,
//     mimeType: "application/pdf",
//     // ❌ No linkedModel or linkedModelId → ORPHAN
//   }),
// });`;
}

// --- Orphan Explanation Text ---
export function generateOrphanExplanationText(): string {
  return `## Linked vs Orphan Files

**Linked File**: A file uploaded with \`linkedModel\` and \`linkedModelId\` fields.
These fields associate the file with a specific record in your application
(e.g., a user profile photo linked to User:user-123).

**Orphan File**: A file uploaded WITHOUT linking metadata. The file exists in
S3 and has a CDN URL, but is not associated with any application record.

### Why does this matter?
- **Cleanup**: Orphan files make it harder to determine which files are still
  needed. When you delete a user record, linked files can be cleaned up
  automatically, but orphan files remain.
- **Tracking**: The Storage Control Room dashboard shows orphan badges to help
  you identify files that may need linking or cleanup.
- **Billing**: Unlinked files still cost money for storage and CDN delivery.

### How to link files
When calling the upload API, include:
\`\`\`json
{
  "linkedModel": "YourModelName",
  "linkedModelId": "record-id-123"
}
\`\`\``;
}

// --- AI Assistant Prompt Generator ---
export function generateAIAssistantPrompt(
  bucket: Bucket,
  creds?: AwsCredentials,
  extraInstructions?: string,
): string {
  const keyId = creds?.accessKeyId || 'YOUR_AWS_ACCESS_KEY_ID';
  const secret = creds?.secretAccessKey || 'YOUR_AWS_SECRET_ACCESS_KEY';
  const cf = bucket.cloudFrontDomain
    ? `https://${bucket.cloudFrontDomain}`
    : 'https://your-distribution.cloudfront.net';

  return `You are an expert full-stack developer helping me set up AWS S3 file storage in my web application.

## My AWS Infrastructure

I have an S3 bucket and CloudFront CDN already provisioned. Here are the exact details:

| Property | Value |
|----------|-------|
| Bucket Name | ${bucket.s3BucketName} |
| Region | ${bucket.region} |
| CloudFront CDN | ${cf} |
| Max File Size | ${bucket.config?.maxFileSizeMB ?? 100} MB |
| Allowed Types | ${bucket.config?.allowedFileTypes ?? 'any'} |
| Access | ${bucket.config?.access ?? 'private'} |
| Encryption | ${bucket.config?.encryption?.toUpperCase() ?? 'S3'} |

## AWS Credentials (server-side only — NEVER expose to the browser)

\`\`\`env
AWS_REGION=${bucket.region}
AWS_ACCESS_KEY_ID=${keyId}
AWS_SECRET_ACCESS_KEY=${secret}
NEXT_PUBLIC_S3_BUCKET=${bucket.s3BucketName}
NEXT_PUBLIC_CLOUDFRONT_DOMAIN=${bucket.cloudFrontDomain || 'your-distribution.cloudfront.net'}
\`\`\`

## Upload Architecture

The system uses **presigned URLs** for secure browser uploads:

1. **Browser** calls my server's \`POST /api/upload\` with filename, size, and content type
2. **Server** uses AWS SDK v3 to generate a presigned S3 PUT URL (expires in 1 hour)
3. **Browser** uploads the file DIRECTLY to S3 using the presigned URL (no proxy)
4. **Browser** receives the CloudFront CDN URL for the uploaded file

This means AWS credentials are ONLY on the server. The browser never sees them.

## Server-Side Upload API (Next.js App Router)

\`\`\`typescript
// app/api/upload/route.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

const s3 = new S3Client({ region: process.env.AWS_REGION! });

export async function POST(request: NextRequest) {
  const { fileName, contentType, fileSize, linkedModel, linkedModelId, folderPrefix } =
    await request.json();

  // Validate (max ${bucket.config?.maxFileSizeMB ?? 100} MB)
  if (fileSize > ${bucket.config?.maxFileSizeMB ?? 100} * 1024 * 1024) {
    return NextResponse.json({ error: "File too large" }, { status: 400 });
  }

  const prefix = folderPrefix || linkedModel?.toLowerCase() || "uploads";
  const objectKey = \`\${prefix}/\${uuidv4()}-\${fileName}\`;

  const command = new PutObjectCommand({
    Bucket: process.env.NEXT_PUBLIC_S3_BUCKET!,
    Key: objectKey,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
  const cdnUrl = \`https://\${process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN}/\${objectKey}\`;

  // Optionally: store file metadata in your database here
  // await db.fileRecord.create({ objectKey, cdnUrl, linkedModel, linkedModelId })

  return NextResponse.json({ uploadUrl, objectKey, cdnUrl });
}
\`\`\`

## Frontend Upload Component

\`\`\`typescript
// components/file-upload.tsx
"use client";
import { useState, useCallback } from "react";

interface FileUploadProps {
  /** Pass the app model name to link the file (prevents orphan status) */
  linkedModel?: string;
  /** Pass the specific record ID to link the file */
  linkedModelId?: string;
  /** Optional S3 folder to organize uploads */
  folderPrefix?: string;
  onUploadComplete?: (cdnUrl: string, objectKey: string) => void;
}

export function FileUpload({ linkedModel, linkedModelId, folderPrefix, onUploadComplete }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);

    try {
      // Get presigned URL
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
          linkedModel,   // ← links the file to your model (prevents orphan)
          linkedModelId, // ← links the file to the specific record
          folderPrefix,  // ← organizes files in S3 folder
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      const { uploadUrl, cdnUrl, objectKey } = await res.json();

      // Upload to S3 with progress tracking via XHR
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => (xhr.status < 400 ? resolve() : reject(new Error(\`S3 error: \${xhr.status}\`)));
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      onUploadComplete?.(cdnUrl, objectKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [linkedModel, linkedModelId, folderPrefix, onUploadComplete]);

  return (
    <div>
      <input
        type="file"
        disabled={uploading}
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
      {uploading && <p>Uploading... {progress}%</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}

// Usage — LINKED (recommended):
// <FileUpload linkedModel="User" linkedModelId={user.id} folderPrefix="avatars" onUploadComplete={(url) => setAvatarUrl(url)} />

// Usage — ORPHAN (avoid unless intentional):
// <FileUpload onUploadComplete={(url) => console.log(url)} />
\`\`\`

## File Deletion API

\`\`\`typescript
// app/api/upload/route.ts — add DELETE handler
export async function DELETE(request: NextRequest) {
  const { objectKey } = await request.json();
  await s3.send(new DeleteObjectCommand({ Bucket: process.env.NEXT_PUBLIC_S3_BUCKET!, Key: objectKey }));
  return NextResponse.json({ success: true });
}
\`\`\`

## Key Rules to Follow

1. **NEVER** put AWS credentials in client-side code or NEXT_PUBLIC_ vars (except bucket name and CDN domain)
2. **Always** pass \`linkedModel\` and \`linkedModelId\` when you know which record the file belongs to
3. **Store the CDN URL** (\`cdnUrl\`) in your database, not the S3 URL
4. **Validate file size and type** on the server before generating the presigned URL
5. The presigned URL expires in **1 hour** — generate it just before the upload

## Your Task

Set up a complete file upload system in my ${bucket.config?.allowedFileTypes === 'images' ? 'image' : 'file'} upload feature following the exact API convention and architecture described above.
${extraInstructions ? `\n## Additional Instructions from Developer\n${extraInstructions}` : ''}`;
}
