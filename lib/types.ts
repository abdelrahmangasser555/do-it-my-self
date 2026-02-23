// Shared TypeScript types for the entire application

export interface Project {
  id: string;
  name: string;
  environment: "dev" | "prod";
  maxFileSizeMB: number;
  allowedMimeTypes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Bucket {
  id: string;
  projectId: string;
  name: string;
  s3BucketName: string;
  s3BucketArn: string;
  cloudFrontDomain: string;
  cloudFrontDistributionId: string;
  region: string;
  status: "pending" | "deploying" | "active" | "failed";
  createdAt: string;
  updatedAt: string;
}

export interface FileRecord {
  id: string;
  projectId: string;
  bucketName: string;
  objectKey: string;
  cloudFrontUrl: string;
  size: number;
  mimeType: string;
  linkedModel: string;
  linkedModelId: string;
  createdAt: string;
}

export interface ProjectFormData {
  name: string;
  environment: "dev" | "prod";
  maxFileSizeMB: number;
  allowedMimeTypes: string[];
}

export interface BucketFormData {
  projectId: string;
  name: string;
  region: string;
}

export interface UploadRequest {
  projectId: string;
  bucketName: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  linkedModel?: string;
  linkedModelId?: string;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  objectKey: string;
  cloudFrontUrl: string;
}

export interface AnalyticsSummary {
  totalProjects: number;
  totalBuckets: number;
  totalFiles: number;
  totalStorageBytes: number;
}

export interface BucketAnalytics {
  bucketName: string;
  fileCount: number;
  totalSizeBytes: number;
  orphanedFiles: number;
}
