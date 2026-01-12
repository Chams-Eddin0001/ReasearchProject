# TypeScript Type Updates

## Article Interface Updated

Added new fields to support media attachments:

```typescript
export interface Article {
  id: string;
  title: string;
  slug: string;
  content?: string;
  excerpt?: string;
  cover_image?: string;
  media_type?: 'video' | 'pdf' | null;  // NEW
  media_url?: string | null;            // NEW
  status: 'draft' | 'published' | 'archived';
  published_at?: string;
  created_by: string;
  created_at?: string;
  updated_at?: string;
  views_count?: number;
}
```

## Changes Made

### File: `lib/supabase.ts`

**Added:**
- `media_type?: 'video' | 'pdf' | null` - Type of attached media
- `media_url?: string | null` - URL to the media file

These fields match the database schema columns added in `advanced-features.sql`

## Usage

Now the Article type correctly supports:

```typescript
// Creating article with media
const article: Article = {
  title: "My Article",
  content: "...",
  media_type: "video",
  media_url: "https://storage.example.com/video.mp4",
  // ... other fields
};

// Type-safe media display
<ArticleMedia 
  mediaType={article.media_type}
  mediaUrl={article.media_url}
/>
```

## Build Status

✅ TypeScript compilation should now pass
✅ All type checking will work correctly
✅ IntelliSense will show the new fields

Run: `npm run build`
