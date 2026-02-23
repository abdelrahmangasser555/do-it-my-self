// Code snippets page - generates integration code for each bucket
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageTransition } from "@/components/page-transition";
import { CodeSnippets } from "@/features/infrastructure/components/code-snippets";
import { useBuckets } from "@/features/buckets/hooks/use-buckets";
import { useState } from "react";
import { Code2 } from "lucide-react";

export default function SnippetsPage() {
  const { buckets, loading } = useBuckets();
  const [selectedBucketId, setSelectedBucketId] = useState<string>("");
  const selectedBucket = buckets.find((b) => b.id === selectedBucketId);

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Code Snippets</h1>
          <p className="text-muted-foreground">
            Copy-paste ready integration code for your buckets.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select a Bucket</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading buckets...</p>
            ) : buckets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Code2 className="mb-3 size-10" />
                <p className="text-sm">
                  No buckets available. Create one first.
                </p>
              </div>
            ) : (
              <Select
                value={selectedBucketId}
                onValueChange={setSelectedBucketId}
              >
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Choose a bucket..." />
                </SelectTrigger>
                <SelectContent>
                  {buckets.map((bucket) => (
                    <SelectItem key={bucket.id} value={bucket.id}>
                      {bucket.name} ({bucket.s3BucketName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {selectedBucket && (
          <Card>
            <CardHeader>
              <CardTitle>
                Integration Snippets for {selectedBucket.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CodeSnippets bucket={selectedBucket} />
            </CardContent>
          </Card>
        )}
      </div>
    </PageTransition>
  );
}
