// AWS SDK v3 client configuration, presigned URLs, and resource deletion

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  DeleteBucketCommand,
  CopyObjectCommand,
} from "@aws-sdk/client-s3";
import {
  CloudFrontClient,
  GetDistributionCommand,
  UpdateDistributionCommand,
  DeleteDistributionCommand,
  GetDistributionConfigCommand,
  ListDistributionsCommand,
} from "@aws-sdk/client-cloudfront";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = process.env.AWS_REGION || "us-east-1";

export function getS3Client(region?: string): S3Client {
  return new S3Client({ region: region || REGION });
}

export function getCloudFrontClient(): CloudFrontClient {
  return new CloudFrontClient({ region: "us-east-1" }); // CloudFront is global, but API is in us-east-1
}

export async function generatePresignedUploadUrl(
  bucketName: string,
  objectKey: string,
  contentType: string,
  region?: string
): Promise<string> {
  const client = getS3Client(region);
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: objectKey,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn: 3600 });
}

export async function deleteS3Object(
  bucketName: string,
  objectKey: string,
  region?: string
): Promise<void> {
  const client = getS3Client(region);
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: objectKey,
  });
  await client.send(command);
}

/** Empty a bucket by listing and deleting all objects (incl. versions if any). */
export async function emptyBucket(
  bucketName: string,
  region?: string
): Promise<number> {
  const client = getS3Client(region);
  let totalDeleted = 0;
  let continuationToken: string | undefined;

  do {
    const list = await client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        ContinuationToken: continuationToken,
      })
    );

    const objects = list.Contents;
    if (objects && objects.length > 0) {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: {
            Objects: objects.map((o) => ({ Key: o.Key! })),
            Quiet: true,
          },
        })
      );
      totalDeleted += objects.length;
    }

    continuationToken = list.IsTruncated ? list.NextContinuationToken : undefined;
  } while (continuationToken);

  return totalDeleted;
}

/** Delete an S3 bucket (must be emptied first). */
export async function deleteS3Bucket(
  bucketName: string,
  region?: string
): Promise<void> {
  const client = getS3Client(region);
  await client.send(new DeleteBucketCommand({ Bucket: bucketName }));
}

/**
 * Disable and delete a CloudFront distribution.
 * CloudFront requires the distribution to be disabled before it can be deleted.
 * We disable it and then poll until it reaches Deployed state, then delete.
 */
export async function deleteCloudFrontDistribution(
  distributionId: string
): Promise<void> {
  const client = getCloudFrontClient();

  // 1. Get current config
  const configRes = await client.send(
    new GetDistributionConfigCommand({ Id: distributionId })
  );
  const config = configRes.DistributionConfig!;
  const etag = configRes.ETag!;

  // 2. If already disabled, skip to delete
  if (config.Enabled) {
    config.Enabled = false;
    await client.send(
      new UpdateDistributionCommand({
        Id: distributionId,
        DistributionConfig: config,
        IfMatch: etag,
      })
    );
  }

  // 3. Poll until the distribution is Deployed (not InProgress)
  let deployed = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    const dist = await client.send(
      new GetDistributionCommand({ Id: distributionId })
    );
    if (dist.Distribution?.Status === "Deployed") {
      deployed = true;
      // 4. Delete with latest ETag
      const latestConfig = await client.send(
        new GetDistributionConfigCommand({ Id: distributionId })
      );
      await client.send(
        new DeleteDistributionCommand({
          Id: distributionId,
          IfMatch: latestConfig.ETag!,
        })
      );
      break;
    }
    // Wait 10 seconds between polls
    await new Promise((r) => setTimeout(r, 10000));
  }

  if (!deployed) {
    throw new Error(
      `CloudFront distribution ${distributionId} did not reach Deployed state after 10 minutes`
    );
  }
}

export function buildCloudFrontUrl(
  cloudFrontDomain: string,
  objectKey: string
): string {
  return `https://${cloudFrontDomain}/${objectKey}`;
}

// ── S3 folder & move operations ───────────────────────────────────────────────

/** Create a "folder" in S3 by placing a zero-byte object with a trailing slash. */
export async function createS3Folder(
  bucketName: string,
  folderPath: string,
  region?: string
): Promise<void> {
  const client = getS3Client(region);
  const key = folderPath.endsWith("/") ? folderPath : `${folderPath}/`;
  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: "",
      ContentLength: 0,
    })
  );
}

