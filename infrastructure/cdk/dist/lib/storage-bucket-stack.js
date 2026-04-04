"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageBucketStack = void 0;
// CDK Stack - provisions S3 bucket with optional CloudFront distribution and IAM policy
const cdk = __importStar(require("aws-cdk-lib"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const cloudfront = __importStar(require("aws-cdk-lib/aws-cloudfront"));
const origins = __importStar(require("aws-cdk-lib/aws-cloudfront-origins"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const kms = __importStar(require("aws-cdk-lib/aws-kms"));
/** Map allowedFileTypes to CORS-friendly extension lists (informational, enforced at upload layer) */
function getAllowedMethodsFromConfig(methods) {
    const map = {
        GET: s3.HttpMethods.GET,
        PUT: s3.HttpMethods.PUT,
        POST: s3.HttpMethods.POST,
        DELETE: s3.HttpMethods.DELETE,
        HEAD: s3.HttpMethods.HEAD,
    };
    return methods.map((m) => map[m]).filter(Boolean);
}
class StorageBucketStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { bucketName, access = 'private', versioning = false, encryptionType = 'S3', kmsKeyId, enableCDN = true, enableAccessLogs = false, autoDelete = false, autoDeleteDays, lifecycleTransitionDays, lifecycleDeleteIncompleteUploads = false, corsOrigins = ['*'], corsMethods = ['GET', 'PUT', 'POST'], cacheControl = 'public, max-age=31536000', } = props;
        // ── Encryption ────────────────────────────────────────────────────────────
        let bucketEncryption = s3.BucketEncryption.S3_MANAGED;
        let encryptionKey;
        if (encryptionType === 'KMS') {
            if (kmsKeyId) {
                encryptionKey = kms.Key.fromKeyArn(this, 'ProvidedKey', kmsKeyId);
            }
            else {
                encryptionKey = new kms.Key(this, 'BucketKey', {
                    description: `KMS key for ${bucketName}`,
                    enableKeyRotation: true,
                    removalPolicy: cdk.RemovalPolicy.RETAIN,
                });
            }
            bucketEncryption = s3.BucketEncryption.KMS;
        }
        else if (encryptionType === 'none') {
            bucketEncryption = s3.BucketEncryption.UNENCRYPTED;
        }
        // ── Lifecycle rules ───────────────────────────────────────────────────────
        const lifecycleRules = [];
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
        let accessLogsBucket;
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
                    allowedMethods: allowedMethods.length > 0
                        ? allowedMethods
                        : [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
                    allowedHeaders: ['*'],
                    maxAge: 3600,
                },
            ],
            blockPublicAccess: access === 'public'
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
            bucket.addToResourcePolicy(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                principals: [new iam.AnyPrincipal()],
                actions: ['s3:GetObject'],
                resources: [`${bucket.bucketArn}/*`],
            }));
        }
        // ── Optional CloudFront Distribution ─────────────────────────────────────
        let distribution;
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
        }
        else {
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
exports.StorageBucketStack = StorageBucketStack;
