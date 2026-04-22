# AGENTS.md — DropOut (Storage Control Room)

## Purpose

DropOut is a local-only internal dashboard for managing AWS S3 buckets, CloudFront distributions, upload workflows, and CDK-backed infrastructure from a single Next.js app. The app runs on a developer machine, persists app state in local JSON files, and talks directly to AWS through API routes and SDK helpers.

This file documents the architecture after the route cleanup work:

- `app/` is the entry layer only.
- `page.tsx` files should render feature-owned screen components.
- `route.ts` files should re-export feature-owned API handlers.
- domain logic belongs in `features/<domain>/`.

## Tech Stack

| Layer           | Technology                                                    |
| --------------- | ------------------------------------------------------------- |
| Framework       | Next.js 16 (App Router), React 19                             |
| UI              | shadcn/ui (new-york), Tailwind CSS v4                         |
| Animations      | framer-motion                                                 |
| Forms           | React Hook Form + Zod                                         |
| AWS             | @aws-sdk/client-s3, CloudFront, CloudFormation, IAM, STS (v3) |
| Infrastructure  | AWS CDK v2 (TypeScript)                                       |
| AI              | Vercel AI SDK v6 + OpenAI (optional)                          |
| Data            | Local JSON files (no database)                                |
| Package Manager | pnpm                                                          |

## High-Level Architecture

### UI entry layer

- `app/(dashboard)/**/page.tsx`: thin route wrappers that render feature screen components.
- `app/onboarding/page.tsx`: thin wrapper for the onboarding screen.
- `app/api/**/route.ts`: thin wrappers that re-export `GET`, `POST`, `PUT`, `PATCH`, and `DELETE` handlers from feature api modules.
- `app/(dashboard)/layout.tsx`: shared dashboard chrome, sidebar, deletion provider, onboarding guard.

### Feature layer

Each domain owns its implementation inside `features/<domain>/`.

Current feature areas include:

- `features/dashboard/`: dashboard screen and dashboard-specific derived metrics.
- `features/projects/`: project screens, cards, CRUD hooks, project API handlers.
- `features/buckets/`: bucket screens, cards, dialogs, compatibility logic, bucket API handlers.
- `features/files/`: file explorer UI, upload/move/delete flows, S3 file API handlers.
- `features/infrastructure/`: deploy flows, analytics, expenses, snippets, CDK API handlers.
- `features/environments/`: region bootstrap UI, hooks, environment API handlers.
- `features/commands/`: commands screen, saved commands API, terminal API.
- `features/distributions/`: CloudFront screen and distribution API handlers.
- `features/settings/`: settings screen and settings API handler.
- `features/docs/`: docs screens and docs chat API.
- `features/aws-identity/`: AWS identity and permission API handlers.
- `features/system/`: system state and reset API handlers.
- `features/ai/`: AI generation/debug API handler.
- `features/onboarding/`: onboarding flow, guards, steps, validation hooks.
- `features/setup/`: setup-related reusable UI flows.

### Shared layer

- `components/`: cross-feature UI building blocks and shared app shell pieces.
- `components/ui/`: shadcn/ui primitives.
- `lib/`: shared helpers, types, config, filesystem access, AWS helpers, app-wide contexts.
- `infrastructure/cdk/`: AWS CDK app for provisioning S3 + CloudFront resources.
- `data/`: local JSON persistence.
- `docs/`: markdown docs consumed by the docs feature.

## Feature Folder Contract

Each feature should use this structure when needed:

```text
features/<domain>/
  components/   UI screens, sections, dialogs, tables, cards
  hooks/        client orchestration and stateful behavior
  api/          route handler implementations moved out of app/api
  utils/        pure helpers, transformers, calculators, constants
```

Rules:

- Do not put page-specific business logic directly in `app/**/page.tsx`.
- Do not put route implementation logic directly in `app/api/**/route.ts`.
- Prefer adding feature-local utilities before growing `lib/`.
- Only promote code to `components/` or `lib/` when multiple features share it.

## How Pages Work

The page cleanup rule is simple:

- `app/.../page.tsx` should import one feature screen and return it.
- screen components live under `features/<domain>/components/`.
- expensive derived view state should move into feature hooks or feature utils.
- dialogs, cards, tables, and tab sections should stay inside the owning feature.

If a page starts growing, split it by ownership:

- screen component for composition
- hook for async orchestration and side effects
- util for formatting, aggregation, and transformations

## How API Routes Work

The route cleanup rule mirrors the page cleanup:

