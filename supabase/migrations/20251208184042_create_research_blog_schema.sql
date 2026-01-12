/*
  # Research Collaboration Blog Schema

  ## Overview
  Complete database schema for a research collaboration platform with authentication,
  articles, collaboration features, and user profiles.

  ## New Tables Created

  ### 1. profiles
  Extended user profile information
  - `id` (uuid, primary key) - References auth.users
  - `email` (text) - User email
  - `full_name` (text) - User's full name
  - `avatar_url` (text, nullable) - Profile picture URL
  - `bio` (text, nullable) - User biography
  - `institution` (text, nullable) - Research institution/affiliation
  - `research_interests` (text[], nullable) - Array of research interests
  - `website` (text, nullable) - Personal/professional website
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last profile update

  ### 2. articles
  Research articles and blog posts
  - `id` (uuid, primary key) - Unique article identifier
  - `title` (text) - Article title
  - `slug` (text, unique) - URL-friendly slug
  - `content` (text) - Article content (markdown/rich text)
  - `excerpt` (text, nullable) - Short summary
  - `cover_image` (text, nullable) - Cover image URL
  - `status` (text) - Publication status: draft, published, archived
  - `created_by` (uuid) - Primary author (references profiles)
  - `published_at` (timestamptz, nullable) - Publication timestamp
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  - `views_count` (integer) - View counter

  ### 3. article_authors
  Multiple authors per article (collaboration)
  - `id` (uuid, primary key)
  - `article_id` (uuid) - References articles
  - `profile_id` (uuid) - References profiles
  - `role` (text) - Author role: primary, contributor
  - `created_at` (timestamptz)

  ### 4. comments
  Article comments and discussions
  - `id` (uuid, primary key)
  - `article_id` (uuid) - References articles
  - `profile_id` (uuid) - Comment author
  - `content` (text) - Comment text
  - `parent_id` (uuid, nullable) - For nested replies
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 5. article_tags
  Tags for categorizing articles
  - `id` (uuid, primary key)
  - `article_id` (uuid) - References articles
  - `tag` (text) - Tag name
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Policies for authenticated users to manage their own content
  - Public read access for published articles
  - Author-only write access for articles and comments
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  avatar_url text,
  bio text,
  institution text,
  research_interests text[],
  website text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create articles table
CREATE TABLE IF NOT EXISTS articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  content text NOT NULL,
  excerpt text,
  cover_image text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  views_count integer DEFAULT 0
);

-- Create article_authors table for collaboration
CREATE TABLE IF NOT EXISTS article_authors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'contributor' CHECK (role IN ('primary', 'contributor')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(article_id, profile_id)
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  parent_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create article_tags table
CREATE TABLE IF NOT EXISTS article_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  tag text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(article_id, tag)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_articles_created_by ON articles(created_by);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_article_authors_article ON article_authors(article_id);
CREATE INDEX IF NOT EXISTS idx_article_authors_profile ON article_authors(profile_id);
CREATE INDEX IF NOT EXISTS idx_comments_article ON comments(article_id);
CREATE INDEX IF NOT EXISTS idx_comments_profile ON comments(profile_id);
CREATE INDEX IF NOT EXISTS idx_article_tags_article ON article_tags(article_id);
CREATE INDEX IF NOT EXISTS idx_article_tags_tag ON article_tags(tag);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_tags ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Articles policies
CREATE POLICY "Published articles are viewable by everyone"
  ON articles FOR SELECT
  USING (status = 'published' OR created_by = auth.uid());

CREATE POLICY "Authenticated users can create articles"
  ON articles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authors can update their own articles"
  ON articles FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM article_authors 
      WHERE article_id = articles.id 
      AND profile_id = auth.uid()
    )
  )
  WITH CHECK (
    created_by = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM article_authors 
      WHERE article_id = articles.id 
      AND profile_id = auth.uid()
    )
  );

CREATE POLICY "Authors can delete their own articles"
  ON articles FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Article authors policies
CREATE POLICY "Article authors are viewable by everyone"
  ON article_authors FOR SELECT
  USING (true);

CREATE POLICY "Article creators can add authors"
  ON article_authors FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM articles 
      WHERE id = article_id 
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Article creators can remove authors"
  ON article_authors FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM articles 
      WHERE id = article_id 
      AND created_by = auth.uid()
    )
  );

-- Comments policies
CREATE POLICY "Comments are viewable by everyone for published articles"
  ON comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM articles 
      WHERE id = article_id 
      AND status = 'published'
    )
  );

CREATE POLICY "Authenticated users can create comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update their own comments"
  ON comments FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
  ON comments FOR DELETE
  TO authenticated
  USING (profile_id = auth.uid());

-- Article tags policies
CREATE POLICY "Article tags are viewable by everyone"
  ON article_tags FOR SELECT
  USING (true);

CREATE POLICY "Article authors can add tags"
  ON article_tags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM articles 
      WHERE id = article_id 
      AND (created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM article_authors 
        WHERE article_id = articles.id 
        AND profile_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Article authors can delete tags"
  ON article_tags FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM articles 
      WHERE id = article_id 
      AND (created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM article_authors 
        WHERE article_id = articles.id 
        AND profile_id = auth.uid()
      ))
    )
  );

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();