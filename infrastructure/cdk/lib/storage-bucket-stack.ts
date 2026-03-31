// CDK Stack - provisions S3 bucket with optional CloudFront distribution and IAM policy
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';

export interface StorageBucketStackProps extends cdk.StackProps {
  bucketName: string;

  // Default settings
  access?: 'private' | 'public';
  maxFileSizeMB?: number;
  allowedFileTypes?: 'images' | 'videos' | 'documents' | 'any';
  autoDelete?: boolean;
  autoDeleteDays?: number;

  // Advanced - Security
  corsOrigins?: string[];
  corsMethods?: string[];

  // Advanced - Storage
  versioning?: boolean;
  lifecycleTransitionDays?: number;
  lifecycleDeleteIncompleteUploads?: boolean;

  // Advanced - Performance
  enableCDN?: boolean;
  cacheControl?: string;

  // Advanced - Encryption
  encryptionType?: 'S3' | 'KMS' | 'none';
  kmsKeyId?: string;

  // Advanced - Monitoring
  enableAccessLogs?: boolean;
}

/** Map allowedFileTypes to CORS-friendly extension lists (informational, enforced at upload layer) */
function getAllowedMethodsFromConfig(methods: string[]): s3.HttpMethods[] {
  const map: Record<string, s3.HttpMethods> = {
    GET: s3.HttpMethods.GET,
    PUT: s3.HttpMethods.PUT,
    POST: s3.HttpMethods.POST,
    DELETE: s3.HttpMethods.DELETE,
    HEAD: s3.HttpMethods.HEAD,
  };
  return methods.map((m) => map[m]).filter(Boolean);
}

export class StorageBucketStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: StorageBucketStackProps) {
    super(scope, id, props);

    const {
      bucketName,
      access = 'private',
      versioning = false,
      encryptionType = 'S3',
      kmsKeyId,
      enableCDN = true,
      enableAccessLogs = false,
      autoDelete = false,
      autoDeleteDays,
      lifecycleTransitionDays,
      lifecycleDeleteIncompleteUploads = false,
      corsOrigins = ['*'],
      corsMethods = ['GET', 'PUT', 'POST'],
      cacheControl = 'public, max-age=31536000',
    } = props;

    // ── Encryption ────────────────────────────────────────────────────────────
    let bucketEncryption = s3.BucketEncryption.S3_MANAGED;
    let encryptionKey: kms.IKey | undefined;

    if (encryptionType === 'KMS') {
      if (kmsKeyId) {
        encryptionKey = kms.Key.fromKeyArn(this, 'ProvidedKey', kmsKeyId);
      } else {
        encryptionKey = new kms.Key(this, 'BucketKey', {
          description: `KMS key for ${bucketName}`,
          enableKeyRotation: true,
          removalPolicy: cdk.RemovalPolicy.RETAIN,
        });
      }
      bucketEncryption = s3.BucketEncryption.KMS;
    } else if (encryptionType === 'none') {
      bucketEncryption = s3.BucketEncryption.UNENCRYPTED;
    }

    // ── Lifecycle rules ───────────────────────────────────────────────────────
    const lifecycleRules: s3.LifecycleRule[] = [];

    if (autoDelete && autoDeleteDays) {
      lifecycleRules.push({
        id: 'auto-delete',
        expiration: cdk.Duration.days(autoDeleteDays),
        enabled: true,
      });
    }

    if (lifecycleTransitionDays) {
      lifecycleRules.push({
        id: 'transition-to-ia',
        transitions: [
          {
            storageClass: s3.StorageClass.INFREQUENT_ACCESS,
            transitionAfter: cdk.Duration.days(lifecycleTransitionDays),
          },
        ],
        enabled: true,
      });
    }

    if (lifecycleDeleteIncompleteUploads) {
      lifecycleRules.push({
        id: 'abort-incomplete-uploads',
        abortIncompleteMultipartUploadAfter: cdk.Duration.days(7),
        enabled: true,
      });
    }

    // ── Access logging bucket ─────────────────────────────────────────────────
    let accessLogsBucket: s3.Bucket | undefined;
    if (enableAccessLogs) {
      accessLogsBucket = new s3.Bucket(this, 'AccessLogsBucket', {
        bucketName: `${bucketName}-access-logs`,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
        encryption: s3.BucketEncryption.S3_MANAGED,
        lifecycleRules: [
          {
            id: 'expire-logs',
            expiration: cdk.Duration.days(90),
            enabled: true,
          },
        ],
      });
    }

