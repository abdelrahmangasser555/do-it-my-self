# Architecture — Quick Reference

## What is it?

A **local-only internal dashboard** that manages AWS S3 + CloudFront for your apps. Runs on `localhost:3000`. No hosting, no cloud backend, no database.

---

## Stack at a Glance

```
Next.js 16 (App Router)
  ├── UI: shadcn/ui + Tailwind v4
  ├── Animations: framer-motion
  ├── Forms: React Hook Form + Zod
  ├── Charts: recharts (via shadcn chart components)
  ├── AI: Vercel AI SDK v6 + OpenAI GPT-4o-mini
  └── AWS: @aws-sdk/client-s3 + @aws-sdk/client-cloudfront v3

Data: Plain JSON files in /data/
Infra: AWS CDK v2 TypeScript
```

---

## Core Concepts

```
Project
  └── Bucket (S3 + CloudFront, deployed via CDK)
        └── FileRecord (metadata tracked locally)
```

- **Project** — groups buckets, holds upload rules (size limit, allowed MIME types)
- **Bucket** — one S3 bucket + one CloudFront distribution per bucket
- **FileRecord** — metadata only (size, key, CDN URL, linked model); actual files live in S3

---

## Request Flow

```
Browser → Next.js API Route → JSON file (read/write)
                            → CDK deploy (via child_process)
                            → AWS S3 (pre-signed URL only)
```

For uploads, your **external app** talks to `/api/files` to get a pre-signed URL, then uploads **directly** to S3. Storage Control Room never proxies file data.

---

## Routes

| URL | Purpose |
|---|---|
| `/` | Analytics overview |
| `/projects` | Manage projects |
| `/buckets` | Manage S3 buckets |
| `/buckets/[id]` | Bucket detail — S3 files, analytics, setup |
| `/files` | View all file records |
| `/distributions` | CloudFront distributions management |
| `/infrastructure` | Deploy CDK stacks |
| `/snippets` | Integration code generator |
| `/commands` | Quick actions, saved commands, AI tools |
| `/docs` | Documentation viewer |

---

## API Endpoints

| Endpoint | Methods |
|---|---|
| `/api/projects` | GET, POST, PUT, DELETE |
| `/api/buckets` | GET, POST, PUT, DELETE |
| `/api/files` | GET, POST (+ presign), DELETE |
| `/api/files/s3` | GET (list actual S3 objects) |
| `/api/distributions` | GET, DELETE |
| `/api/infrastructure` | POST (CDK synth/deploy) |
| `/api/analytics` | GET |
| `/api/terminal` | POST (run), GET (output), DELETE (kill) |
| `/api/commands` | GET, POST, DELETE (saved commands) |
| `/api/ai` | POST (generate, debug) |

---

## CDK Stack (per bucket)

Each deploy creates:
- **S3 Bucket** — private, encrypted, CORS-enabled for direct uploads
- **CloudFront Distribution** — HTTPS only, OAI-connected to S3
- **IAM Policy** — minimal: PutObject, GetObject, DeleteObject, ListBucket

---

## Data Files

```
/data/projects.json         →  [ { id, name, environment, maxFileSizeMB, ... } ]
/data/buckets.json          →  [ { id, projectId, s3BucketName, status, ... } ]
/data/files.json            →  [ { id, objectKey, cloudFrontUrl, size, ... } ]
/data/custom-commands.json  →  [ { id, label, description, command, ... } ]
```

All persistence is flat JSON. No migrations ever needed.

---

## Code Organization Rules

- **All business logic → hooks** (`features/*/hooks/`)
- **Components → presentational only** (`features/*/components/`)
- **API routes → `app/api/*/route.ts`** only
- **Shared utilities → `lib/`**
- **No global state libraries**
