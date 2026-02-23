// Utility to generate copy-paste code snippets for bucket integration
import type { Bucket } from "@/lib/types";

export function generateEnvSnippet(bucket: Bucket): string {
  return `# Environment variables for ${bucket.name}
NEXT_PUBLIC_S3_BUCKET=${bucket.s3BucketName}
NEXT_PUBLIC_CLOUDFRONT_DOMAIN=${bucket.cloudFrontDomain || "your-distribution.cloudfront.net"}
AWS_REGION=${bucket.region}
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key`;
}

export function generateUploadApiSnippet(bucket: Bucket): string {
  return `// app/api/upload/route.ts — Server-side presigned URL generation
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

const s3 = new S3Client({ region: "${bucket.region}" });

export async function POST(request: NextRequest) {
  const { fileName, contentType } = await request.json();
  const objectKey = \`uploads/\${uuidv4()}-\${fileName}\`;

  const command = new PutObjectCommand({
    Bucket: "${bucket.s3BucketName}",
    Key: objectKey,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
  const cdnUrl = \`https://${bucket.cloudFrontDomain || "your-distribution.cloudfront.net"}/\${objectKey}\`;

  return NextResponse.json({ uploadUrl, objectKey, cdnUrl });
}`;
}

export function generateFrontendUploadSnippet(bucket: Bucket): string {
  return `// components/file-upload.tsx — Client-side direct upload to S3
"use client";

import { useState } from "react";

export function FileUpload() {
  const [uploading, setUploading] = useState(false);
  const [cdnUrl, setCdnUrl] = useState("");

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      // Step 1: Get presigned URL from your API
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
        }),
      });
      const { uploadUrl, cdnUrl } = await res.json();

      // Step 2: Upload directly to S3
      await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      setCdnUrl(cdnUrl);
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
      {cdnUrl && (
        <p>
          File available at: <a href={cdnUrl}>{cdnUrl}</a>
        </p>
      )}
    </div>
  );
}`;
}

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
