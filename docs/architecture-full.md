# Full Architecture Documentation

## Overview

Storage Control Room is a **local-only, internal Next.js dashboard** for managing AWS S3 buckets and CloudFront distributions. It is not a SaaS product, is not multi-tenant, and requires no hosting — it runs exclusively on your machine via `npm run dev`.

The system lets you:
- Organize upload infrastructure into **Projects** (e.g. one per client or app)
- Provision **S3 buckets + CloudFront** distributions per project via AWS CDK
- Generate **pre-signed upload URLs** so your apps upload directly to S3
- Track every uploaded **file's metadata** locally
- View **analytics** across buckets and projects
- Generate **copy-paste integration snippets** for your own Next.js apps

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                  Your Browser (localhost:3000)           │
│                                                         │
│   ┌─────────────┐    ┌─────────────┐   ┌────────────┐  │
│   │  Dashboard  │    │  Projects   │   │  Buckets   │  │
│   │  (/ route)  │    │  (/projects)│   │ (/buckets) │  │
│   └──────┬──────┘    └──────┬──────┘   └─────┬──────┘  │
│          │                  │                 │         │
└──────────┼──────────────────┼─────────────────┼─────────┘
           │                  │                 │
           ▼                  ▼                 ▼
┌─────────────────────────────────────────────────────────┐
│              Next.js API Routes (Server-side)            │
│                                                         │
│   /api/projects   /api/buckets   /api/files             │
│   /api/analytics  /api/infrastructure                   │
│                                                         │
│         Reads / Writes JSON  │  Executes CDK            │
└──────────────┬───────────────┴──────────┬───────────────┘
               │                          │
       ┌───────▼───────┐         ┌────────▼────────┐
       │  /data/*.json │         │ infrastructure/ │
       │  projects.json│         │    cdk/         │
       │  buckets.json │         │  (CDK Stack)    │
       │  files.json   │         └────────┬────────┘
       └───────────────┘                  │
                                          │ cdk deploy
                                          ▼
                          ┌───────────────────────────┐
                          │         AWS Cloud          │
                          │                           │
                          │  ┌─────────┐  ┌────────┐ │
                          │  │   S3    │  │  CDN   │ │
                          │  │ Bucket  │◄─│ Cloud  │ │
                          │  │         │  │ Front  │ │
                          │  └────┬────┘  └────────┘ │
                          │       │                   │
                          │  IAM Policy (min perms)   │
                          └───────────────────────────┘
```

---

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | Next.js 16 (App Router) | Full-stack React framework |
| UI Components | shadcn/ui | Accessible component library |
| Styling | Tailwind CSS v4 | Utility-first CSS |
| Animations | framer-motion | Sidebar, modals, cards |
| Icons | lucide-react | Consistent icon set |
| Forms | React Hook Form + Zod | Type-safe form validation |
| AWS SDK | @aws-sdk/client-s3 v3 | S3 operations + pre-signed URLs |
| Infrastructure | AWS CDK v2 (TypeScript) | S3 + CloudFront provisioning |
| Data Storage | Node.js fs (JSON files) | Local persistence, no database |
| Runtime | Node.js 20 | Local only |

---

## Folder Structure

```
storage-control-room/
│
├── app/                          ← Next.js App Router
│   ├── (dashboard)/              ← Route group (no URL segment)
│   │   ├── layout.tsx            ← Sidebar + header shell
│   │   ├── page.tsx              ← Dashboard / Overview
│   │   ├── projects/
│   │   │   ├── page.tsx          ← Projects list
│   │   │   └── [id]/page.tsx     ← Project detail
│   │   ├── buckets/page.tsx      ← Buckets list
│   │   ├── files/page.tsx        ← Files list
│   │   ├── infrastructure/page.tsx ← CDK controls
│   │   ├── snippets/page.tsx     ← Code snippet generator
│   │   └── docs/                 ← Documentation viewer
│   │
│   └── api/                      ← Next.js API Routes
│       ├── projects/route.ts     ← GET/POST/PUT/DELETE projects
│       ├── buckets/route.ts      ← GET/POST/PUT/DELETE buckets
│       ├── files/route.ts        ← GET/POST/DELETE files + presign
│       ├── infrastructure/route.ts ← CDK synth/deploy
│       └── analytics/route.ts   ← Aggregated stats
│
├── features/                     ← Feature-based code modules
│   ├── projects/
│   │   ├── components/           ← Presentational components only
│   │   └── hooks/                ← All business logic in hooks
│   ├── buckets/
│   │   ├── components/
│   │   └── hooks/
│   ├── files/
│   │   ├── components/
│   │   └── hooks/
│   └── infrastructure/
│       ├── components/           ← Analytics cards, CDK deploy UI
│       ├── hooks/                ← useDeployBucket, useAnalytics
│       └── utils/                ← Snippet generator functions
│
├── components/                   ← Shared presentational components
│   ├── ui/                       ← shadcn/ui components
│   ├── app-sidebar.tsx           ← Main navigation sidebar
│   ├── animated-card.tsx         ← Card with hover lift animation
│   ├── animated-dialog.tsx       ← Modal with fade+scale animation
│   ├── code-block.tsx            ← Copy-paste code display
│   └── page-transition.tsx       ← Page fade transition
│
├── lib/                          ← Core utilities
│   ├── types.ts                  ← All TypeScript interfaces
│   ├── filesystem.ts             ← JSON CRUD helpers
│   ├── aws.ts                    ← S3 + presigned URL helpers
│   ├── validations.ts            ← Zod schemas
│   └── utils.ts                  ← cn() + misc helpers
│
├── data/                         ← Local JSON persistence
│   ├── projects.json
│   ├── buckets.json
│   └── files.json
│
├── docs/                         ← Documentation source files
│
└── infrastructure/
    └── cdk/                      ← AWS CDK TypeScript project
        ├── bin/app.ts            ← CDK app entry point
        └── lib/storage-bucket-stack.ts ← S3 + CloudFront stack
```

---

## Data Models

### Project

```typescript
interface Project {
  id: string;              // UUID
  name: string;            // "my-project"
  environment: "dev" | "prod";
  maxFileSizeMB: number;   // Upload size limit
  allowedMimeTypes: string[]; // ["image/jpeg", "application/pdf"]
  createdAt: string;       // ISO 8601
  updatedAt: string;
}
```

### Bucket

```typescript
interface Bucket {
  id: string;
  projectId: string;           // FK → Project.id
  name: string;                // Human-readable label
  s3BucketName: string;        // Actual AWS bucket name
  s3BucketArn: string;         // ARN (populated after CDK deploy)
  cloudFrontDomain: string;    // e.g. abc123.cloudfront.net
  cloudFrontDistributionId: string;
  region: string;              // AWS region
  status: "pending" | "deploying" | "active" | "failed";
  createdAt: string;
  updatedAt: string;
}
```

### FileRecord

```typescript
interface FileRecord {
  id: string;
  projectId: string;      // FK → Project.id
  bucketName: string;     // S3 bucket name
  objectKey: string;      // e.g. "proj-id/uuid-filename.jpg"
  cloudFrontUrl: string;  // Full CDN URL
  size: number;           // File size in bytes
  mimeType: string;       // "image/jpeg"
  linkedModel: string;    // e.g. "User" — what entity owns this file
  linkedModelId: string;  // e.g. "user-123"
  createdAt: string;
}
```

---

## API Routes Reference

### `GET /api/projects`
Returns all projects from `data/projects.json`.

### `POST /api/projects`
Creates a new project. Body is validated against `projectSchema` (Zod). Assigns a UUID, timestamps, and appends to `projects.json`.

### `PUT /api/projects`
Updates an existing project by `{ id, ...updates }`.

### `DELETE /api/projects?id=<id>`
Removes project by ID.

---

### `GET /api/buckets?projectId=<id>`
Returns all buckets, optionally filtered by `projectId`.

### `POST /api/buckets`
Creates a bucket record with `status: "pending"`. Generates the S3 bucket name as `scr-<name>-<timestamp>`. Does **not** deploy to AWS — that happens via `/api/infrastructure`.

### `PUT /api/buckets`
Updates a bucket record (used internally after CDK deploy to store ARN + CloudFront domain).

### `DELETE /api/buckets?id=<id>`
Removes bucket record by ID.

---

### `GET /api/files?projectId=<id>&bucketName=<name>`
Returns file metadata, optionally filtered.

### `POST /api/files`
- Validates project exists and size/MIME type are within the project's limits
- Finds the matching bucket record
- Generates a **pre-signed S3 PutObject URL** (1 hour expiry)
- Stores the file metadata in `files.json`
- Returns `{ uploadUrl, objectKey, cloudFrontUrl, file }`

> Your external app calls this, then uploads directly to S3 using `uploadUrl`.

### `DELETE /api/files?id=<id>`
Removes file metadata record.

---

### `POST /api/infrastructure`
Executes CDK commands via `child_process.exec`.

```json
{
  "action": "deploy",
  "bucketId": "uuid",
  "s3BucketName": "scr-my-bucket-1234",
  "region": "us-east-1"
}
```

- Sets `status: "deploying"` before running
- Reads `cdk-outputs.json` after deploy to extract CloudFront domain and ARN
- Sets `status: "active"` on success, `"failed"` on error

---

### `GET /api/analytics?projectId=<id>`
Aggregates across all three JSON stores:
- Total projects, buckets, files
- Total storage bytes
- Per-bucket breakdown: file count, storage, orphaned files

---

## CDK Infrastructure Stack

Location: `infrastructure/cdk/lib/storage-bucket-stack.ts`

Each CDK stack creates:

```
StorageBucketStack
├── S3 Bucket
│   ├── CORS: GET, PUT, POST from any origin
│   ├── BlockPublicAccess: BLOCK_ALL
│   ├── Encryption: S3_MANAGED
│   └── RemovalPolicy: RETAIN (safe against accidental deletion)
│
├── CloudFront Origin Access Identity (OAI)
│   └── Grants read access from CloudFront to S3
│
├── CloudFront Distribution
│   ├── Origin: S3 via OAI
│   ├── ViewerProtocolPolicy: REDIRECT_TO_HTTPS
│   └── CachePolicy: CACHING_OPTIMIZED
│
└── IAM Managed Policy
    ├── s3:PutObject, s3:GetObject, s3:DeleteObject on bucket/*
    └── s3:ListBucket on bucket
```

### CDK Outputs (used by the dashboard)

| Output Key | Value |
|---|---|
| `BucketArn` | Full S3 ARN |
| `CloudFrontDomain` | e.g. `abc.cloudfront.net` |
| `DistributionId` | CloudFront distribution ID |
| `UploadPolicyArn` | IAM policy ARN to attach to your app's role |

---

## Upload Flow (End-to-End)

```
Your App                 Storage Control Room      AWS
─────────                ────────────────────      ───
POST /api/files ──────► Validate size + MIME
                        Find bucket record
                        Generate presigned URL ──► S3 PutObject (signed)
◄── { uploadUrl,
      objectKey,
      cloudFrontUrl }

PUT uploadUrl ───────────────────────────────────► S3 Bucket
(direct to S3, no proxy)

Access file ─────────────────────────────────────► CloudFront
via cloudFrontUrl                                   └── S3 (origin)
```

---

## Security Model

- **No public API** — runs only on localhost
- **S3 is fully private** — access only via CloudFront (OAI) or pre-signed URLs
- **Pre-signed URLs expire in 1 hour** — uploads must happen within that window
- **Minimal IAM** — the CDK stack creates the least-privilege policy scoped to the specific bucket
- **MIME + size validation** — enforced server-side before a pre-signed URL is issued; limits are set per project

---

## Animation System

All animations use `framer-motion` only:

| Element | Effect | Details |
|---|---|---|
| Page navigation | Opacity fade | `initial: 0 → animate: 1`, 200ms |
| Dialogs (modals) | Fade + scale | `scale: 0.95 → 1`, 150ms |
| Cards | Hover lift | `y: -2px` on hover, 200ms |
| Sidebar | shadcn built-in | Controlled by `SidebarProvider` |

---

## Local Data Persistence

All state is stored as JSON arrays in `/data/`. There is no database, no ORM, and no migrations.

```
Read  → fs.readFile  → JSON.parse
Write → JSON.stringify → fs.writeFile (atomic overwrite)
```

Helper functions in `lib/filesystem.ts`:
- `readJsonFile<T>(fileName)` — read + parse, auto-creates empty array if missing
- `appendToJsonFile<T>(fileName, item)` — read, push, write
- `updateInJsonFile<T>(fileName, id, updates)` — read, splice, write
- `deleteFromJsonFile<T>(fileName, id)` — filter out by id, write
- `findInJsonFile<T>(fileName, id)` — find by id
- `filterJsonFile<T>(fileName, predicate)` — filter by predicate

---

## Design Principles

1. **Feature-based isolation** — each feature (projects, buckets, files, infrastructure) is a self-contained module
2. **Hooks carry all logic** — components are purely presentational, hooks do all fetching and state management
3. **One responsibility per hook** — `useProjects`, `useCreateProject`, `useDeleteProject` are separate exports
4. **Local-only** — zero cloud services for the dashboard itself; AWS is only for the provisioned storage resources
5. **No global state** — no Redux, no Zustand; each page fetches its own data via hooks
6. **Minimal abstraction** — code is readable and direct; no over-engineering
