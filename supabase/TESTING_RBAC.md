# Testing Guide for RBAC Schema Migration

This guide provides SQL queries and steps to test the role-based access control (RBAC) schema that was just applied.

## Prerequisites

- Migration has been applied successfully
- Access to Supabase Dashboard SQL Editor
- At least one user account created in `auth.users`

---

## 1. Verify Schema Creation

Run these queries to verify the schema was created correctly:

```sql
-- Check if enum type exists
SELECT enum_range(NULL::user_role);

-- Verify profiles table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'profiles';

-- Verify index was created
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename = 'profiles';

-- Check all policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- Verify helper function exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_user_role';
```

---

## 2. Verify Existing Users Have Profiles

If you already have users in `auth.users`, check if they have corresponding profiles:

```sql
-- View all users and their profiles
SELECT 
  u.id,
  u.email,
  u.created_at as user_created_at,
  p.full_name,
  p.role,
  p.created_at as profile_created_at,
  CASE 
    WHEN p.id IS NULL THEN 'MISSING PROFILE'
    ELSE 'OK'
  END as status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC;
```

**If profiles are missing:** The trigger only works for NEW users. For existing users, you'll need to create profiles manually:

```sql
-- Create profiles for existing users (run as superuser/service role)
INSERT INTO public.profiles (id, role)
SELECT id, 'user'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);
```

---

## 3. Test Automatic Profile Creation

1. **Create a new test user** via your app's signup or via the Supabase Dashboard Authentication section
2. **Verify profile was created automatically:**

```sql
-- Check the newest user and their profile
SELECT 
  u.id,
  u.email,
  u.created_at as user_created_at,
  p.id as profile_id,
  p.role,
  p.created_at as profile_created_at,
  EXTRACT(EPOCH FROM (p.created_at - u.created_at)) as time_diff_seconds
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 5;
```

The `time_diff_seconds` should be very small (< 1 second), indicating the trigger fired immediately.

---

## 4. Test Role Assignment

### 4a. Set Up Test Users with Different Roles

**Option 1: Via SQL Editor (requires service role)**
```sql
-- Get a user ID first
SELECT id, email FROM auth.users LIMIT 1;

-- Then set their role (replace <user-id> with actual UUID)
UPDATE public.profiles 
SET role = 'admin' 
WHERE id = '<user-id>';

-- Or set to responder
UPDATE public.profiles 
SET role = 'responder' 
WHERE id = '<user-id>';

-- Verify role was updated
SELECT id, email, role 
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
WHERE u.id = '<user-id>';
```

**Option 2: Via Supabase Dashboard**
1. Go to Authentication > Users
2. Find a user and note their UUID
3. Go to Table Editor > profiles
4. Update the `role` field for that user

### 4b. Verify Roles

```sql
-- View all users with their roles
SELECT 
  u.email,
  p.role,
  p.full_name,
  p.created_at
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
ORDER BY p.role, u.created_at;
```

---

## 5. Test Row-Level Security Policies

RLS policies can only be properly tested when authenticated as different users. Here's how to test:

### 5a. Test as Regular User (using Supabase client)

**In your application code or via Supabase client:**

1. **Sign in as a regular user** (role = 'user')
2. **Try to read own profile:**
```javascript
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId) // Should succeed
```

3. **Try to read another user's profile:**
```javascript
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', otherUserId) // Should fail or return empty
```

4. **Try to update own profile:**
```javascript
const { data, error } = await supabase
  .from('profiles')
  .update({ full_name: 'Test Name' })
  .eq('id', userId) // Should succeed
```

5. **Try to update another user's profile:**
```javascript
const { data, error } = await supabase
  .from('profiles')
  .update({ full_name: 'Hacked Name' })
  .eq('id', otherUserId) // Should fail
```

### 5b. Test as Admin User

1. **Sign in as an admin user** (role = 'admin')
2. **Try to read any profile:**
```javascript
const { data, error } = await supabase
  .from('profiles')
  .select('*') // Should return all profiles
```

3. **Try to update any profile:**
```javascript
const { data, error } = await supabase
  .from('profiles')
  .update({ full_name: 'Admin Updated' })
  .eq('id', anyUserId) // Should succeed
```

### 5c. Test as Responder User

