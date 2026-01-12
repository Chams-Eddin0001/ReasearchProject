-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.article_authors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL,
  profile_id text NOT NULL,
  role text NOT NULL DEFAULT 'contributor'::text CHECK (role = ANY (ARRAY['primary'::text, 'contributor'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT article_authors_pkey PRIMARY KEY (id),
  CONSTRAINT article_authors_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id),
  CONSTRAINT article_authors_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.article_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL,
  profile_id text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT article_likes_pkey PRIMARY KEY (id),
  CONSTRAINT article_likes_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id),
  CONSTRAINT article_likes_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.article_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL,
  tag text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT article_tags_pkey PRIMARY KEY (id),
  CONSTRAINT article_tags_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id)
);
CREATE TABLE public.articles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  content text NOT NULL,
  excerpt text,
  cover_image text,
  status text NOT NULL DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])),
  created_by text NOT NULL,
  published_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  views_count integer DEFAULT 0,
  CONSTRAINT articles_pkey PRIMARY KEY (id),
  CONSTRAINT articles_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.comment_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL,
  profile_id text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT comment_likes_pkey PRIMARY KEY (id),
  CONSTRAINT comment_likes_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id),
  CONSTRAINT comment_likes_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL,
  profile_id text NOT NULL,
  content text NOT NULL,
  parent_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT comments_pkey PRIMARY KEY (id),
  CONSTRAINT comments_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id),
  CONSTRAINT comments_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id),
  CONSTRAINT comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.comments(id)
);
CREATE TABLE public.conversation_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  profile_id text NOT NULL,
  joined_at timestamp with time zone DEFAULT now(),
  last_read_at timestamp with time zone DEFAULT now(),
  CONSTRAINT conversation_participants_pkey PRIMARY KEY (id),
  CONSTRAINT conversation_participants_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id),
  CONSTRAINT conversation_participants_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT conversations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.group_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  profile_id text NOT NULL,
  role text NOT NULL DEFAULT 'member'::text CHECK (role = ANY (ARRAY['admin'::text, 'moderator'::text, 'member'::text])),
  joined_at timestamp with time zone DEFAULT now(),
  CONSTRAINT group_members_pkey PRIMARY KEY (id),
  CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id),
  CONSTRAINT group_members_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.group_post_comment_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL,
  profile_id text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT group_post_comment_likes_pkey PRIMARY KEY (id),
  CONSTRAINT group_post_comment_likes_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.group_post_comments(id),
  CONSTRAINT group_post_comment_likes_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.group_post_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  author_id text NOT NULL,
  content text NOT NULL,
  parent_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT group_post_comments_pkey PRIMARY KEY (id),
  CONSTRAINT group_post_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.group_posts(id),
  CONSTRAINT group_post_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id),
  CONSTRAINT group_post_comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.group_post_comments(id)
);
CREATE TABLE public.group_post_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  profile_id text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT group_post_likes_pkey PRIMARY KEY (id),
  CONSTRAINT group_post_likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.group_posts(id),
  CONSTRAINT group_post_likes_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.group_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  author_id text NOT NULL,
  content text NOT NULL,
  media_type text CHECK (media_type = ANY (ARRAY['image'::text, 'video'::text, 'pdf'::text, 'article'::text])),
  media_url text,
  status text NOT NULL DEFAULT 'approved'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT group_posts_pkey PRIMARY KEY (id),
  CONSTRAINT group_posts_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id),
  CONSTRAINT group_posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  cover_image text,
  privacy text NOT NULL DEFAULT 'public'::text CHECK (privacy = ANY (ARRAY['public'::text, 'private'::text])),
  post_approval_required boolean DEFAULT false,
  created_by text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT groups_pkey PRIMARY KEY (id),
  CONSTRAINT groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.media_files (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  file_path text NOT NULL UNIQUE,
  file_type text NOT NULL CHECK (file_type = ANY (ARRAY['image'::text, 'video'::text, 'pdf'::text])),
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  uploaded_by text NOT NULL,
  bucket_name text NOT NULL,
  entity_type text CHECK (entity_type = ANY (ARRAY['profile'::text, 'article'::text, 'group_post'::text])),
  entity_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT media_files_pkey PRIMARY KEY (id),
  CONSTRAINT media_files_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.mentions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  mentioned_profile_id text NOT NULL,
  mentioner_profile_id text NOT NULL,
  entity_type text NOT NULL CHECK (entity_type = ANY (ARRAY['article'::text, 'comment'::text, 'group_post'::text, 'group_post_comment'::text])),
  entity_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT mentions_pkey PRIMARY KEY (id),
  CONSTRAINT mentions_mentioned_profile_id_fkey FOREIGN KEY (mentioned_profile_id) REFERENCES public.profiles(id),
  CONSTRAINT mentions_mentioner_profile_id_fkey FOREIGN KEY (mentioner_profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  sender_id text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  actor_id text,
  type text NOT NULL CHECK (type = ANY (ARRAY['comment'::text, 'reply'::text, 'mention'::text, 'group_invite'::text, 'group_accept'::text, 'group_post'::text, 'message'::text, 'like'::text, 'article_published'::text, 'admin_action'::text])),
  content text NOT NULL,
  link text,
  read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT notifications_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.profiles (
  id text NOT NULL,
  email text,
  full_name text,
  avatar_url text,
  bio text,
  institution text,
  research_interests ARRAY,
  website text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);