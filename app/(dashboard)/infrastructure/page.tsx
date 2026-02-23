// Infrastructure page for CDK synth/deploy with streaming terminal output
"use client";

import { toast } from "sonner";
import { Rocket, RefreshCw, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageTransition } from "@/components/page-transition";
import { BucketsTable } from "@/features/buckets/components/buckets-table";
import { useBuckets, useDeleteBucket } from "@/features/buckets/hooks/use-buckets";
import { useDeployBucket } from "@/features/infrastructure/hooks/use-deploy-bucket";
import { useTerminal } from "@/lib/terminal-context";
import type { Bucket } from "@/lib/types";

export default function InfrastructurePage() {
  const { buckets, loading, refetch } = useBuckets();
  const { deleteBucket } = useDeleteBucket();
  const { deploy, synth, loading: deploying } = useDeployBucket();
  const terminal = useTerminal();

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
              Deploy and manage AWS resources via CDK. Output streams to the terminal below.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => terminal.setIsOpen(true)}
            >
              <Terminal className="mr-2 size-4" />
              Terminal
            </Button>
            <Button variant="outline" onClick={handleSynth} disabled={deploying}>
              <RefreshCw className="mr-2 size-4" />
              CDK Synth
            </Button>
          </div>
        </div>

        {/* Deployment guide card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Rocket className="size-4" />
              Deployment Guide
            </CardTitle>
            <CardDescription>
              The deploy process runs pre-checks, streams CDK output to the
              terminal, and provides error intelligence with suggested fixes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">Pre-flight checks</Badge>
              <Badge variant="outline">Streaming logs</Badge>
              <Badge variant="outline">Error intelligence</Badge>
              <Badge variant="outline">Auto-status update</Badge>
            </div>
          </CardContent>
        </Card>

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
      </div>
    </PageTransition>
  );
}