/** Move (copy + delete) an S3 object between keys within the same bucket. */
export async function moveS3Object(
  bucketName: string,
  sourceKey: string,
  destinationKey: string,
  region?: string
): Promise<void> {
  const client = getS3Client(region);
  // Copy
  await client.send(
    new CopyObjectCommand({
      Bucket: bucketName,
      CopySource: `${bucketName}/${sourceKey}`,
      Key: destinationKey,
    })
  );
  // Delete original
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: sourceKey,
    })
  );
}

// ── List S3 objects in a bucket ───────────────────────────────────────────────

export interface S3Object {
  key: string;
  size: number;
  lastModified: string;
  etag?: string;
  storageClass?: string;
}

/** List all objects in a bucket, handling pagination automatically. */
export async function listS3Objects(
  bucketName: string,
  region?: string,
  prefix?: string
): Promise<S3Object[]> {
  const client = getS3Client(region);
  const objects: S3Object[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        ContinuationToken: continuationToken,
        Prefix: prefix,
      })
    );

    if (response.Contents) {
      for (const obj of response.Contents) {
        if (obj.Key) {
          objects.push({
            key: obj.Key,
            size: obj.Size ?? 0,
            lastModified: obj.LastModified?.toISOString() ?? "",
            etag: obj.ETag,
            storageClass: obj.StorageClass,
          });
        }
      }
    }

    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return objects;
}

// ── List CloudFront distributions ────────────────────────────────────────────

export interface CloudFrontDistributionSummary {
  id: string;
  domainName: string;
  status: string;
  enabled: boolean;
  origins: string[];
  comment: string;
  lastModified: string;
  alternativeDomains: string[];
  priceClass: string;
}

/** List all CloudFront distributions in the account. */
export async function listCloudFrontDistributions(): Promise<
  CloudFrontDistributionSummary[]
> {
  const client = getCloudFrontClient();
  const distributions: CloudFrontDistributionSummary[] = [];
  let marker: string | undefined;

  do {
    const response = await client.send(
      new ListDistributionsCommand({ Marker: marker })
    );

    const items = response.DistributionList?.Items;
    if (items) {
      for (const dist of items) {
        const origins: string[] = [];
        if (dist.Origins?.Items) {
          for (const origin of dist.Origins.Items) {
            if (origin.DomainName) origins.push(origin.DomainName);
          }
        }
        distributions.push({
          id: dist.Id ?? "",
          domainName: dist.DomainName ?? "",
          status: dist.Status ?? "Unknown",
          enabled: dist.Enabled ?? false,
          origins,
          comment: dist.Comment ?? "",
          lastModified: dist.LastModifiedTime?.toISOString() ?? "",
          alternativeDomains: dist.Aliases?.Items ?? [],
          priceClass: dist.PriceClass ?? "PriceClass_All",
        });
      }
    }

    marker = response.DistributionList?.IsTruncated
      ? response.DistributionList.NextMarker
      : undefined;
  } while (marker);

  return distributions;
}

// ── CloudFormation stack status checking ─────────────────────────────────────

import {
  CloudFormationClient,
  DescribeStacksCommand,
  DescribeStackResourcesCommand,
  DeleteStackCommand,
} from "@aws-sdk/client-cloudformation";

export function getCloudFormationClient(region?: string): CloudFormationClient {
  return new CloudFormationClient({ region: region || REGION });
}

export interface StackResource {
  logicalId: string;
  physicalId: string;
  type: string;
  status: string;
  statusReason?: string;
  lastUpdated: string;
}

export interface StackStatus {
  stackName: string;
  stackStatus: string;
  stackStatusReason?: string;
  creationTime: string;
  lastUpdatedTime?: string;
  outputs: Record<string, string>;
  resources: StackResource[];
}

/** Check CloudFormation stack status for a bucket. */
export async function describeStack(
  s3BucketName: string,
  region?: string
): Promise<StackStatus | null> {
  const client = getCloudFormationClient(region);
  const stackName = `SCR-${s3BucketName}`;

  try {
    const response = await client.send(
      new DescribeStacksCommand({ StackName: stackName })
    );
    const stack = response.Stacks?.[0];
    if (!stack) return null;

    const outputs: Record<string, string> = {};
    for (const o of stack.Outputs ?? []) {
      if (o.OutputKey && o.OutputValue) {
        outputs[o.OutputKey] = o.OutputValue;
      }
    }

    // Get resources
    const resourcesRes = await client.send(
      new DescribeStackResourcesCommand({ StackName: stackName })
    );
    const resources: StackResource[] = (resourcesRes.StackResources ?? []).map(
      (r) => ({
        logicalId: r.LogicalResourceId ?? "",
        physicalId: r.PhysicalResourceId ?? "",
        type: r.ResourceType ?? "",
        status: r.ResourceStatus ?? "",
        statusReason: r.ResourceStatusReason,
        lastUpdated: r.Timestamp?.toISOString() ?? "",
      })
    );

    return {
      stackName,
      stackStatus: stack.StackStatus ?? "UNKNOWN",
      stackStatusReason: stack.StackStatusReason,
      creationTime: stack.CreationTime?.toISOString() ?? "",
      lastUpdatedTime: stack.LastUpdatedTime?.toISOString(),
      outputs,
      resources,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("does not exist")) return null;
    throw e;
  }
}