1. **Sign in as a responder** (role = 'responder')
2. **Try to read profiles:**
```javascript
const { data, error } = await supabase
  .from('profiles')
  .select('*') // Should be able to read all profiles (for viewing user info on alerts)
```

---

## 6. Test Helper Function

Test the `get_user_role()` function:

```sql
-- This will show the role for the current authenticated user
-- In SQL Editor, this runs with service role, so it may return NULL
-- The function is designed to work with authenticated requests

-- Test that function exists and returns correct type
SELECT public.get_user_role();

-- For authenticated requests, use it in RLS context
-- It will be tested automatically when RLS policies are evaluated
```

**Note:** The `get_user_role()` function requires an authenticated user context (`auth.uid()`). In the SQL Editor, it may return NULL because you're running as service role. It will work correctly in your application code when users are authenticated.

---

## 7. Test Trigger Function

Test that the `updated_at` trigger works:

```sql
-- Update a profile and check if updated_at changed
SELECT id, full_name, updated_at 
FROM public.profiles 
LIMIT 1;

-- Update it (replace <profile-id> with actual UUID)
UPDATE public.profiles 
SET full_name = 'Test Update ' || NOW()::text
WHERE id = '<profile-id>';

-- Check updated_at was automatically updated
SELECT id, full_name, updated_at 
FROM public.profiles 
WHERE id = '<profile-id>';
```

The `updated_at` timestamp should have changed.

---

## 8. Comprehensive Test Checklist

- [ ] Enum type `user_role` exists with all three values
- [ ] `profiles` table exists with all columns
- [ ] Index on `role` column exists
- [ ] RLS is enabled on `profiles` table
- [ ] All 7 RLS policies are created
- [ ] `get_user_role()` function exists
- [ ] `handle_new_user()` trigger function exists
- [ ] `on_auth_user_created` trigger exists
- [ ] `handle_updated_at()` trigger function exists
- [ ] `set_updated_at` trigger exists
- [ ] New users automatically get profiles created
- [ ] Users can read their own profile
- [ ] Users CANNOT read other users' profiles
- [ ] Users can update their own profile
- [ ] Users CANNOT update other users' profiles
- [ ] Admins can read all profiles
- [ ] Admins can update all profiles
- [ ] Responders can read all profiles
- [ ] `updated_at` auto-updates on profile changes

---

## 9. Quick Verification Query

Run this single query to get an overview of your RBAC setup:

```sql
SELECT 
  'Enum Types' as component,
  COUNT(*)::text as status
FROM pg_type 
WHERE typname = 'user_role'
UNION ALL
SELECT 
  'Profiles Table' as component,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') 
    THEN 'EXISTS' 
    ELSE 'MISSING' 
  END as status
UNION ALL
SELECT 
  'RLS Enabled' as component,
  CASE WHEN (SELECT rowsecurity FROM pg_tables WHERE tablename = 'profiles' AND schemaname = 'public')
    THEN 'ENABLED' 
    ELSE 'DISABLED' 
  END as status
UNION ALL
SELECT 
  'Policies Count' as component,
  COUNT(*)::text as status
FROM pg_policies 
WHERE tablename = 'profiles'
UNION ALL
SELECT 
  'Users with Profiles' as component,
  COUNT(*)::text || ' / ' || (SELECT COUNT(*) FROM auth.users)::text as status
FROM public.profiles;
```

---

## 10. Common Issues and Solutions

### Issue: Profiles not created for existing users
**Solution:** Run the manual profile creation query from section 2.

### Issue: RLS policies blocking all access
**Solution:** Check that policies are created correctly with the verification queries in section 1.

### Issue: `get_user_role()` returns NULL
**Solution:** This is expected in SQL Editor (service role). Test with authenticated requests in your app.

### Issue: Cannot update role in dashboard
**Solution:** Make sure you're using the Table Editor with appropriate permissions, or use SQL Editor with service role.

---

## Next Steps

After verifying everything works:

1. **Regenerate TypeScript types:**
   ```bash
   npx supabase gen types typescript --project-id <PROJECT_ID> > packages/types/src/supabase.ts
   ```

2. **Update your application code** to use the profiles table and roles

3. **Create alerts/reports tables** with the RLS policies documented in the migration file

4. **Set initial admin users** via the SQL Editor

