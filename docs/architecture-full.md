# Architecture — Full Reference

## What is DropOut?

**DropOut** is a **local-only, internal Next.js dashboard** for managing AWS S3 buckets and CloudFront distributions. It is not a SaaS product, is not multi-tenant, and requires no hosting — it runs exclusively on your machine via `pnpm dev`.

The system lets you:
- Organize upload infrastructure into **Projects** (one per client app or internal service)
- Bootstrap **AWS CDK environments** per region
- Provision **S3 buckets + CloudFront distributions** per project via AWS CDK
- Generate **pre-signed upload URLs** so your external apps upload directly to S3
- **Browse S3 files** via an Explorer-style interface
- Track every uploaded **file's metadata** locally
- View **analytics and cost estimates** across buckets and projects
- Generate **copy-paste integration snippets** for your own Next.js apps
- Run **AWS commands and AI diagnostics** from a built-in terminal

---

## Auto-Update on Dev Start

Every time you run `pnpm dev`, DropOut pulls the latest code from `origin/master` via `scripts/pull-latest.js`:

1. Checks git and remote availability
2. Fetches from `origin/master`
3. Stashes uncommitted local changes (if any)
4. Fast-forward merges new commits
5. Pops the stash
6. Warns if `package.json` or `pnpm-lock.yaml` changed

This is implemented as a `predev` npm lifecycle hook and never blocks the server on failure.

---

## System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                  Browser (localhost:3000)                       │
│                                                                │
│  Dashboard  Projects  Buckets  Files  Envs  Distros  Commands  │
│     /          /projects  /buckets  /files  /envs   /commands  │
└───────────────────────────┬────────────────────────────────────┘
                            │ HTTP (same process)
