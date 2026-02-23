# Storage Control Room

A **local-only internal dashboard** for managing AWS S3 buckets and CloudFront distributions. Built with Next.js 16, shadcn/ui, and AWS CDK. No hosting required — runs entirely on your machine.

<!-- Screenshot placeholders — replace with actual images -->
<!-- ![Dashboard](docs/images/dashboard.png) -->
<!-- ![Bucket Detail](docs/images/bucket-detail.png) -->
<!-- ![Commands](docs/images/commands.png) -->

---

## Features

### Storage Management
- **Projects** — Organize upload infrastructure by app or client. Set per-project file size limits and allowed MIME types.
- **S3 Buckets** — Create, deploy, and manage S3 buckets with CloudFront CDN. One-click CDK deployment.
- **Real S3 File Browsing** — View actual objects in S3, not just metadata. See which files were uploaded through the system vs. uploaded externally.
- **Folder Structure View** — Navigate files in an expandable tree with folder-level size aggregation.
- **File Upload** — Generate pre-signed URLs for direct-to-S3 uploads. Upload from the dashboard or integrate with your own apps.
- **CloudFront Distributions** — View and manage all distributions in your AWS account with linked bucket detection.

### Analytics & Charts
- **Dashboard Overview** — Total projects, buckets, files, and storage across all resources.
- **File Type Distribution** — Pie chart breakdown of file types per bucket.
- **File Size Distribution** — Bar chart grouping files by size range.
- **Per-Bucket Analytics** — Storage, file count, and orphan detection scoped per bucket.

### Developer Tools
- **Code Snippets** — Copy-paste integration code (env vars, upload API route, React component, delete API) tailored to each bucket.
- **Linked vs Orphan Files** — Built-in explanation and code examples showing how to properly associate uploads with data models.
- **Commands** — 25+ pre-built AWS/CDK commands, custom command runner, saved commands.
- **AI Command Generator** — Describe what you want in plain English, get the command back (GPT-4o-mini).
- **AI Error Debugger** — When a command fails, AI diagnoses the error and suggests fix commands.
- **Infrastructure Management** — CDK synth, deploy, and destroy directly from the UI.

