// Framework-aware code snippet display with syntax-highlighted tabs
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/code-block";
import type { Bucket } from "@/lib/types";
import {
  generateEnvSnippet,
  generateNextjsUploadApi,
  generateNodeExpressUploadApi,
  generatePythonUploadApi,
  generateJavaUploadApi,
  generateFrontendUploadSnippet,
  generateDeleteSnippet,
  generateLinkedUploadSnippet,
  generateOrphanExplanationText,
} from "@/features/infrastructure/utils/snippet-generator";

interface CodeSnippetsProps {
  bucket: Bucket;
}

export function CodeSnippets({ bucket }: CodeSnippetsProps) {
  const maxMB = bucket.config?.maxFileSizeMB ?? 100;

  return (
    <div className="space-y-6">
      {/* Bucket context chips */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="font-mono text-xs">
          {bucket.s3BucketName}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {bucket.region}
        </Badge>
        <Badge variant="outline" className="text-xs">
          Max {maxMB} MB
        </Badge>
        {bucket.config?.encryption !== "none" && (
          <Badge variant="outline" className="text-xs">
            {bucket.config?.encryption?.toUpperCase()} Encryption
          </Badge>
        )}
      </div>

      {/* Environment Variables */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Environment Variables</CardTitle>
          <CardDescription>
            Add these to your <code className="text-xs">.env.local</code> file
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
            Server-side presigned URL generation — choose your framework
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

      {/* Frontend Upload Component */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Frontend Upload Component</CardTitle>
          <CardDescription>
            Client-side React component with drag & drop and progress
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

      {/* Linked vs Orphan Files */}
      <Card className="border-amber-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Linked vs Orphan Files</CardTitle>
          <CardDescription>
            How file linking works — prevent orphan files by associating uploads with application records
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-muted/50 p-4 text-sm text-muted-foreground space-y-2">
            <p><strong>Linked File:</strong> Uploaded with <code className="text-xs">linkedModel</code> + <code className="text-xs">linkedModelId</code> — tied to a specific application record.</p>
            <p><strong>Orphan File:</strong> Uploaded without linking metadata — exists in S3 but not associated with anything.</p>
            <p className="text-xs">Orphan files still cost money and are harder to clean up. Always link files when possible.</p>
          </div>
          <CodeBlock
            title="Linked Upload Example"
            language="typescript"
            code={generateLinkedUploadSnippet(bucket)}
            collapsible
          />
        </CardContent>
      </Card>

      {/* Delete API */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Delete API Route</CardTitle>
          <CardDescription>
            Remove objects from S3 via your API
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
