# Quick Start Guide - Advanced Features

## 🚀 Get Started in 3 Steps

### Step 1: Create Your First Article
```
Navigate to: /articles/new
```

### Step 2: Try the Features
1. **Mention a friend**: Type `@` in the content area
2. **Attach media**: Use the Video or PDF tabs
3. **Publish**: Click "Publish Article"

### Step 3: Test Comments
1. View your published article
2. Add a comment with `@mention`
3. Reply to create nested threads

---

## 📝 Component Import Quick Reference

```tsx
// Article creation
import { ArticleCreator } from '@/components/articles';

// Display media
import { ArticleMedia } from '@/components/articles';

// Comments with mentions
import { CommentSection } from '@/components/comments';

// Mention input (standalone)
import { MentionTextarea } from '@/components/mentions/MentionTextarea';

// File upload (standalone)
import { FileUpload } from '@/components/upload/FileUpload';
```

---

## 🔌 API Endpoints Quick Reference

### Create Article
```typescript
POST /api/articles
{
  title: string
  content: string
  media_type?: 'video' | 'pdf'
  media_url?: string
  mentions?: string[] // User IDs
  status: 'draft' | 'published'
}
```

### Create Comment
```typescript
POST /api/comments
{
  article_id: string
  content: string
  parent_id?: string // For replies
  mentions?: string[] // User IDs
}
```

### Upload File
```typescript
POST /api/upload
FormData {
  file: File
  type: 'video' | 'pdf' | 'image'
  entityType: 'article'
}
```

---

## 🗂️ Database Tables

### articles
- `media_type` - 'video' or 'pdf'
- `media_url` - Public URL from Supabase Storage

### mentions
- `mentioned_profile_id` - Who was mentioned
- `mentioner_profile_id` - Who did the mentioning
- `entity_type` - 'article', 'comment', or 'group_post'
- `entity_id` - ID of the entity

### notifications
- `type` - Includes 'mention'
- `message` - Custom notification text

### comments
- `parent_id` - Enables infinite nesting

---

## ✨ Feature Highlights

| Feature | Status | Location |
|---------|--------|----------|
| Video Upload | ✅ Ready | ArticleCreator |
| PDF Upload | ✅ Ready | ArticleCreator |
| @Mentions | ✅ Ready | MentionTextarea |
| Notifications | ✅ Ready | API Routes |
| Infinite Comments | ✅ Ready | CommentItem |
| Media Display | ✅ Ready | ArticleMedia |

---

## 🎯 Common Use Cases

### 1. Create Article with Video
```tsx
<ArticleCreator />
// User uploads video in the Video tab
// Media is automatically attached to article
```

### 2. Mention Multiple Users
```tsx
// In article content:
"Check this out @john @jane @alice!"
// All three users get notified
```

### 3. Nested Comment Reply
```tsx
<CommentSection entityId={articleId} entityType="article" />
// Users can reply to any comment
// Replies can have their own replies
// Depth is unlimited
```

---

## 🔍 Debugging Tips

### Check if media uploaded
```sql
SELECT * FROM media_files WHERE uploaded_by = 'your-user-id';
```

### Check mentions
```sql
SELECT * FROM mentions WHERE mentioned_profile_id = 'user-id';
```

### Check notifications
```sql
SELECT * FROM notifications WHERE profile_id = 'user-id' AND type = 'mention';
```

### Verify comment nesting
```sql
SELECT id, content, parent_id FROM comments WHERE article_id = 'article-id';
```

---

## 📱 Mobile Responsiveness

All features are mobile-friendly:
- ✅ Touch-friendly mention dropdown
- ✅ Responsive video player
- ✅ Mobile-optimized PDF viewer
- ✅ Swipe-friendly comment threads

---

## ⚡ Performance Tips

1. **Lazy load comments** - Only load top-level initially
2. **Limit mentions** - Search returns max 5 results
3. **Cache media URLs** - Reuse public URLs
4. **Index mentions** - Already indexed by profile_id

---

## 🎨 Customization

### Change mention highlight color
```tsx
// In MentionInput.tsx
<span className="text-blue-600"> // Change to your color
```

### Modify max file sizes
```tsx
// In FileUpload.tsx
const maxSizes = {
  video: 50 * 1024 * 1024, // Change here
  pdf: 20 * 1024 * 1024    // Change here
}
```

### Adjust comment nesting depth display
```tsx
// In CommentItem.tsx
const indentClass = depth > 0 ? 'ml-12' : ''; // Change ml-12
```

---

## 📞 Support

For detailed documentation, see:
- `ADVANCED_FEATURES.md` - Complete feature guide
- `IMPLEMENTATION_SUMMARY.md` - What was implemented

For issues:
1. Check console for errors
2. Verify database schema
3. Check Supabase Storage setup
4. Review API responses

---

**You're ready to go! 🎉**

Start creating engaging articles with media, mentions, and nested discussions!
