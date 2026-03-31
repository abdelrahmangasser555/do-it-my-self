// CDK app entry point - creates S3 + CloudFront stack
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { StorageBucketStack } from '../lib/storage-bucket-stack';

const app = new cdk.App();

const bucketName = process.env.SCR_BUCKET_NAME || 'scr-default-bucket';
const region = process.env.SCR_REGION || 'eu-north-1';
const account = process.env.SCR_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT;

// Parse advanced config from environment variables
const parseBool = (v: string | undefined, def = false) => (v === undefined ? def : v === 'true');
const parseNum = (v: string | undefined, def?: number) => (v === undefined ? def : parseInt(v, 10));
const parseArr = (v: string | undefined, def: string[]) =>
  v ? v.split(',').map((s) => s.trim()) : def;

new StorageBucketStack(app, `SCR-${bucketName}`, {
  env: { region, account },
  bucketName,
  access: (process.env.SCR_ACCESS as 'private' | 'public') || 'private',
  versioning: parseBool(process.env.SCR_VERSIONING),
  enableCDN: parseBool(process.env.SCR_ENABLE_CDN, true),
  encryptionType: (process.env.SCR_ENCRYPTION_TYPE as 'S3' | 'KMS' | 'none') || 'S3',
  kmsKeyId: process.env.SCR_KMS_KEY_ID,
  enableAccessLogs: parseBool(process.env.SCR_ENABLE_ACCESS_LOGS),
  autoDelete: parseBool(process.env.SCR_AUTO_DELETE),
  autoDeleteDays: parseNum(process.env.SCR_AUTO_DELETE_DAYS),
  lifecycleTransitionDays: parseNum(process.env.SCR_LIFECYCLE_TRANSITION_DAYS),
  lifecycleDeleteIncompleteUploads: parseBool(process.env.SCR_LIFECYCLE_DELETE_INCOMPLETE),
  corsOrigins: parseArr(process.env.SCR_CORS_ORIGINS, ['*']),
  corsMethods: parseArr(process.env.SCR_CORS_METHODS, ['GET', 'PUT', 'POST']),
  cacheControl: process.env.SCR_CACHE_CONTROL || 'public, max-age=31536000',
});