### Documentation
- **Built-in docs viewer** — Setup guide, user guide, and architecture reference rendered inside the dashboard with in-page navigation.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| UI | [shadcn/ui](https://ui.shadcn.com) (new-york, neutral) + [Tailwind CSS v4](https://tailwindcss.com) |
| Animations | [framer-motion](https://www.framer.com/motion/) |
| Charts | [recharts](https://recharts.org) via shadcn chart components |
| AI | [Vercel AI SDK v6](https://sdk.vercel.ai) + OpenAI GPT-4o-mini |
| AWS | [@aws-sdk/client-s3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/), [@aws-sdk/client-cloudfront](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-cloudfront/) v3 |
| Infrastructure | [AWS CDK v2](https://docs.aws.amazon.com/cdk/v2/guide/home.html) (TypeScript) |
| Data | Plain JSON files — no database, no migrations |

---

## Quick Start

### Prerequisites

- **Node.js 20+** and npm 10+
- **AWS CLI 2.x** configured with credentials (`aws configure`)
- **AWS CDK 2.x** (`npm install -g aws-cdk`)

### 1. Clone and install

```bash
git clone https://github.com/your-org/storage-control-room.git
cd storage-control-room
npm install
```

### 2. Install CDK dependencies

```bash
cd infrastructure/cdk
npm install
cd ../..
```

### 3. Bootstrap CDK (one-time per AWS account + region)

```bash
cdk bootstrap aws://YOUR_ACCOUNT_ID/YOUR_REGION
```

> Get your account ID: `aws sts get-caller-identity --query Account --output text`

### 4. Configure environment (optional)

```bash
# .env.local
AWS_REGION=us-east-1

# Required for AI features (optional — dashboard works without it)
OPENAI_API_KEY=sk-proj-your-key-here
```

### 5. Start the dashboard

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
storage-control-room/
├── app/
│   ├── (dashboard)/          # All pages (projects, buckets, files, etc.)
│   └── api/                  # API routes (REST endpoints)
├── features/                 # Feature modules (components + hooks)
│   ├── projects/
│   ├── buckets/
│   ├── files/
│   └── infrastructure/
├── components/               # Shared UI (sidebar, animated-card, code-block)
│   └── ui/                   # shadcn/ui components
├── lib/                      # Core utilities (types, aws, filesystem, validations)
├── data/                     # JSON persistence (auto-created)
├── docs/                     # Markdown documentation
└── infrastructure/cdk/       # AWS CDK stack (S3 + CloudFront)
```

---

## How It Works

```
Your App                  Storage Control Room         AWS
────────                  ────────────────────         ───
POST /api/files ────────► Validate size + MIME
                          Find bucket record
                          Generate presigned URL ────► S3 PutObject (signed)
◄── { uploadUrl,
      cloudFrontUrl }

PUT uploadUrl ──────────────────────────────────────► S3 Bucket
(direct to S3)

GET cloudFrontUrl ──────────────────────────────────► CloudFront → S3
```

1. Your app requests a **pre-signed upload URL** from the dashboard API
2. The dashboard validates the request (MIME type, size, project limits)
3. Your app uploads **directly to S3** — no file data passes through the dashboard
4. Files are served via **CloudFront CDN** for fast global delivery

---

## Pages

| Page | Path | Description |
|---|---|---|
| Dashboard | `/` | Analytics overview across all projects |
| Projects | `/projects` | Create and manage projects |
| Buckets | `/buckets` | Create, deploy, and manage S3 buckets |
| Bucket Detail | `/buckets/[id]` | S3 files, folder tree, analytics, setup |
| Files | `/files` | View all tracked file metadata |
| Distributions | `/distributions` | CloudFront distribution management |
| Infrastructure | `/infrastructure` | CDK deploy, synth, destroy controls |
| Code Snippets | `/snippets` | Copy-paste integration code |
| Commands | `/commands` | Quick actions, saved commands, AI tools |
| Docs | `/docs` | Built-in documentation viewer |

---

## API Reference

| Endpoint | Methods | Purpose |
|---|---|---|
| `/api/projects` | GET, POST, PUT, DELETE | Project CRUD |
| `/api/buckets` | GET, POST, PUT, DELETE | Bucket CRUD |
| `/api/files` | GET, POST, DELETE | File metadata + presigned URL generation |
| `/api/files/s3` | GET | List actual S3 objects in a bucket |
| `/api/distributions` | GET, DELETE | CloudFront distribution management |
| `/api/infrastructure` | POST | CDK synth/deploy/destroy |
| `/api/analytics` | GET | Aggregated storage statistics |
| `/api/terminal` | POST, GET, DELETE | Run/track/kill shell commands |
| `/api/commands` | GET, POST, DELETE | Saved custom commands |
| `/api/ai` | POST | AI command generation + error debugging |

---

## CDK Stack

Each bucket deployment creates:

- **S3 Bucket** — Private, encrypted (S3-managed), CORS-enabled, `RETAIN` removal policy
- **CloudFront Distribution** — HTTPS-only via OAI, caching optimized
- **IAM Managed Policy** — Minimal: PutObject, GetObject, DeleteObject, ListBucket

---

## Data Storage

All metadata is stored as JSON files in `/data/`:

```
data/projects.json         # Project configurations
data/buckets.json          # Bucket records (status, ARN, CloudFront domain)
data/files.json            # Upload metadata (object key, CDN URL, linked model)
data/custom-commands.json  # Saved custom commands
```

> Actual files live in AWS S3. Local JSON stores **metadata only**.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `AWS_REGION` | No | Override default AWS region (defaults to CLI config) |
| `AWS_PROFILE` | No | Use a specific AWS CLI profile |
| `OPENAI_API_KEY` | No | Enable AI features (command generation, error debugging) |
| `DATA_DIR` | No | Override data directory (default: `./data`) |

AWS credentials are read from the standard credential chain (CLI config, environment variables, IAM role).

---

## Common Issues

| Problem | Solution |
|---|---|
| `aws configure` not found | Reinstall AWS CLI, restart terminal |
| CDK bootstrap fails | Check credentials: `aws sts get-caller-identity` |
| Port 3000 in use | `npm run dev -- -p 3001` |
| CDK deploy fails | Check Infrastructure page for errors, verify region/credentials |
| AI features not working | Add `OPENAI_API_KEY` to `.env.local` |

See the full [Setup Guide](docs/setup-guide.md) for detailed troubleshooting.

---

## Documentation

- [Setup Guide](docs/setup-guide.md) — Installation, AWS configuration, CDK bootstrap
- [User Guide](docs/user-guide.md) — Creating projects, deploying buckets, uploading files
- [Architecture (Quick)](docs/architecture-short.md) — Stack overview, routes, code organization
- [Architecture (Full)](docs/architecture-full.md) — Data models, API reference, CDK stack, security model

---

## License

Private / Internal use.
