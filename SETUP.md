# Quick Setup Guide

## 1. Install Dependencies

```bash
pnpm install
```

## 2. Set Up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Get your credentials from Project Settings > API

## 3. Configure Environment Variables

**Web app** - Create `apps/web/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Mobile app** - Create `apps/mobile/.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 4. Generate Supabase Types

After setting up your database:

```bash
npx supabase gen types typescript --project-id <PROJECT_ID> > packages/types/src/supabase.ts
```

## 5. Run Development Servers

```bash
pnpm dev
```

This starts:
- Web app: http://localhost:3000
- Mobile app: Expo dev server (scan QR code with Expo Go app)

## Next Steps

- Create database migrations in `supabase/migrations/`
- Implement authentication in both apps
- Add your features!

See [README.md](./README.md) for more details.

