// Setup & Integration tab — syntax-highlighted framework-aware code snippets
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/code-block";
import { Code2, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Bucket } from "@/lib/types";
import {
  generateEnvSnippet,
  generateNextjsUploadApi,
  generateNodeExpressUploadApi,
  generatePythonUploadApi,
  generateJavaUploadApi,
  generateFrontendUploadSnippet,
  generateDeleteSnippet,
} from "@/features/infrastructure/utils/snippet-generator";

interface SetupTabProps {
  bucket: Bucket;
}

export function SetupTab({ bucket }: SetupTabProps) {
  const maxMB = bucket.config?.maxFileSizeMB ?? 100;

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

      {/* Context chips */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="font-mono text-xs">
          {bucket.region}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {bucket.config?.encryption?.toUpperCase() || "S3"} Encryption
        </Badge>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-xs gap-1 cursor-help">
                Max {maxMB} MB
                <Info className="size-3" />
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs max-w-[200px]">
                Bucket-level limit ({maxMB} MB) is authoritative. Project-level limit
                is the default fallback. The lower of the two is enforced.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {bucket.config?.versioning && (
          <Badge variant="outline" className="text-xs">Versioning ON</Badge>
        )}
      </div>

      {/* Env */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Environment Variables</CardTitle>
          <CardDescription>
            Add to your <code className="text-xs">.env.local</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CodeBlock
            title=".env.local"
            language="bash"
            code={generateEnvSnippet(bucket)}
          />
        </CardContent>
      </Card>

      {/* Upload API — Framework Tabs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Upload API Endpoint</CardTitle>
          <CardDescription>
            Server-side presigned URL generation — pick your framework
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="nextjs">
            <TabsList className="grid w-full max-w-md grid-cols-4">
              <TabsTrigger value="nextjs">Next.js</TabsTrigger>
              <TabsTrigger value="node">Node.js</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
              <TabsTrigger value="java">Java</TabsTrigger>
            </TabsList>
            <TabsContent value="nextjs">
              <CodeBlock
                title="app/api/upload/route.ts"
                language="typescript"
                code={generateNextjsUploadApi(bucket)}
                collapsible
              />
            </TabsContent>
            <TabsContent value="node">
              <CodeBlock
                title="routes/upload.js"
                language="javascript"
                code={generateNodeExpressUploadApi(bucket)}
                collapsible
              />
            </TabsContent>
            <TabsContent value="python">
              <CodeBlock
                title="upload.py"
                language="python"
                code={generatePythonUploadApi(bucket)}
                collapsible
              />
            </TabsContent>
            <TabsContent value="java">
              <CodeBlock
                title="UploadController.java"
                language="java"
                code={generateJavaUploadApi(bucket)}
                collapsible
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Frontend Component */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Frontend Upload Component</CardTitle>
          <CardDescription>
            Drag & drop upload with progress tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CodeBlock
            title="components/file-upload.tsx"
            language="typescript"
            code={generateFrontendUploadSnippet(bucket)}
            collapsible
          />
        </CardContent>
      </Card>

      {/* Delete */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Delete API Route</CardTitle>
          <CardDescription>
            Remove objects from S3
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CodeBlock
            title="app/api/delete-file/route.ts"
            language="typescript"
            code={generateDeleteSnippet(bucket)}
            collapsible
            defaultCollapsed
          />
        </CardContent>
      </Card>
    </div>
  );
}
