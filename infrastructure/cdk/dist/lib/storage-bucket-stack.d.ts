import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
export interface StorageBucketStackProps extends cdk.StackProps {
    bucketName: string;
    access?: 'private' | 'public';
    maxFileSizeMB?: number;
    allowedFileTypes?: 'images' | 'videos' | 'documents' | 'any';
    autoDelete?: boolean;
    autoDeleteDays?: number;
    corsOrigins?: string[];
    corsMethods?: string[];
    versioning?: boolean;
    lifecycleTransitionDays?: number;
    lifecycleDeleteIncompleteUploads?: boolean;
    enableCDN?: boolean;
    cacheControl?: string;
    encryptionType?: 'S3' | 'KMS' | 'none';
    kmsKeyId?: string;
    enableAccessLogs?: boolean;
}
export declare class StorageBucketStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: StorageBucketStackProps);
}
