// Utility to generate framework-aware code snippets for bucket integration
import type { Bucket } from "@/lib/types";

// --- Environment ---
export function generateEnvSnippet(bucket: Bucket): string {
  return `# Environment variables for ${bucket.name}
NEXT_PUBLIC_S3_BUCKET=${bucket.s3BucketName}
NEXT_PUBLIC_CLOUDFRONT_DOMAIN=${bucket.cloudFrontDomain || "your-distribution.cloudfront.net"}
AWS_REGION=${bucket.region}
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key`;
}

// --- Upload API Snippets ---
export function generateNextjsUploadApi(bucket: Bucket): string {
  const cf = bucket.cloudFrontDomain || "your-distribution.cloudfront.net";
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
  const cf = bucket.cloudFrontDomain || "your-distribution.cloudfront.net";
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
  const cf = bucket.cloudFrontDomain || "your-distribution.cloudfront.net";
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
  const cf = bucket.cloudFrontDomain || "your-distribution.cloudfront.net";
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
  return `// components/file-upload.tsx — React client-side direct upload to S3
"use client";

import { useState, useCallback } from "react";

export function FileUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [cdnUrl, setCdnUrl] = useState("");

  const handleUpload = useCallback(async (file: File) => {
    // Client-side size check (bucket limit: ${bucket.config?.maxFileSizeMB ?? 100} MB)
    const MAX_SIZE = ${bucket.config?.maxFileSizeMB ?? 100} * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert(\`File is too large. Max size: ${bucket.config?.maxFileSizeMB ?? 100} MB\`);
      return;
    }

    setUploading(true);
    setProgress(0);

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
      const { uploadUrl, cdnUrl: url } = await res.json();

      // Step 2: Upload with progress tracking
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      xhr.onload = () => {
        setCdnUrl(url);
        setUploading(false);
      };
      xhr.onerror = () => setUploading(false);
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);
    } catch (error) {
      console.error("Upload failed:", error);
      setUploading(false);
    }
  }, []);

  return (
    <div
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) handleUpload(file);
      }}
      onDragOver={(e) => e.preventDefault()}
      className="rounded-lg border-2 border-dashed p-8 text-center transition-colors hover:border-primary/50"
    >
      <input
        type="file"
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        className="hidden"
        id="file-input"
        disabled={uploading}
      />
      <label htmlFor="file-input" className="cursor-pointer">
        {uploading
          ? \`Uploading... \${progress}%\`
          : "Drop a file here or click to upload"}
      </label>
      {cdnUrl && (
        <p className="mt-2 text-sm text-green-600">
          Available at: <a href={cdnUrl}>{cdnUrl}</a>
        </p>
      )}
    </div>
  );
}`;
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
