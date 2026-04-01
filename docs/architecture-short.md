# Architecture — Quick Reference

## What is DropOut?

A **local-only internal dashboard** that manages AWS S3 + CloudFront for your apps. Runs on `localhost:3000`. No hosting, no cloud backend, no database.

---

## Auto-Update

Every `pnpm dev` automatically runs `scripts/pull-latest.js` (a `predev` hook) which pulls the latest code from `origin/master`, stashes local changes if needed, and warns if dependencies changed. The dev server always starts even if the pull fails.

---

## Stack at a Glance

```
Next.js 16 (App Router) + React 19
  ├── UI: shadcn/ui (new-york) + Tailwind CSS v4
  ├── Animations: framer-motion
  ├── Forms: React Hook Form + Zod
  ├── Charts: recharts + react-sparklines
  ├── Maps: maplibre-gl (region world map)
  ├── Terminal: @xterm/xterm
  ├── DnD: @dnd-kit (file explorer)
  ├── AI: Vercel AI SDK v6 + OpenAI GPT-4o-mini
  └── AWS: @aws-sdk v3 (S3, CloudFront, CloudFormation, IAM, STS)

Data:    Plain JSON files in /data/  (gitignored)
Infra:   AWS CDK v2 TypeScript
Package: pnpm
```

---

## Core Concepts

```
Project
  └── Bucket  (S3 + CloudFront, deployed via CDK)
        └── FileRecord  (metadata only; actual files live in S3)

BootstrappedEnvironment  (region = CDK bootstrap target)
```

- **Project** — groups buckets; holds upload rules (size limit, allowed MIMEs)
- **Bucket** — one S3 bucket + one CloudFront distribution per bucket
- **FileRecord** — metadata only (size, key, CDN URL, linked model)
- **Environment** — an AWS region that has been CDK-bootstrapped

---

## Request Flow

```
Browser → Next.js API Route → JSON file (read/write via lib/filesystem.ts)
                            → CDK deploy (via child_process.spawn, NDJSON stream)
                            → AWS SDK (STS, S3 list, CloudFront list)
```

For uploads, your **external app** calls `/api/files` to get a pre-signed URL, then uploads **directly to S3**. DropOut never proxies file bytes.

---

## Routes

| URL | Purpose |
|---|---|
| `/` | Analytics + cost overview |
| `/projects` | Manage projects |
| `/buckets` | List all S3 buckets |
| `/buckets/[id]` | Bucket detail — S3 files, analytics, cost, records, setup, sync |
| `/files` | Windows Explorer-style S3 file browser |
| `/environments` | Bootstrap / manage AWS regions |
| `/distributions` | CloudFront distributions management |
| `/infrastructure` | CDK synth/deploy terminal |
| `/snippets` | Integration code generator |
| `/commands` | Pre-built commands + AI tools |
| `/settings` | Credentials, OpenAI key, theme |
| `/docs` | Documentation viewer |

---

## API Endpoints

| Endpoint | Methods | Purpose |
|---|---|---|
| `/api/projects` | GET, POST, PUT, DELETE | Project CRUD |
| `/api/buckets` | GET, POST, PUT, DELETE | Bucket CRUD |
| `/api/files` | GET, POST (+ presign), DELETE | File metadata + pre-signed URL |
| `/api/files/s3` | GET | List actual S3 objects |
| `/api/environments` | GET, POST, DELETE | CDK bootstrap regions |
| `/api/distributions` | GET, DELETE | CloudFront distributions |
| `/api/infrastructure` | POST | CDK synth / deploy (streaming NDJSON) |
| `/api/analytics` | GET | Aggregated stats |
| `/api/expenses` | GET | Cost estimation per bucket/project |
| `/api/terminal` | POST, GET, DELETE | Run / poll / kill shell commands |
| `/api/commands` | GET, POST, DELETE | Saved custom commands |
| `/api/ai` | POST | Generate command / debug error |
| `/api/aws-identity` | GET | STS identity + IAM permission check |
| `/api/settings` | GET, PUT | Read/write settings.json |
| `/api/system` | GET, PUT | Read/write system.json (onboarding flags) |
| `/api/docs-chat` | POST | AI chat over documentation |

---

## CDK Stack (per bucket)

Each deploy creates a CloudFormation stack named `SCR-<s3BucketName>`:

```
S3 Bucket       — private, encrypted (SSE-S3 or KMS), CORS-enabled, RemovalPolicy: RETAIN
CloudFront OAI  — grants CloudFront read access to private S3
CloudFront CDN  — HTTPS-only, OAI origin, optimized caching (optional, configurable)
IAM Policy      — PutObject, GetObject, DeleteObject, ListBucket (minimal least-privilege)
```

Optional extras (driven by `BucketConfig`): versioning, lifecycle rules, Glacier transition, access logging, KMS encryption, public access.

---

## Data Files

```
/data/projects.json         →  [ { id, name, environment, maxFileSizeMB, allowedMimeTypes, ... } ]
/data/buckets.json          →  [ { id, projectId, s3BucketName, status, config, cloudFrontDomain, ... } ]
/data/files.json            →  [ { id, objectKey, cloudFrontUrl, size, mimeType, linkedModel, ... } ]
/data/environments.json     →  [ { id, accountId, region, alias, status, ... } ]
/data/settings.json         →  { awsAccessKeyId, awsSecretAccessKey, awsDefaultRegion, openaiApiKey, theme }
/data/system.json           →  { environmentValidated, awsValidated, cdkBootstrapped, onboardingComplete, ... }
/data/custom-commands.json  →  [ { id, label, description, command } ]
```

All persistence is flat JSON. No migrations. All files are **gitignored** by default.

---

## Code Organization Rules

- **All business logic → hooks** (`features/*/hooks/`)
- **Components → presentational only** (`features/*/components/`)
- **API routes → `app/api/*/route.ts`** only — no `fs` in client code
- **Shared utilities → `lib/`**
- **Global config → `lib/config.ts`** (APP_CONFIG) — never hardcode app name
- **Types → `lib/types.ts`**, **Schemas → `lib/validations.ts`**
- **No global state libraries** — React hooks + context only

---

## Security Notes

- `data/settings.json` (credentials) is gitignored — never committed
- S3 buckets are private by default (BlockPublicAccess)
- CloudFront uses OAI — S3 never directly public
- Pre-signed URLs are time-limited (default 3600 s)
- Dashboard has no auth — local use only; never expose port 3000 publicly
- All AWS SDK calls are server-side in API routes; no credentials reach the browser
