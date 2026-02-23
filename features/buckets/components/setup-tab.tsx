// Setup & Integration tab — code snippets for integrating with the bucket
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Copy, Code2 } from "lucide-react";
import type { Bucket } from "@/lib/types";

interface SetupTabProps {
  bucket: Bucket;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="absolute right-2 top-2"
      onClick={handleCopy}
    >
      {copied ? (
        <Check className="size-3.5 text-green-500" />
      ) : (
        <Copy className="size-3.5" />
      )}
    </Button>
  );
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  return (
    <div className="relative">
      <CopyButton text={code} />
      <pre className="overflow-x-auto rounded-lg border bg-muted/50 p-4 text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
      <Badge variant="outline" className="absolute bottom-2 right-2 text-xs">
        {language}
      </Badge>
    </div>
  );
}

export function SetupTab({ bucket }: SetupTabProps) {
  const snippets = [
    {
      title: "Next.js API Route — Upload File",
      description: "Server-side presigned URL generation for direct S3 uploads",
      language: "TypeScript",
      code: `// app/api/upload/route.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({ region: "${bucket.region}" });

export async function POST(req: Request) {
  const { fileName, contentType } = await req.json();
  const key = \`uploads/\${Date.now()}-\${fileName}\`;

  const command = new PutObjectCommand({
    Bucket: "${bucket.s3BucketName}",
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  const cdnUrl = \`https://${bucket.cloudFrontDomain || "<your-cf-domain>"}/\${key}\`;

  return Response.json({ uploadUrl, cdnUrl, key });
}`,
    },
    {
      title: "React Upload Component",
      description: "Client-side drag & drop upload with progress tracking",
      language: "TypeScript (React)",
      code: `"use client";
import { useCallback, useState } from "react";

export function FileUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true);
    // 1. Get presigned URL from your API
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type,
      }),
    });
    const { uploadUrl, cdnUrl } = await res.json();

    // 2. Upload directly to S3
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      setUploading(false);
      console.log("File available at:", cdnUrl);
    };
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.send(file);
  }, []);

  return (
    <div
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) handleUpload(file);
      }}
      onDragOver={(e) => e.preventDefault()}
      className="rounded-lg border-2 border-dashed p-8 text-center"
    >
      {uploading ? \`Uploading... \${progress}%\` : "Drop a file here to upload"}
    </div>
  );
}`,
    },
    {
      title: "Python SDK — Upload File",
      description: "Upload files using boto3",
      language: "Python",
      code: `import boto3

s3 = boto3.client("s3", region_name="${bucket.region}")

def upload_file(local_path: str, object_key: str):
    """Upload a file to the ${bucket.name} bucket."""
    s3.upload_file(
        Filename=local_path,
        Bucket="${bucket.s3BucketName}",
        Key=object_key,
        ExtraArgs={"ContentType": "application/octet-stream"},
    )
    cdn_url = f"https://${bucket.cloudFrontDomain || "<your-cf-domain>"}/{object_key}"
    return cdn_url

# Usage
url = upload_file("./photo.jpg", "images/photo.jpg")
print(f"Uploaded: {url}")`,
    },
    {
      title: "cURL — Direct S3 Upload",
      description: "Upload using a presigned URL from the command line",
      language: "Bash",
      code: `# 1. Get a presigned URL from your API
RESPONSE=$(curl -s -X POST http://localhost:3000/api/upload \\
  -H "Content-Type: application/json" \\
  -d '{"fileName": "image.png", "contentType": "image/png"}')

UPLOAD_URL=$(echo $RESPONSE | jq -r '.uploadUrl')
CDN_URL=$(echo $RESPONSE | jq -r '.cdnUrl')

# 2. Upload the file directly to S3
curl -X PUT "$UPLOAD_URL" \\
  -H "Content-Type: image/png" \\
  --data-binary @./image.png

echo "File available at: $CDN_URL"`,
    },
    {
      title: "Environment Variables",
      description: "Required env vars for your application",
      language: "env",
      code: `# .env.local
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=${bucket.region}
S3_BUCKET_NAME=${bucket.s3BucketName}
CLOUDFRONT_DOMAIN=${bucket.cloudFrontDomain || "your-cf-domain.cloudfront.net"}`,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Code2 className="size-5" />
          Integration Guide
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Ready-to-use code snippets for integrating with{" "}
          <span className="font-mono">{bucket.s3BucketName}</span>
        </p>
      </div>

      {snippets.map((snippet) => (
        <Card key={snippet.title}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{snippet.title}</CardTitle>
            <CardDescription>{snippet.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock code={snippet.code} language={snippet.language} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
