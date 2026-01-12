-- Fix schema to support Clerk string IDs instead of Supabase UUIDs
-- This migration changes ID columns from UUID to TEXT to support Clerk

-- Step 1: Drop existing foreign key constraints
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_created_by_fkey;
ALTER TABLE article_authors DROP CONSTRAINT IF EXISTS article_authors_profile_id_fkey;
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_profile_id_fkey;
ALTER TABLE group_members DROP CONSTRAINT IF EXISTS group_members_profile_id_fkey;
ALTER TABLE group_posts DROP CONSTRAINT IF EXISTS group_posts_author_id_fkey;

-- Step 2: Drop the primary key constraint on profiles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_pkey;

-- Step 3: Change profiles.id from UUID to TEXT
ALTER TABLE profiles ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- Step 4: Change all foreign key columns to TEXT
ALTER TABLE articles ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;
ALTER TABLE article_authors ALTER COLUMN profile_id TYPE TEXT USING profile_id::TEXT;
ALTER TABLE comments ALTER COLUMN profile_id TYPE TEXT USING profile_id::TEXT;
ALTER TABLE group_members ALTER COLUMN profile_id TYPE TEXT USING profile_id::TEXT;
ALTER TABLE group_posts ALTER COLUMN author_id TYPE TEXT USING author_id::TEXT;
ALTER TABLE groups ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;

-- Step 5: Re-add primary key constraint
ALTER TABLE profiles ADD PRIMARY KEY (id);

-- Step 6: Re-add foreign key constraints
ALTER TABLE articles 
  ADD CONSTRAINT articles_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE article_authors 
  ADD CONSTRAINT article_authors_profile_id_fkey 
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE comments 
  ADD CONSTRAINT comments_profile_id_fkey 
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE group_members 
  ADD CONSTRAINT group_members_profile_id_fkey 
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE group_posts 
  ADD CONSTRAINT group_posts_author_id_fkey 
  FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE groups 
  ADD CONSTRAINT groups_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;

-- Step 7: Drop the auth.users trigger since we're not using Supabase auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 8: Update RLS policies to work without auth.uid()
-- Since Clerk handles auth, we'll keep RLS but make policies more permissive
-- The API routes handle the actual authorization

-- Drop old policies
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Authors can update their own articles" ON articles;
DROP POLICY IF EXISTS "Authors can delete their own articles" ON articles;
DROP POLICY IF EXISTS "Authenticated users can create articles" ON articles;
DROP POLICY IF EXISTS "Users can update their own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON comments;

-- Create new simpler policies (authorization happens in API routes)
CREATE POLICY "Anyone can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update profiles"
  ON profiles FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone authenticated can create articles"
  ON articles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update articles"
  ON articles FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete articles"
  ON articles FOR DELETE
  USING (true);

CREATE POLICY "Anyone authenticated can create comments"
  ON comments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update comments"
  ON comments FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete comments"
  ON comments FOR DELETE
  USING (true);
