// Presentational component for the project creation form dialog
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
import { Badge } from "@/components/ui/badge";
import { projectSchema, type ProjectFormValues, COMMON_MIME_TYPES } from "@/lib/validations";
import { X } from "lucide-react";
import { useState } from "react";
import { AnimatedDialog } from "@/components/animated-dialog";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ProjectFormValues) => Promise<void>;
  loading?: boolean;
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  onSubmit,
  loading,
}: CreateProjectDialogProps) {
  const [selectedMimes, setSelectedMimes] = useState<string[]>([
    "image/jpeg",
    "image/png",
    "application/pdf",
  ]);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      environment: "dev",
      maxFileSizeMB: 10,
      allowedMimeTypes: ["image/jpeg", "image/png", "application/pdf"],
    },
  });

  const toggleMime = (mime: string) => {
    const updated = selectedMimes.includes(mime)
      ? selectedMimes.filter((m) => m !== mime)
      : [...selectedMimes, mime];
    setSelectedMimes(updated);
    setValue("allowedMimeTypes", updated, { shouldValidate: true });
  };

  const handleFormSubmit = async (data: ProjectFormValues) => {
    await onSubmit(data);
    reset();
    setSelectedMimes(["image/jpeg", "image/png", "application/pdf"]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AnimatedDialog open={open}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Set up a new project with file upload defaults.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input id="name" placeholder="my-project" {...register("name")} />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Environment</Label>
              <Select
                defaultValue="dev"
                onValueChange={(v) =>
                  setValue("environment", v as "dev" | "prod", {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dev">Development</SelectItem>
                  <SelectItem value="prod">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxFileSizeMB">Max File Size (MB)</Label>
              <Input
                id="maxFileSizeMB"
                type="number"
                {...register("maxFileSizeMB", { valueAsNumber: true })}
              />
              {errors.maxFileSizeMB && (
                <p className="text-sm text-destructive">
                  {errors.maxFileSizeMB.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Allowed File Types</Label>
              <div className="flex flex-wrap gap-2">
                {COMMON_MIME_TYPES.map((mime) => (
                  <Badge
                    key={mime}
                    variant={selectedMimes.includes(mime) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleMime(mime)}
                  >
                    {mime.split("/")[1]}
                    {selectedMimes.includes(mime) && <X className="ml-1 size-3" />}
                  </Badge>
                ))}
              </div>
              {errors.allowedMimeTypes && (
                <p className="text-sm text-destructive">
                  {errors.allowedMimeTypes.message}
                </p>
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
                {loading ? "Creating..." : "Create Project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </AnimatedDialog>
    </Dialog>
  );
}
