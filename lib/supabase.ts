import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types
export interface Profile {
  id: string;  // Changed from uuid to string for Clerk
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio?: string | null;
  institution?: string | null;
  website?: string | null;
  research_interests?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface Article {
  id: string;  // UUID as string
  title: string;
  slug: string;
  content?: string;
  excerpt?: string;
  cover_image?: string;
  status: 'draft' | 'published' | 'archived';
  published_at?: string;
  created_by: string;  // Changed to string for Clerk user ID
  created_at?: string;
  updated_at?: string;
  views_count?: number;
}

export interface Comment {
  id: string;
  article_id: string;
  profile_id: string;
  content: string;
  parent_id?: string | null;
  created_at?: string;
  updated_at?: string;
  profile?: Profile;
}

export interface ArticleAuthor {
  id: string;
  article_id: string;
  profile_id: string;
  role: 'primary' | 'contributor';
  created_at?: string;
}

export interface ArticleTag {
  id: string;
  article_id: string;
  tag: string;
  created_at?: string;
}

export interface Conversation {
  id: string;
  created_at?: string;
  updated_at?: string;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  profile_id: string;
  joined_at?: string;
  last_read_at?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at?: string;
  updated_at?: string;
  sender?: Profile;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  cover_image?: string;
  privacy: 'public' | 'private';
  post_approval_required: boolean;
  created_by: string;
  created_at?: string;
  updated_at?: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  profile_id: string;
  role: 'admin' | 'moderator' | 'member';
  joined_at?: string;
}

export interface GroupPost {
  id: string;
  group_id: string;
  author_id: string;
  content: string;
  media_type?: 'image' | 'video' | 'pdf' | 'article';
  media_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at?: string;
  updated_at?: string;
}

export interface GroupPostComment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at?: string;
  updated_at?: string;
}

export interface GroupPostLike {
  id: string;
  post_id: string;
  profile_id: string;
  created_at?: string;
}