# AGENTS.md — DropOut (Storage Control Room)

## Project Summary

DropOut is an internal, local-only AWS S3 and CloudFront management dashboard built with Next.js 16. It lets developers organize upload infrastructure into projects, provision S3 buckets + CloudFront CDNs via AWS CDK, generate pre-signed upload URLs, and track file metadata — all from a single dashboard running on localhost.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| UI | shadcn/ui (new-york), Tailwind CSS v4 |
| Animations | framer-motion |
| Forms | React Hook Form + Zod |
| AWS | @aws-sdk/client-s3, CloudFront, CloudFormation, IAM, STS (v3) |
| Infrastructure | AWS CDK v2 (TypeScript) |
| AI | Vercel AI SDK v6 + OpenAI (optional) |
| Data | Local JSON files (no database) |
| Package Manager | pnpm |

## Project Structure

```
app/                    → Next.js App Router pages and API routes
  (dashboard)/          → Dashboard route group (sidebar layout)
  api/                  → Server-side API routes (JSON file CRUD, CDK, AWS)
  landing/              → Marketing/landing page
  onboarding/           → Setup wizard
components/             → Shared UI components (shadcn/ui + custom)
features/               → Feature modules (projects, buckets, files, infrastructure, onboarding)
  <feature>/components/ → Presentational components
  <feature>/hooks/      → Business logic hooks
  <feature>/utils/      → Pure helper functions
lib/                    → Shared utilities (types, config, AWS wrappers, filesystem)
infrastructure/cdk/     → AWS CDK app (S3 + CloudFront stacks)
data/                   → Local JSON data files (projects, buckets, files, etc.)
docs/                   → Architecture and setup documentation
```

## Key Agents & Workflows

### Infrastructure Agent
When working on CDK deployment, infrastructure provisioning, or AWS resource management:
- CDK stack definition: `infrastructure/cdk/lib/storage-bucket-stack.ts`
- Deploy API: `app/api/infrastructure/route.ts` (streaming NDJSON)
- Deploy hook: `features/infrastructure/hooks/use-deploy-bucket.ts`
- Terminal context: `lib/terminal-context.tsx`
- **Windows caveat:** Always clean `synth.lock*` files from `cdk.out/` before CDK commands

### Data Agent
When working on data persistence or CRUD operations:
- All data in `/data/*.json` files
- File I/O: `lib/filesystem.ts` (readJsonFile, appendToJsonFile, updateInJsonFile, deleteFromJsonFile)
- Types: `lib/types.ts`
- Validations: `lib/validations.ts`
- API routes follow pattern: `app/api/<resource>/route.ts`

### UI Agent
When working on frontend components or pages:
- shadcn/ui components in `components/ui/`
- Feature components in `features/<domain>/components/`
- Use `PageTransition` for route transitions
- Use `AnimatedDialog` for dialogs
- Use `toast` from sonner for notifications
- Global config (app name, branding): `lib/config.ts`

### Onboarding Agent
When working on setup, configuration, or first-run experience:
- Onboarding flow: `features/onboarding/`
- System state: `data/system.json` + `app/api/system/route.ts`
- Settings: `data/settings.json` + `app/api/settings/route.ts`
- Guard: `features/onboarding/components/onboarding-guard.tsx`

## Rules

1. **Feature-based organization** — domain logic goes in `features/`, not scattered across the app
2. **No direct fs in client code** — all file I/O through API routes
3. **Use APP_CONFIG** — never hardcode the app name; import from `lib/config.ts`
4. **Projects own buckets** — a project can't be deleted while it has buckets
5. **Bucket lifecycle:** pending → deploying → active/failed. Only deploy via CDK streaming API
6. **Local-only** — no auth, no multi-tenancy, no remote hosting assumptions
7. **Windows-first** — handle path separators and file locking (CDK synth.lock)
