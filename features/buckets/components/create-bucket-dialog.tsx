// Presentational dialog for creating a new S3 bucket
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
    reset,
    formState: { errors },
  } = useForm<BucketFormValues>({
    resolver: zodResolver(bucketSchema),
    defaultValues: {
      projectId: "",
      name: "",
      region: "us-east-1",
    },
  });

  const handleFormSubmit = async (data: BucketFormValues) => {
    await onSubmit(data);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AnimatedDialog open={open}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Bucket</DialogTitle>
            <DialogDescription>
              Provision an S3 bucket with CloudFront distribution.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
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
