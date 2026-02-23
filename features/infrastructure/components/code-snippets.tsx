// Presentational component for displaying code snippets per bucket
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeBlock } from "@/components/code-block";
import type { Bucket } from "@/lib/types";
import {
  generateEnvSnippet,
  generateUploadApiSnippet,
  generateFrontendUploadSnippet,
  generateDeleteSnippet,
} from "@/features/infrastructure/utils/snippet-generator";

interface CodeSnippetsProps {
  bucket: Bucket;
}

export function CodeSnippets({ bucket }: CodeSnippetsProps) {
  return (
    <Tabs defaultValue="env" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="env">Environment</TabsTrigger>
        <TabsTrigger value="api">Upload API</TabsTrigger>
        <TabsTrigger value="frontend">Frontend</TabsTrigger>
        <TabsTrigger value="delete">Delete</TabsTrigger>
      </TabsList>
      <TabsContent value="env">
        <CodeBlock
          title=".env.local"
          language="bash"
          code={generateEnvSnippet(bucket)}
        />
      </TabsContent>
      <TabsContent value="api">
        <CodeBlock
          title="Upload API Route"
          language="typescript"
          code={generateUploadApiSnippet(bucket)}
        />
      </TabsContent>
      <TabsContent value="frontend">
        <CodeBlock
          title="Frontend Upload Component"
          language="typescript"
          code={generateFrontendUploadSnippet(bucket)}
        />
      </TabsContent>
      <TabsContent value="delete">
        <CodeBlock
          title="Delete API Route"
          language="typescript"
          code={generateDeleteSnippet(bucket)}
        />
      </TabsContent>
    </Tabs>
  );
}