/** Delete a CloudFormation stack (rollback). */
export async function deleteStack(
  s3BucketName: string,
  region?: string
): Promise<void> {
  const client = getCloudFormationClient(region);
  const stackName = `SCR-${s3BucketName}`;
  await client.send(new DeleteStackCommand({ StackName: stackName }));
}

// ── S3 bucket size metrics ───────────────────────────────────────────────────

import {
  HeadBucketCommand,
} from "@aws-sdk/client-s3";

/** Check if an S3 bucket exists and is accessible. */
export async function checkBucketExists(
  bucketName: string,
  region?: string
): Promise<boolean> {
  try {
    const client = getS3Client(region);
    await client.send(new HeadBucketCommand({ Bucket: bucketName }));
    return true;
  } catch {
    return false;
  }
}

// ── Cost estimation helpers ──────────────────────────────────────────────────

// AWS pricing (us-east-1 standard tier, approximate)
const S3_STORAGE_PER_GB_MONTH = 0.023;
const S3_PUT_PER_1K = 0.005;
const S3_GET_PER_1K = 0.0004;
const S3_DELETE_PER_1K = 0.0;
const S3_LIST_PER_1K = 0.005;
const CF_PER_GB_TRANSFER = 0.085;      // first 10 TB
const CF_HTTP_PER_10K = 0.0075;        // HTTP requests
const CF_HTTPS_PER_10K = 0.01;         // HTTPS requests
const S3_DATA_TRANSFER_PER_GB = 0.09;  // S3 to internet first 10 TB

/**
 * Very rough monthly cost estimate based on storage bytes and request counts.
 */
export function estimateMonthlyCost(
  storageByes: number,
  writeRequests: number,
  readRequests: number
): number {
  const storageGB = storageByes / (1024 ** 3);
  const storage = storageGB * S3_STORAGE_PER_GB_MONTH;
  const puts = (writeRequests / 1000) * S3_PUT_PER_1K;
  const gets = (readRequests / 1000) * S3_GET_PER_1K;
  const cfTransfer = storageGB * 0.1 * CF_PER_GB_TRANSFER; // assume 10% egress
  return Math.round((storage + puts + gets + cfTransfer) * 100) / 100;
}

/** Detailed cost breakdown for a single bucket. */
export interface CostBreakdown {
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

export function calculateCostBreakdown(
  storageByes: number,
  writeRequests: number,
  readRequests: number,
  deleteRequests: number,
  listRequests: number,
  dataTransferBytes: number
): CostBreakdown {
  const storageGB = storageByes / (1024 ** 3);
  const transferGB = dataTransferBytes / (1024 ** 3);

  const s3Storage = storageGB * S3_STORAGE_PER_GB_MONTH;
  const s3PutRequests = (writeRequests / 1000) * S3_PUT_PER_1K;
  const s3GetRequests = (readRequests / 1000) * S3_GET_PER_1K;
  const s3DeleteRequests = (deleteRequests / 1000) * S3_DELETE_PER_1K;
  const s3ListRequests = (listRequests / 1000) * S3_LIST_PER_1K;
  const s3DataTransfer = transferGB * S3_DATA_TRANSFER_PER_GB;
  const cfDataTransfer = transferGB * 0.3 * CF_PER_GB_TRANSFER; // ~30% via CloudFront
  const cfRequests = ((readRequests + writeRequests) / 10000) * CF_HTTPS_PER_10K;

  const total =
    s3Storage +
    s3PutRequests +
    s3GetRequests +
    s3DeleteRequests +
    s3ListRequests +
    s3DataTransfer +
    cfDataTransfer +
    cfRequests;

  return {
    s3Storage: round4(s3Storage),
    s3PutRequests: round4(s3PutRequests),
    s3GetRequests: round4(s3GetRequests),
    s3DeleteRequests: round4(s3DeleteRequests),
    s3ListRequests: round4(s3ListRequests),
    s3DataTransfer: round4(s3DataTransfer),
    cfDataTransfer: round4(cfDataTransfer),
    cfRequests: round4(cfRequests),
    total: round4(total),
  };
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
