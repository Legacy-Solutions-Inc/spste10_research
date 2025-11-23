# SPSTE10 Research - Turborepo Monorepo

A Turborepo monorepo for a school project with two apps sharing a Supabase backend and shared TypeScript types.

## Project Structure

```
repo-root/
├─ apps/
│  ├─ web/          # Next.js web app (App Router + Tailwind + shadcn/ui)
│  └─ mobile/        # React Native app (Expo + NativeWind)
├─ packages/
│  ├─ types/         # Shared TypeScript types (Supabase DB types)
│  ├─ core/          # Shared utilities (Supabase clients)
│  └─ config/        # Shared configs (TypeScript, ESLint, Prettier)
├─ supabase/
│  ├─ migrations/    # Database migrations
│  └─ seed.sql       # Seed data
├─ turbo.json        # Turborepo configuration
├─ package.json      # Root workspace configuration
└─ tsconfig.json     # Root TypeScript configuration
```

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0 (recommended) or npm/yarn
- A Supabase project ([create one here](https://supabase.com))

## Installation

1. **Install dependencies:**

```bash
# Using pnpm (recommended)
pnpm install

# Or using npm
npm install

# Or using yarn
yarn install
```

2. **Set up Supabase:**

   - Create a project at [supabase.com](https://supabase.com)
   - Get your project URL and anon key from Project Settings > API

3. **Configure environment variables:**

   **Web app** (`apps/web/.env.local`):
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

   **Mobile app** (`apps/mobile/.env`):
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Generate Supabase types:**

   After setting up your database schema, generate TypeScript types:

   ```bash
   # For hosted Supabase
   npx supabase gen types typescript --project-id <PROJECT_ID> > packages/types/src/supabase.ts

   # Or for local Supabase
   npx supabase gen types typescript --local > packages/types/src/supabase.ts
   ```

## How to Run

### Development

Run all apps in development mode:

```bash
pnpm dev
```

This will start:
- Web app at `http://localhost:3000`
- Mobile app (Expo dev server)

### Run Individual Apps

**Web app:**
```bash
cd apps/web
pnpm dev
```

**Mobile app:**
```bash
cd apps/mobile
pnpm dev
```

### Build

Build all apps:

```bash
pnpm build
```

### Lint

Lint all apps:

```bash
pnpm lint
```

### Type Check

Type check all apps:

```bash
pnpm typecheck
```

## Workspace Aliases

The monorepo uses workspace aliases for shared packages:

```typescript
// Import shared types
import type { Database } from "@repo/types";

// Import shared Supabase clients
import { supabaseWeb, supabaseMobile } from "@repo/core";
```

## Apps

### Web App (`apps/web`)

- **Framework:** Next.js 14 (App Router)
- **Styling:** TailwindCSS + shadcn/ui
- **Auth:** Supabase SSR helpers
- **Features:**
  - Server-side Supabase client (`src/lib/supabaseServer.ts`)
  - Browser Supabase client (`src/lib/supabaseBrowser.ts`)
  - Session-based authentication
  - Placeholder login and home pages

### Mobile App (`apps/mobile`)

- **Framework:** React Native via Expo
- **Styling:** NativeWind (Tailwind for React Native)
- **Navigation:** React Navigation
- **Auth:** Supabase client
- **Features:**
  - Supabase client setup (`src/lib/supabase.ts`)
  - React Navigation stack navigator
  - Placeholder login and home screens

## Packages

### `@repo/types`

Shared TypeScript types, primarily Supabase database types.

**Usage:**
```typescript
import type { Database } from "@repo/types";
```

**Regenerating types:**
After database migrations, regenerate types using the Supabase CLI (see Installation step 4).

### `@repo/core`

Shared utilities and Supabase clients.

**Exports:**
- `supabaseWeb` - Supabase client for web (uses `NEXT_PUBLIC_*` env vars)
- `supabaseMobile` - Supabase client for mobile (uses `EXPO_PUBLIC_*` env vars)

**Usage:**
```typescript
import { supabaseWeb } from "@repo/core";
// or
import { supabaseMobile } from "@repo/core";
```

### `@repo/config`

Shared configuration files:
- `tsconfig.base.json` - Base TypeScript configuration
- `eslint.js` - ESLint configuration
- `prettier.config.js` - Prettier configuration

## Supabase Setup

See [supabase/README.md](./supabase/README.md) for detailed Supabase setup instructions.

### Quick Start

1. Create migrations in `supabase/migrations/`
2. Apply migrations to your Supabase project
3. Regenerate types (see Installation step 4)
4. Both apps will now have typed access to your database

## Adding shadcn/ui Components

To add shadcn/ui components to the web app:

```bash
cd apps/web
npx shadcn-ui@latest add <component-name>
```

Components will be added to `apps/web/src/components/ui/`.

## Troubleshooting

### Type errors after database changes

Regenerate Supabase types:
```bash
npx supabase gen types typescript --project-id <PROJECT_ID> > packages/types/src/supabase.ts
```

### Workspace dependencies not found

Make sure you've run `pnpm install` at the root level.

### Environment variables not loading

- Web app: Ensure `.env.local` exists in `apps/web/`
- Mobile app: Ensure `.env` exists in `apps/mobile/` and restart Expo

## Tech Stack

- **Monorepo:** Turborepo
- **Web:** Next.js 14, TypeScript, TailwindCSS, shadcn/ui
- **Mobile:** React Native (Expo), TypeScript, NativeWind
- **Backend:** Supabase (Auth + Database)
- **Package Manager:** pnpm (workspaces)

## License

Private - School Project