┌───────────────────────────▼────────────────────────────────────┐
│               Next.js API Routes (Server-side)                  │
│                                                                │
│  /api/projects  /api/buckets  /api/files  /api/environments    │
│  /api/analytics  /api/expenses  /api/infrastructure            │
│  /api/distributions  /api/terminal  /api/commands  /api/ai     │
│  /api/aws-identity  /api/settings  /api/system  /api/docs-chat │
│                                                                │
│         ┌─────────────┐          ┌──────────────────────────┐  │
│         │  lib/        │          │  child_process (CDK)     │  │
│         │  filesystem  │          │  spawn → cdk deploy      │  │
│         │  .ts         │          │  → NDJSON stream         │  │
│         └──────┬───────┘          └──────────┬───────────────┘  │
└────────────────┼─────────────────────────────┼──────────────────┘
                 │ fs.read/write               │ AWS CDK CLI
    ┌────────────▼────────────┐    ┌───────────▼────────────────┐
    │   /data/*.json          │    │   AWS            (remote)  │
    │   projects.json         │    │   S3 Buckets               │
    │   buckets.json          │    │   CloudFront Distributions │
    │   files.json            │    │   CloudFormation Stacks    │
    │   environments.json     │    │   IAM Policies             │
    │   settings.json         │    └────────────────────────────┘
    │   system.json           │
    │   custom-commands.json  │
    └─────────────────────────┘
```

---

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | Next.js 16 (App Router) | Full-stack React framework |
| React | React 19 | UI library |
| UI Components | shadcn/ui (new-york, neutral) | Accessible component library |
| Styling | Tailwind CSS v4 | Utility-first CSS |
| Animations | framer-motion | Sidebar, modals, cards, transitions |
| Icons | lucide-react | Consistent icon set |
| Charts | recharts (via shadcn chart) | Analytics and cost charts |
| Sparklines | react-sparklines | Inline mini-charts on cards |
| Forms | React Hook Form + Zod | Type-safe form validation |
| AI | Vercel AI SDK v6 + OpenAI GPT-4o-mini | Command generation, error debugging |
| AWS SDK | @aws-sdk v3 (S3, CloudFront, CloudFormation, IAM, STS) | AWS operations |
| S3 Presigner | @aws-sdk/s3-request-presigner | Pre-signed PutObject URLs |
| Maps | maplibre-gl | Region world map in Environments |
| Flags | react-circle-flags | Region flag icons |
| Syntax | prism-react-renderer | Code blocks |
| Infrastructure | AWS CDK v2 (TypeScript) | S3 + CloudFront provisioning |
| DnD | @dnd-kit | Drag-and-drop in file explorer |
| Data Storage | Node.js fs (JSON files) | Local persistence, no database |
| Runtime | Node.js 20 | Local only, Windows + macOS + Linux |
| Package Manager | pnpm | Faster installs |

---

## Folder Structure

```
dropout/
│
├── scripts/
│   └── pull-latest.js           ← Auto-update hook (runs before pnpm dev)
│
├── app/                          ← Next.js App Router
│   ├── (dashboard)/              ← Route group (no URL segment)
│   │   ├── layout.tsx            ← Sidebar + header shell
│   │   ├── page.tsx              ← Dashboard / Overview
│   │   ├── projects/
│   │   │   ├── page.tsx          ← Projects list (card grid)
│   │   │   └── [id]/page.tsx     ← Project detail
│   │   ├── buckets/
│   │   │   ├── page.tsx          ← Buckets list (card grid)
│   │   │   └── [id]/page.tsx     ← Bucket detail (6 tabs: S3 files, analytics, cost, records, setup, sync)
│   │   ├── files/page.tsx        ← Windows Explorer-style S3 file browser
│   │   ├── environments/page.tsx ← CDK bootstrap region manager + world map
│   │   ├── distributions/page.tsx ← CloudFront distributions management
│   │   ├── infrastructure/page.tsx ← CDK synth/deploy controls
│   │   ├── snippets/page.tsx     ← Code snippet generator
│   │   ├── commands/page.tsx     ← Quick actions + AI tools
│   │   └── settings/page.tsx     ← AWS credentials, OpenAI key, theme
│   │   └── docs/                 ← Documentation viewer
│   │
│   ├── landing/                  ← Marketing page (before onboarding)
│   ├── onboarding/               ← 6-step setup wizard
│   │
│   └── api/                      ← Next.js API Routes
│       ├── projects/route.ts
│       ├── buckets/route.ts
│       ├── files/route.ts        ← GET/POST (pre-sign), DELETE
│       ├── files/s3/route.ts     ← List actual S3 objects
│       ├── environments/route.ts ← CRUD + CDK bootstrap
│       ├── distributions/route.ts
│       ├── infrastructure/route.ts ← CDK synth/deploy (streaming NDJSON)
│       ├── analytics/route.ts
│       ├── expenses/route.ts     ← Cost estimation per bucket/project
│       ├── terminal/route.ts     ← Run/output/kill shell commands
│       ├── commands/route.ts     ← Saved custom commands CRUD
│       ├── ai/route.ts           ← Generate + debug via OpenAI
│       ├── aws-identity/route.ts ← STS identity + IAM permission check
│       ├── settings/route.ts     ← Read/write settings.json
│       ├── system/route.ts       ← Read/write system.json (onboarding state)
│       └── docs-chat/route.ts    ← AI chat over the docs
│
├── features/                     ← Feature-based code modules
│   ├── projects/
│   │   ├── components/           ← ProjectCards, CreateProjectDialog, etc.
│   │   └── hooks/                ← useProjects, useCreateProject, useDeleteProject
│   ├── buckets/
│   │   ├── components/           ← BucketCard, BucketsTable, CreateBucketDialog, SetupTab, DeleteBucketDialog
│   │   └── hooks/                ← useBuckets, useCreateBucket, useDeleteBucket, useBucketInventory
│   ├── files/
│   │   ├── components/           ← FileExplorer, FilesTable, S3FilesTable, FolderStructure,
│   │   │                            UploadDialog, CreateFolderDialog, MoveFileDialog, ContextMenu
│   │   └── hooks/                ← useFiles, useS3Files, useDeleteFile, useGeneratePresignedUrl
│   ├── environments/
│   │   ├── components/           ← EnvironmentsMap (maplibre)
│   │   └── hooks/                ← useEnvironments, useBootstrapEnvironment
│   ├── infrastructure/
│   │   ├── components/           ← BucketAnalyticsTable, StorageCharts, CostTables, SyncStatusDialog, CodeSnippets
│   │   ├── hooks/                ← useDeployBucket, useAnalytics, useExpenses
│   │   └── utils/                ← Snippet generator, analytics export (CSV/JSON)
│   ├── onboarding/
│   │   ├── components/           ← OnboardingPage, EnvironmentStep, AwsStep, BootstrapStep,
│   │   │                            AiStep, BucketSyncStep, StarRepoStep, ProductTour
│   │   ├── hooks/                ← useOnboardingState, useEnvironmentValidation, useAwsValidation, useAiOptionalSetup
│   │   └── utils/                ← Error diagnosis helpers
│   ├── docs/
│   │   └── components/           ← DocsContent, TableOfContents
│   └── landing/                  ← Landing page components
│
├── components/                   ← Shared presentational components
│   ├── ui/                       ← shadcn/ui components
│   ├── app-sidebar.tsx           ← Main navigation sidebar
│   ├── animated-card.tsx         ← Card with hover lift animation
│   ├── animated-dialog.tsx       ← Modal with fade+scale animation
│   ├── code-block.tsx            ← Copy-paste code display
│   ├── page-transition.tsx       ← Page fade transition wrapper
│   ├── terminal-panel.tsx        ← Xterm.js terminal panel
│   ├── dashboard-shell.tsx       ← Page header + content wrapper
│   └── markdown-renderer.tsx     ← React Markdown with custom renderers
│
├── lib/                          ← Core utilities
│   ├── types.ts                  ← All TypeScript interfaces
│   ├── config.ts                 ← APP_CONFIG (name, logo, GitHub, etc.)
│   ├── filesystem.ts             ← JSON CRUD: readJsonFile, appendToJsonFile, updateInJsonFile, deleteFromJsonFile
│   ├── aws.ts                    ← S3, CloudFront, STS, IAM helpers
│   ├── validations.ts            ← Zod schemas + AWS_REGIONS constant
│   ├── terminal-context.tsx      ← Shared terminal state provider
│   ├── theme-context.tsx         ← Light/dark/system theme context
│   ├── deletion-context.tsx      ← Multi-step bucket deletion state
│   ├── region-flags.ts           ← Region → country code mapping
│   └── utils.ts                  ← cn() + misc helpers
│
├── data/                         ← Local JSON persistence (gitignored)
│   ├── projects.json
│   ├── buckets.json
│   ├── files.json
│   ├── environments.json
│   ├── settings.json             ← AWS credentials + OpenAI key (never commit)
│   ├── system.json               ← Onboarding state flags
│   └── custom-commands.json
│
├── docs/                         ← Documentation Markdown source
│   ├── user-guide.md
│   ├── setup-guide.md
│   ├── architecture-full.md      (this file)
│   └── architecture-short.md
│
└── infrastructure/
    └── cdk/                      ← AWS CDK TypeScript project
        ├── bin/app.ts            ← CDK app entry point
        └── lib/storage-bucket-stack.ts  ← S3 + CloudFront + OAI + IAM stack
```

---

## Data Models

### BootstrappedEnvironment

```typescript
interface BootstrappedEnvironment {
  id: string;
  accountId: string;
  region: string;      // e.g. "us-east-1"
  alias: string;       // e.g. "EU Production"
  status: 'bootstrapping' | 'active' | 'failed';
  bootstrappedAt: string;
  createdAt: string;
}
```

### Project

```typescript
interface Project {
  id: string;             // UUID
  name: string;
  environment: 'dev' | 'prod';
  maxFileSizeMB: number;
  allowedMimeTypes: string[];
  createdAt: string;
  updatedAt: string;
}
```

### Bucket

```typescript
interface Bucket {
  id: string;
  projectId: string;
  name: string;                    // display name (slug)
  s3BucketName: string;            // actual AWS bucket: "scr-<name>-<timestamp>"
  s3BucketArn: string;
  cloudFrontDomain: string;
  cloudFrontDistributionId: string;
  region: string;
  status: 'pending' | 'deploying' | 'active' | 'failed' | 'deleting';
  config: BucketConfig;            // full config (CORS, encryption, versioning, etc.)
  createdAt: string;
  updatedAt: string;
}
```

### BucketConfig (key fields)

```typescript
interface BucketConfig {
  access: 'private' | 'public';
  maxFileSizeMB: number;
  allowedFileTypes: 'images' | 'videos' | 'documents' | 'any';
  autoDelete: boolean;
  autoDeleteDays?: number;
  signedUrlExpiration: number;     // seconds
  corsOrigins: string[];
  corsMethods: string[];
  versioning: boolean;
  lifecycleTransitionDays?: number;
  enableCDN: boolean;
  cacheControl: string;
  encryptionType: 'S3' | 'KMS' | 'none';
  kmsKeyId?: string;
  enableAccessLogs: boolean;
  enableMetrics: boolean;
  monthlyBudgetAlertUSD?: number;
}
```

### FileRecord

```typescript
interface FileRecord {
  id: string;
  projectId: string;
  bucketName: string;      // s3BucketName
  objectKey: string;       // e.g. "proj-id/uuid-filename.jpg"
  cloudFrontUrl: string;
  size: number;            // bytes
  mimeType: string;
  linkedModel: string;     // e.g. "User" — empty = orphan
  linkedModelId: string;   // e.g. "user-123"
  createdAt: string;
}
```

### system.json

```typescript
{
  environmentValidated: boolean;
  awsValidated: boolean;
  cdkBootstrapped: boolean;
  aiConfigured: boolean;
  onboardingComplete: boolean;
  tourCompleted: boolean;
}
```

---

## API Routes Reference

### Projects

| Method | Path | Description |
|---|---|---|
| GET | `/api/projects` | List all projects |
| POST | `/api/projects` | Create a project (Zod-validated) |
| PUT | `/api/projects` | Update project by `{ id, ...updates }` |
| DELETE | `/api/projects?id=<id>` | Delete project by ID |

### Buckets

| Method | Path | Description |
|---|---|---|
| GET | `/api/buckets?projectId=<id>` | List all buckets, optionally by project |
| POST | `/api/buckets` | Create a `pending` bucket record |
| PUT | `/api/buckets` | Update bucket (e.g. after CDK deploy) |
| DELETE | `/api/buckets?id=<id>` | Delete bucket record |

### Files

| Method | Path | Description |
|---|---|---|
| GET | `/api/files?projectId=<id>&bucketName=<name>` | List file metadata |
| POST | `/api/files` | Validate + generate pre-signed PutObject URL + store metadata |
| DELETE | `/api/files?id=<id>` | Delete file metadata record (not the S3 object) |
| GET | `/api/files/s3?bucketName=<n>&region=<r>&prefix=<p>` | List actual S3 objects, merged with local metadata |

### Environments

| Method | Path | Description |
|---|---|---|
| GET | `/api/environments` | List bootstrapped environments |
| POST | `/api/environments` | Bootstrap a new region (runs `cdk bootstrap`, streams output) |
| DELETE | `/api/environments?id=<id>` | Remove environment record |

### Infrastructure

| Method | Path | Description |
|---|---|---|
| POST | `/api/infrastructure` | Run CDK synth or deploy (streaming NDJSON) |

Request body:
```json
{
  "action": "deploy" | "synth",
  "bucketId": "uuid",
  "s3BucketName": "scr-my-bucket-1234",
  "region": "us-east-1",
  "config": { ...BucketConfig }
}
```

### Distributions

| Method | Path | Description |
|---|---|---|
| GET | `/api/distributions` | List all CloudFront distributions |
| DELETE | `/api/distributions?distributionId=<id>` | Delete a disabled distribution |

### Analytics & Expenses

| Method | Path | Description |
|---|---|---|
| GET | `/api/analytics?projectId=<id>` | Aggregate stats (totals, per-bucket, orphans) |
| GET | `/api/expenses` | Estimated cost breakdown per bucket and project |

### Terminal & Commands

| Method | Path | Description |
|---|---|---|
| POST | `/api/terminal` | Spawn a shell command, returns `{ id, pid }` |
| GET | `/api/terminal?id=<id>` | Get command output and status |
| DELETE | `/api/terminal?id=<id>` | Kill a running process |
| GET | `/api/commands` | List saved custom commands |
| POST | `/api/commands` | Save a new custom command |
| DELETE | `/api/commands?id=<id>` | Delete a saved command |

### AI

| Method | Path | Description |
|---|---|---|
| POST | `/api/ai` | Generate a command or debug an error via GPT-4o-mini |

```json
// Generate
{ "action": "generate", "prompt": "list S3 buckets by size" }

// Debug
{ "action": "debug", "error": "AccessDenied when running cdk deploy..." }
```

### Settings & System

| Method | Path | Description |
|---|---|---|
| GET | `/api/settings` | Read settings.json |
| PUT | `/api/settings` | Update settings.json |
| GET | `/api/system` | Read system.json (onboarding flags) |
| PUT | `/api/system` | Update system.json |
| GET | `/api/aws-identity` | Get STS identity + IAM permission check |

### Docs Chat

| Method | Path | Description |
|---|---|---|
| POST | `/api/docs-chat` | AI chat over the documentation Markdown files |

---

## CDK Infrastructure Stack

Location: `infrastructure/cdk/lib/storage-bucket-stack.ts`

### Stack inputs (environment variables)

| Variable | Description |
|---|---|
| `SCR_BUCKET_NAME` | Full S3 bucket name (e.g. `scr-my-bucket-1234`) |
| `SCR_REGION` | AWS region to deploy to |
| `SCR_CONFIG` | JSON-serialized `BucketConfig` object |

### Resources created per stack

```
StorageBucketStack  (CloudFormation stack name: SCR-<s3BucketName>)
│
├── S3 Bucket
│   ├── Name: scr-<name>-<timestamp>
│   ├── BlockPublicAccess: BLOCK_ALL (private) or public reads allowed
│   ├── Encryption: SSE-S3 (default) or SSE-KMS
│   ├── Versioning: enabled if configured
│   ├── CORS: configured origins + methods
│   ├── Lifecycle rules: transition to Glacier + expiry if configured
│   └── RemovalPolicy: RETAIN (safe against accidental destroy)
│
├── CloudFront Origin Access Identity (OAI)
│   └── Grants CloudFront read access to private S3
│
├── CloudFront Distribution  (only if enableCDN = true)
│   ├── Origin: S3 via OAI
│   ├── ViewerProtocolPolicy: REDIRECT_TO_HTTPS
│   ├── CachePolicy: CACHING_OPTIMIZED
│   └── Custom cache-control if configured
│
└── IAM Managed Policy
    ├── s3:PutObject, GetObject, DeleteObject on bucket/*
    └── s3:ListBucket on bucket
```

### CDK Outputs (read by dashboard after deploy)

| Key | Value |
|---|---|
| `BucketArn` | Full S3 ARN |
| `CloudFrontDomain` | e.g. `abc123.cloudfront.net` |
| `DistributionId` | CloudFront distribution ID |
| `UploadPolicyArn` | IAM policy ARN |

---

## Upload Flow (End-to-End)

```
Your External App              DropOut (localhost:3000)          AWS
─────────────────              ────────────────────────          ───

POST /api/files ─────────────► Validate size + MIME type
                               Find bucket record
                               Check bucket is active
                               Generate presigned URL ─────────► S3: PutObject (signed, 1h TTL)
                               Store FileRecord in files.json
◄── { uploadUrl,               ◄────────────────────────────────
      objectKey,
      cloudFrontUrl,
      file }

PUT <uploadUrl> ──────────────────────────────────────────────► S3 Bucket (direct, no proxy)
(raw file bytes)
                               
GET cloudFrontUrl ────────────────────────────────────────────► CloudFront → S3
(serve to users)
```

---

## Onboarding State Machine

The `data/system.json` file tracks wizard completion:

```
initial state:
  { environmentValidated: false, awsValidated: false,
    cdkBootstrapped: false, aiConfigured: false,
    onboardingComplete: false, tourCompleted: false }

OnboardingGuard:
  if onboardingComplete === false → redirect to /onboarding
  else → render dashboard

Steps update the flags in sequence via PUT /api/system
```

---

## Global Application Config

All branding is centralized in `lib/config.ts`:

```typescript
export const APP_CONFIG = {
  name: "DropOut",
  description: "Internal S3 + CloudFront management dashboard",
  logoDark: "/logos/white transparent background.png",
  logoLight: "/logos/white transparent background.png",
  githubRepo: "abdelrahmangasser555/do-it-my-self",
  tagline: "Local-only · No hosting",
  setupVideoUrl: "https://www.youtube.com/embed/...",
  tutorialVideoUrl: "https://www.youtube.com/embed/...",
  creatorWebsite: "https://example.com",
} as const;
```

---

## Security Considerations

- `data/settings.json` contains AWS credentials and the OpenAI key — this file is **gitignored** by default (`data/*.json` is in `.gitignore`)
- Pre-signed URLs are time-limited (configurable, default 3600 s)
- All CDK-created S3 buckets are **private** by default with `BlockPublicAccess: BLOCK_ALL`
- CloudFront uses OAI so S3 is never directly accessible from the internet
- The dashboard has no authentication — it is designed to run locally only; never expose port 3000 publicly
- No AWS credentials are ever passed through the browser — all AWS SDK calls happen server-side in API routes

---

## Code Organization Rules

| Rule | Details |
|---|---|
| Feature-based | All domain logic in `features/<domain>/` |
| Hooks = business logic | Data fetching, mutations, state → `features/*/hooks/` |
| Components = presentational | No API calls, no side effects → `features/*/components/` |
| API routes only | All file I/O (`fs`) and AWS SDK calls happen in `app/api/*/route.ts` |
| Shared utilities | `lib/` only |
| No global state libraries | React hooks + context only |
| APP_CONFIG | Never hardcode the app name; always import from `lib/config.ts` |
| Types | All interfaces in `lib/types.ts` |
| Zod schemas | In `lib/validations.ts` |
