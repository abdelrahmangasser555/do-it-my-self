// Infrastructure page for CDK synth/deploy and deployment status
"use client";

import { toast } from "sonner";
import { Rocket, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageTransition } from "@/components/page-transition";
import { BucketsTable } from "@/features/buckets/components/buckets-table";
import { useBuckets, useDeleteBucket } from "@/features/buckets/hooks/use-buckets";
import { useDeployBucket } from "@/features/infrastructure/hooks/use-deploy-bucket";
import type { Bucket } from "@/lib/types";

export default function InfrastructurePage() {
  const { buckets, loading, refetch } = useBuckets();
  const { deleteBucket } = useDeleteBucket();
  const { deploy, synth, loading: deploying, output, error } = useDeployBucket();

  const handleSynth = async () => {
    toast.info("Running CDK synth...");
    const result = await synth();
    if (result.success) {
      toast.success("CDK synth complete");
    } else {
      toast.error(`Synth failed: ${result.error}`);
    }
  };

  const handleDeploy = async (bucket: Bucket) => {
    toast.info(`Deploying ${bucket.name}...`);
    const result = await deploy(bucket.id, bucket.s3BucketName, bucket.region);
    if (result.success) {
      toast.success("Deployment complete!");
      refetch();
    } else {
      toast.error(`Deployment failed: ${result.error}`);
    }
  };

  const handleDelete = async (id: string) => {
    const success = await deleteBucket(id);
    if (success) {
      toast.success("Bucket deleted");
      refetch();
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Infrastructure
            </h1>
            <p className="text-muted-foreground">
              Deploy and manage AWS resources via CDK.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSynth} disabled={deploying}>
              <RefreshCw className="mr-2 size-4" />
              CDK Synth
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Deployable Buckets</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            ) : (
              <BucketsTable
                buckets={buckets}
                onDelete={handleDelete}
                onDeploy={handleDeploy}
              />
            )}
          </CardContent>
        </Card>

        {(output || error) && (
          <Card>
            <CardHeader>
              <CardTitle>Command Output</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-64 rounded-md border bg-muted/50 p-4">
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {error ? (
                    <span className="text-destructive">{error}</span>
                  ) : (
                    output
                  )}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </PageTransition>
  );
}
