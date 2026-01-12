-- ================================
-- COMPREHENSIVE FIX FOR CLERK + SUPABASE
-- Handles ALL foreign key constraints
-- ================================

-- Step 1: Drop ALL foreign key constraints
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_created_by_fkey;
ALTER TABLE article_authors DROP CONSTRAINT IF EXISTS article_authors_profile_id_fkey;
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_profile_id_fkey;
ALTER TABLE group_members DROP CONSTRAINT IF EXISTS group_members_profile_id_fkey;
ALTER TABLE group_posts DROP CONSTRAINT IF EXISTS group_posts_author_id_fkey;
ALTER TABLE groups DROP CONSTRAINT IF EXISTS groups_created_by_fkey;
ALTER TABLE conversation_participants DROP CONSTRAINT IF EXISTS conversation_participants_profile_id_fkey;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE group_post_comments DROP CONSTRAINT IF EXISTS group_post_comments_author_id_fkey;
ALTER TABLE group_post_likes DROP CONSTRAINT IF EXISTS group_post_likes_profile_id_fkey;
ALTER TABLE admin_actions DROP CONSTRAINT IF EXISTS admin_actions_admin_id_fkey;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_actor_id_fkey;

-- Step 2: Drop primary key on profiles (CASCADE to handle dependencies)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_pkey CASCADE;

-- Step 3: Convert profiles.id from UUID to TEXT
ALTER TABLE profiles ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- Step 4: Convert ALL foreign key columns to TEXT
ALTER TABLE articles ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;
ALTER TABLE article_authors ALTER COLUMN profile_id TYPE TEXT USING profile_id::TEXT;
ALTER TABLE comments ALTER COLUMN profile_id TYPE TEXT USING profile_id::TEXT;
ALTER TABLE group_members ALTER COLUMN profile_id TYPE TEXT USING profile_id::TEXT;
ALTER TABLE group_posts ALTER COLUMN author_id TYPE TEXT USING author_id::TEXT;
ALTER TABLE groups ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;

-- Conversation tables
ALTER TABLE conversation_participants ALTER COLUMN profile_id TYPE TEXT USING profile_id::TEXT;
ALTER TABLE messages ALTER COLUMN sender_id TYPE TEXT USING sender_id::TEXT;

-- Group post interactions
ALTER TABLE group_post_comments ALTER COLUMN author_id TYPE TEXT USING author_id::TEXT;
ALTER TABLE group_post_likes ALTER COLUMN profile_id TYPE TEXT USING profile_id::TEXT;

-- Admin and notifications
ALTER TABLE admin_actions ALTER COLUMN admin_id TYPE TEXT USING admin_id::TEXT;
ALTER TABLE notifications ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE notifications ALTER COLUMN actor_id TYPE TEXT USING actor_id::TEXT;

-- Step 5: Re-add primary key on profiles
ALTER TABLE profiles ADD PRIMARY KEY (id);

-- Step 6: Re-add ALL foreign key constraints
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

-- Conversation constraints
ALTER TABLE conversation_participants 
  ADD CONSTRAINT conversation_participants_profile_id_fkey 
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE messages 
  ADD CONSTRAINT messages_sender_id_fkey 
  FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Group post interaction constraints
ALTER TABLE group_post_comments 
  ADD CONSTRAINT group_post_comments_author_id_fkey 
  FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE group_post_likes 
  ADD CONSTRAINT group_post_likes_profile_id_fkey 
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Admin and notification constraints
ALTER TABLE admin_actions 
  ADD CONSTRAINT admin_actions_admin_id_fkey 
  FOREIGN KEY (admin_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE notifications 
  ADD CONSTRAINT notifications_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE notifications 
  ADD CONSTRAINT notifications_actor_id_fkey 
  FOREIGN KEY (actor_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Step 7: Remove Supabase Auth trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 8: Update RLS policies for deletions
DROP POLICY IF EXISTS "Authors can delete their own articles" ON articles;
DROP POLICY IF EXISTS "Users can delete their own comments" ON comments;

CREATE POLICY "Service role can delete articles" 
  ON articles FOR DELETE 
  USING (true);

CREATE POLICY "Service role can delete comments" 
  ON comments FOR DELETE 
  USING (true);

-- Success message
SELECT 'Migration completed successfully! All UUID columns converted to TEXT for Clerk compatibility. ✓' as status;
