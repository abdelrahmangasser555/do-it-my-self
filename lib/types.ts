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

export interface BucketConfig {
  versioning: boolean;
  encryption: "s3" | "kms" | "none";
  backupEnabled: boolean;
  maxFileSizeMB: number;
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
  status: "pending" | "deploying" | "active" | "failed" | "deleting";
  config: BucketConfig;
  createdAt: string;
  updatedAt: string;
}

export interface DeletionStep {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
  error?: string;
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
  estimatedMonthlyCost: number;
  projectedMonthlyCost: number;
}

export interface BucketAnalytics {
  bucketId: string;
  bucketName: string;
  displayName: string;
  region: string;
  fileCount: number;
  totalSizeBytes: number;
  orphanedFiles: number;
  estimatedMonthlyCost: number;
  readRequests: number;
  writeRequests: number;
}

// ── Cost & Expense types ─────────────────────────────────────────────────────

export interface CostBreakdownData {
  s3Storage: number;
  s3PutRequests: number;
  s3GetRequests: number;
  s3DeleteRequests: number;
  s3ListRequests: number;
  s3DataTransfer: number;
  cfDataTransfer: number;
  cfRequests: number;
  total: number;
}

export interface BucketExpense {
  bucketId: string;
  bucketName: string;
  displayName: string;
  region: string;
  status: string;
  fileCount: number;
  totalSizeBytes: number;
  readRequests: number;
  writeRequests: number;
  deleteRequests: number;
  listRequests: number;
  dataTransferBytes: number;
  costBreakdown: CostBreakdownData;
}

export interface ProjectExpense {
  projectId: string;
  projectName: string;
  environment: string;
  bucketCount: number;
  totalFiles: number;
  totalSizeBytes: number;
  totalReadRequests: number;
  totalWriteRequests: number;
  totalDeleteRequests: number;
  totalListRequests: number;
  totalDataTransferBytes: number;
  costBreakdown: CostBreakdownData;
  buckets: BucketExpense[];
}

export interface OverallCostSummary {
  totalMonthlyCost: number;
  projectedMonthlyCost: number;
  s3StorageCost: number;
  s3RequestsCost: number;
  s3DataTransferCost: number;
  cfDataTransferCost: number;
  cfRequestsCost: number;
  totalStorageBytes: number;
  totalFiles: number;
  totalBuckets: number;
  totalProjects: number;
  costByProject: { name: string; cost: number }[];
  costByService: { service: string; cost: number }[];
}

// ── AWS Sync types ───────────────────────────────────────────────────────────

export interface StackResourceInfo {
  logicalId: string;
  physicalId: string;
  type: string;
  status: string;
  statusReason?: string;
  lastUpdated: string;
}

export interface BucketSyncStatus {
  bucketId: string;
  bucketName: string;
  s3BucketName: string;
  localStatus: Bucket["status"];
  stackExists: boolean;
  stackStatus?: string;
  stackStatusReason?: string;
  s3BucketExists: boolean;
  cloudFrontDomain?: string;
  cloudFrontDistributionId?: string;
  resources: StackResourceInfo[];
  needsSync: boolean;
  recommendedAction?: "update-to-active" | "update-to-failed" | "update-to-pending" | "cleanup";
}