    // ── CORS configuration ────────────────────────────────────────────────────
    const allowedMethods = getAllowedMethodsFromConfig(corsMethods);

    // ── S3 Bucket ─────────────────────────────────────────────────────────────
    const bucket = new s3.Bucket(this, 'StorageBucket', {
      bucketName,
      cors: [
        {
          allowedOrigins: corsOrigins,
          allowedMethods:
            allowedMethods.length > 0
              ? allowedMethods
              : [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
          allowedHeaders: ['*'],
          maxAge: 3600,
        },
      ],
      blockPublicAccess:
        access === 'public'
          ? new s3.BlockPublicAccess({
              blockPublicAcls: false,
              blockPublicPolicy: false,
              ignorePublicAcls: false,
              restrictPublicBuckets: false,
            })
          : s3.BlockPublicAccess.BLOCK_ALL,
      versioned: versioning,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      encryption: bucketEncryption,
      encryptionKey,
      serverAccessLogsBucket: accessLogsBucket,
      serverAccessLogsPrefix: enableAccessLogs ? 'access-logs/' : undefined,
      lifecycleRules,
    });

    // If public access, add a bucket policy allowing public reads
    if (access === 'public') {
      bucket.addToResourcePolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          principals: [new iam.AnyPrincipal()],
          actions: ['s3:GetObject'],
          resources: [`${bucket.bucketArn}/*`],
        }),
      );
    }

    // ── Optional CloudFront Distribution ─────────────────────────────────────
    let distribution: cloudfront.Distribution | undefined;

    if (enableCDN) {
      const oai = new cloudfront.OriginAccessIdentity(this, 'OAI', {
        comment: `OAI for ${bucketName}`,
      });

      bucket.grantRead(oai);

      distribution = new cloudfront.Distribution(this, 'Distribution', {
        defaultBehavior: {
          origin: origins.S3BucketOrigin.withOriginAccessIdentity(bucket, {
            originAccessIdentity: oai,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          responseHeadersPolicy: cacheControl
            ? new cloudfront.ResponseHeadersPolicy(this, 'CacheHeadersPolicy', {
                customHeadersBehavior: {
                  customHeaders: [
                    {
                      header: 'Cache-Control',
                      value: cacheControl,
                      override: true,
                    },
                  ],
                },
              })
            : undefined,
        },
      });
    }

    // ── IAM policy for presigned URL generation ───────────────────────────────
    const uploadPolicy = new iam.ManagedPolicy(this, 'UploadPolicy', {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['s3:PutObject', 's3:GetObject', 's3:DeleteObject'],
          resources: [`${bucket.bucketArn}/*`],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['s3:ListBucket'],
          resources: [bucket.bucketArn],
        }),
        ...(encryptionKey
          ? [
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['kms:GenerateDataKey', 'kms:Decrypt', 'kms:DescribeKey'],
                resources: [encryptionKey.keyArn],
              }),
            ]
          : []),
      ],
    });

    // ── Outputs ───────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'BucketName', { value: bucket.bucketName });
    new cdk.CfnOutput(this, 'BucketArn', { value: bucket.bucketArn });
    new cdk.CfnOutput(this, 'UploadPolicyArn', {
      value: uploadPolicy.managedPolicyArn,
    });

    if (distribution) {
      new cdk.CfnOutput(this, 'CloudFrontDomain', {
        value: distribution.distributionDomainName,
      });
      new cdk.CfnOutput(this, 'DistributionId', {
        value: distribution.distributionId,
      });
    } else {
      new cdk.CfnOutput(this, 'CloudFrontDomain', { value: '' });
      new cdk.CfnOutput(this, 'DistributionId', { value: '' });
    }

    if (encryptionKey) {
      new cdk.CfnOutput(this, 'KmsKeyArn', { value: encryptionKey.keyArn });
    }

    if (accessLogsBucket) {
      new cdk.CfnOutput(this, 'AccessLogsBucketName', {
        value: accessLogsBucket.bucketName,
      });
    }
  }
}
