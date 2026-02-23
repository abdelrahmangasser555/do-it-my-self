// Zod schemas for form validation across the application

import { z } from "zod";

export const projectSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be under 50 characters")
    .regex(/^[a-zA-Z0-9-_ ]+$/, "Only letters, numbers, hyphens, underscores, and spaces"),
  environment: z.enum(["dev", "prod"]),
  maxFileSizeMB: z
    .number()
    .min(1, "Minimum 1 MB")
    .max(500, "Maximum 500 MB"),
  allowedMimeTypes: z
    .array(z.string())
    .min(1, "At least one MIME type required"),
});

export const bucketSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(63, "Name must be under 63 characters")
    .regex(
      /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
      "Lowercase letters, numbers, and hyphens only. Must start and end with letter or number."
    ),
  region: z.string().min(1, "Region is required"),
  versioning: z.boolean(),
  encryption: z.enum(["s3", "kms", "none"]),
  backupEnabled: z.boolean(),
  maxFileSizeMB: z.number().min(1).max(5000),
});

export const uploadSchema = z.object({
  projectId: z.string().min(1),
  bucketName: z.string().min(1),
  fileName: z.string().min(1),
  fileSize: z.number().positive(),
  mimeType: z.string().min(1),
  linkedModel: z.string().optional(),
  linkedModelId: z.string().optional(),
});

export type ProjectFormValues = z.infer<typeof projectSchema>;
export type BucketFormValues = z.infer<typeof bucketSchema>;
export type UploadFormValues = z.infer<typeof uploadSchema>;

export const AWS_REGIONS = [
  { value: "us-east-1", label: "US East (N. Virginia)" },
  { value: "us-east-2", label: "US East (Ohio)" },
  { value: "us-west-1", label: "US West (N. California)" },
  { value: "us-west-2", label: "US West (Oregon)" },
  { value: "eu-west-1", label: "EU (Ireland)" },
  { value: "eu-west-2", label: "EU (London)" },
  { value: "eu-central-1", label: "EU (Frankfurt)" },
  { value: "ap-southeast-1", label: "Asia Pacific (Singapore)" },
  { value: "ap-northeast-1", label: "Asia Pacific (Tokyo)" },
  { value: "ap-southeast-2", label: "Asia Pacific (Sydney)" },
    { value: "ap-northeast-2", label: "Asia Pacific (Seoul)" },
  { value: "sa-east-1", label: "South America (São Paulo)" },
  {value  : "eu-north-1", label: "EU (Stockholm)" },
] as const;

export const COMMON_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "video/mp4",
  "audio/mpeg",
  "application/json",
  "text/plain",
  "text/csv",
  "application/zip",
] as const;
