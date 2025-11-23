# Supabase Backend

This directory contains Supabase database migrations and seed data.

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com)

2. **Get your project credentials:**
   - Project URL: Found in Project Settings > API
   - Anon Key: Found in Project Settings > API

3. **Add credentials to your apps:**
   - `apps/web/.env.local` - Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `apps/mobile/.env` - Add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Migrations

Create migration files in the `migrations/` directory.

### Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref <your-project-ref>

# Create a new migration
supabase migration new <migration_name>

# Apply migrations
supabase db push
```

### Manual Migration Files

You can also create migration files manually following the naming pattern:
`YYYYMMDDHHMMSS_migration_name.sql`

## Generating Types

After creating or updating your database schema, regenerate TypeScript types:

```bash
# For hosted Supabase
npx supabase gen types typescript --project-id <PROJECT_ID> > packages/types/src/supabase.ts

# For local Supabase
npx supabase gen types typescript --local > packages/types/src/supabase.ts
```

## Seed Data

The `seed.sql` file contains example seed data that runs after migrations when using `supabase db reset`.

## Row Level Security (RLS)

Always enable RLS on your tables and create appropriate policies. See `seed.sql` for examples.

