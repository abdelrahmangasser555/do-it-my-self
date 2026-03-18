// Zod schemas for form validation across the application

import { z } from "zod";

export const projectSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be under 50 characters")
    .regex(
      /^[a-zA-Z0-9-_ ]+$/,
      "Only letters, numbers, hyphens, underscores, and spaces",
    ),
  environment: z.enum(["dev", "prod"]),
  maxFileSizeMB: z.number().min(1, "Minimum 1 MB").max(500, "Maximum 500 MB"),
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
      "Lowercase letters, numbers, and hyphens only. Must start and end with letter or number.",
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
  // North America
  { value: "us-east-1", label: "US East (N. Virginia)" },
  { value: "us-east-2", label: "US East (Ohio)" },
  { value: "us-west-1", label: "US West (N. California)" },
  { value: "us-west-2", label: "US West (Oregon)" },
  { value: "ca-central-1", label: "Canada (Central)" },
  { value: "ca-west-1", label: "Canada West (Calgary)" },
  // Europe
  { value: "eu-west-1", label: "EU (Ireland)" },
  { value: "eu-west-2", label: "EU (London)" },
  { value: "eu-west-3", label: "EU (Paris)" },
  { value: "eu-central-1", label: "EU (Frankfurt)" },
  { value: "eu-central-2", label: "EU (Zurich)" },
  { value: "eu-north-1", label: "EU (Stockholm)" },
  { value: "eu-south-1", label: "EU (Milan)" },
  { value: "eu-south-2", label: "EU (Spain)" },
  // Asia Pacific
  { value: "ap-southeast-1", label: "Asia Pacific (Singapore)" },
  { value: "ap-southeast-2", label: "Asia Pacific (Sydney)" },
  { value: "ap-southeast-3", label: "Asia Pacific (Jakarta)" },
  { value: "ap-southeast-4", label: "Asia Pacific (Melbourne)" },
  { value: "ap-northeast-1", label: "Asia Pacific (Tokyo)" },
  { value: "ap-northeast-2", label: "Asia Pacific (Seoul)" },
  { value: "ap-northeast-3", label: "Asia Pacific (Osaka)" },
  { value: "ap-south-1", label: "Asia Pacific (Mumbai)" },
  { value: "ap-south-2", label: "Asia Pacific (Hyderabad)" },
  { value: "ap-east-1", label: "Asia Pacific (Hong Kong)" },
  // South America
  { value: "sa-east-1", label: "South America (São Paulo)" },
  // Middle East & Africa
  { value: "me-south-1", label: "Middle East (Bahrain)" },
  { value: "me-central-1", label: "Middle East (UAE)" },
  { value: "af-south-1", label: "Africa (Cape Town)" },
  { value: "il-central-1", label: "Israel (Tel Aviv)" },
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