- `app/api/**/route.ts` should only re-export handler functions.
- actual handlers live in `features/<domain>/api/*.ts`.
- route-local helper functions should move with the handler into the feature api module.

Example pattern:

```ts
// app/api/projects/route.ts
export { GET, POST, PUT, DELETE } from '@/features/projects/api/projects-route';
```

This keeps the App Router stable while the domain logic stays with the feature that owns it.

## Data Storage Model

The app does not use a database.

Local persistence lives in `data/*.json`:

- `projects.json`: project definitions and limits
- `buckets.json`: bucket metadata and deployment state
- `files.json`: tracked file metadata stored by the app
- `environments.json`: bootstrapped AWS region environments
- `settings.json`: user preferences and API keys
- `system.json`: onboarding and system-wide state

Use the filesystem helpers in `lib/filesystem.ts`:

- `readJsonFile`
- `appendToJsonFile`
- `updateInJsonFile`
- `deleteFromJsonFile`

Rules:

- never read or write JSON state directly from client components
- never import `fs` into client code
- keep validation close to the route handler or feature api module
- update types in `lib/types.ts` when stored shapes change

## Runtime Data Flow

The app works in this sequence:

1. A page wrapper in `app/` renders a feature screen.
2. The feature screen composes reusable feature components.
3. Feature hooks fetch or mutate through `/api/*` endpoints.
4. Thin route files re-export feature api handlers.
5. Feature api handlers use `lib/filesystem.ts`, `lib/aws.ts`, and AWS SDK clients.
6. Local JSON state is updated and returned to the client.
7. Infrastructure flows may also invoke CDK in `infrastructure/cdk/`.

## AWS and Infrastructure Rules

- CDK code lives in `infrastructure/cdk/`.
- each bucket stack is named `SCR-<s3BucketName>`.
- infrastructure execution is Windows-first; handle path and file-lock issues carefully.
- clean stale `synth.lock*` files in `cdk.out/` before running CDK commands.
- bucket names must remain globally unique.
- project deletion must stay blocked when buckets are still attached.

## Adding New Functionality

### Add a new dashboard page

1. Create the screen in `features/<domain>/components/`.
2. Add hooks in `features/<domain>/hooks/` if orchestration is needed.
3. Add pure helpers in `features/<domain>/utils/` if the screen has derived calculations.
4. Make `app/(dashboard)/.../page.tsx` a thin wrapper that returns the screen.
5. Keep shared visuals in `components/` only if another feature will reuse them.

### Add a new API endpoint

1. Create the handler in `features/<domain>/api/`.
2. Keep validation, parsing, and domain-specific helper logic near that handler.
3. Re-export the handler from `app/api/.../route.ts`.
4. Use `lib/filesystem.ts` for local data and `lib/aws.ts` or AWS SDK wrappers for AWS operations.
5. Return stable JSON shapes that match the consuming hooks.

### Add new persisted data

1. Decide whether it belongs in an existing `data/*.json` file or a new one.
2. Update `lib/types.ts` and relevant validation schemas.
3. Access it only through server code.
4. Add or update the feature api module that owns it.

## Boundaries and Ownership

Use these rules when deciding where code belongs:

- belongs to one domain and one route: keep it in that feature
- shared by multiple domains: move to `components/` or `lib/`
- purely visual and reusable: `components/`
- route handlers and server orchestration: `features/<domain>/api/`
- client stateful orchestration: `features/<domain>/hooks/`
- formatting, aggregation, mapping, constants: `features/<domain>/utils/`
- AWS wrappers or cross-domain primitives: `lib/`

## Rules to Follow

### Do

- keep `app/` thin
- keep `app/api/` thin
- follow feature ownership strictly
- use `APP_CONFIG` from `lib/config.ts` for branding
- use centralized types and validations
- preserve the existing shadcn/ui and dashboard visual language
- validate changes with focused error or type checks after refactors

### Do not

- do not rebuild business logic inside route wrappers or page wrappers
- do not put file I/O in client components
- do not hardcode app branding
- do not scatter AWS command logic across unrelated features
- do not bypass the feature structure for convenience
- do not delete projects with attached buckets

## Practical Refactor Standard

When cleaning or extending the codebase, the desired end state is:

- `app/**/page.tsx` only returns a feature screen
- `app/api/**/route.ts` only re-exports feature handlers
- feature folders own their UI, hooks, api handlers, and utils
- shared code is promoted intentionally, not by accident

If new work does not preserve that shape, it is probably going in the wrong place.
