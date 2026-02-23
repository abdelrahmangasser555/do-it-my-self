// Presentational dialog for creating a new S3 bucket with config options
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { bucketSchema, type BucketFormValues, AWS_REGIONS } from "@/lib/validations";
import type { Project } from "@/lib/types";
import { AnimatedDialog } from "@/components/animated-dialog";

interface CreateBucketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: BucketFormValues) => Promise<void>;
  projects: Project[];
  loading?: boolean;
}

export function CreateBucketDialog({
  open,
  onOpenChange,
  onSubmit,
  projects,
  loading,
}: CreateBucketDialogProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<BucketFormValues>({
    resolver: zodResolver(bucketSchema),
    defaultValues: {
      projectId: "",
      name: "",
      region: "us-east-1",
      versioning: false,
      encryption: "s3",
      backupEnabled: false,
      maxFileSizeMB: 100,
    },
  });

  const versioning = watch("versioning");
  const backupEnabled = watch("backupEnabled");

  const handleFormSubmit = async (data: BucketFormValues) => {
    await onSubmit(data);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AnimatedDialog open={open}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>Create New Bucket</DialogTitle>
            <DialogDescription>
              Provision an S3 bucket with CloudFront distribution.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            {/* Project */}
            <div className="space-y-2">
              <Label>Project</Label>
              <Select
                onValueChange={(v) =>
                  setValue("projectId", v, { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.projectId && (
                <p className="text-sm text-destructive">{errors.projectId.message}</p>
              )}
            </div>

            {/* Bucket name */}
            <div className="space-y-2">
              <Label htmlFor="bucketName">Bucket Name</Label>
              <Input
                id="bucketName"
                placeholder="my-assets"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Region */}
            <div className="space-y-2">
              <Label>AWS Region</Label>
              <Select
                defaultValue="us-east-1"
                onValueChange={(v) =>
                  setValue("region", v, { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AWS_REGIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.region && (
                <p className="text-sm text-destructive">{errors.region.message}</p>
              )}
            </div>

            <Separator />

            {/* Bucket Configuration Section */}
            <div className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground">
                Bucket Configuration
              </p>

              {/* Versioning */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="versioning">Versioning</Label>
                  <p className="text-xs text-muted-foreground">
                    Keep multiple versions of objects
                  </p>
                </div>
                <Switch
                  id="versioning"
                  checked={versioning}
                  onCheckedChange={(v) => setValue("versioning", v)}
                />
              </div>

              {/* Encryption */}
              <div className="space-y-2">
                <Label>Encryption</Label>
                <Select
                  defaultValue="s3"
                  onValueChange={(v) =>
                    setValue("encryption", v as "s3" | "kms" | "none", {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="s3">S3-Managed (SSE-S3)</SelectItem>
                    <SelectItem value="kms">KMS-Managed (SSE-KMS)</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Backup */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="backup">Backup Replication</Label>
                  <p className="text-xs text-muted-foreground">
                    Cross-region replication for disaster recovery
                  </p>
                </div>
                <Switch
                  id="backup"
                  checked={backupEnabled}
                  onCheckedChange={(v) => setValue("backupEnabled", v)}
                />
              </div>

              {/* Max File Size */}
              <div className="space-y-2">
                <Label htmlFor="maxFileSizeMB">Max File Size (MB)</Label>
                <Input
                  id="maxFileSizeMB"
                  type="number"
                  min={1}
                  max={5000}
                  {...register("maxFileSizeMB", { valueAsNumber: true })}
                />
                {errors.maxFileSizeMB && (
                  <p className="text-sm text-destructive">
                    {errors.maxFileSizeMB.message}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Bucket"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </AnimatedDialog>
    </Dialog>
  );
}
