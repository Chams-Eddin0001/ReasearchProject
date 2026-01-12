# Deployment Checklist

## ✅ Pre-Deployment Checklist

Before deploying these features to production, ensure all these items are completed:

### 1. Database Setup

- [ ] Run the SQL schema updates from `advanced-features.sql`
- [ ] Verify all tables exist:
  ```sql
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('articles', 'mentions', 'notifications', 'comments', 'media_files');
  ```
- [ ] Verify indexes are created:
  ```sql
  SELECT indexname FROM pg_indexes 
  WHERE tablename IN ('articles', 'mentions', 'comments');
  ```
- [ ] Test the `extract_mentions` function:
  ```sql
  SELECT extract_mentions('Hello @john and @jane!');
  ```
- [ ] Test the `get_comment_depth` function

### 2. Supabase Storage Setup

- [ ] Create storage bucket named `media-files`
  ```javascript
  // In Supabase Dashboard: Storage > Create Bucket
  Bucket name: media-files
  Public: Yes
  ```
- [ ] Set up RLS policies for the bucket:
  ```sql
  -- Allow public read access
  CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'media-files');
  
  -- Allow authenticated users to upload
  CREATE POLICY "Authenticated Upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'media-files' AND 
    auth.role() = 'authenticated'
  );
  ```
- [ ] Test file upload from the UI
- [ ] Verify public URLs work

### 3. Environment Variables

- [ ] Verify `.env` or `.env.local` has:
  ```
  NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
  SUPABASE_SERVICE_ROLE_KEY=your_service_key
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
  CLERK_SECRET_KEY=your_clerk_secret
  ```
- [ ] Update for production environment if needed

### 4. API Endpoints

Test all endpoints locally:

- [ ] POST `/api/articles` with mentions
- [ ] POST `/api/articles` with media
- [ ] POST `/api/comments` with mentions
- [ ] POST `/api/upload` with video
- [ ] POST `/api/upload` with PDF
- [ ] GET `/api/friends/search` (for mentions)

### 5. Component Testing

- [ ] Test ArticleCreator:
  - [ ] Create article with video
  - [ ] Create article with PDF
  - [ ] Mention multiple users
  - [ ] Save as draft
  - [ ] Publish article
- [ ] Test ArticleMedia:
  - [ ] Video plays correctly
  - [ ] PDF displays in viewer
  - [ ] Download button works
- [ ] Test MentionTextarea:
  - [ ] Dropdown appears on @
  - [ ] Search filters correctly
  - [ ] Keyboard navigation works
  - [ ] Selected user inserts correctly
- [ ] Test CommentSection:
  - [ ] Post comment with mention
  - [ ] Reply to comment
  - [ ] Reply to reply (3+ levels)
  - [ ] Like/unlike comments
  - [ ] Delete own comments

### 6. Notification Testing

- [ ] Create article with mention → verify notification
- [ ] Comment with mention → verify notification
- [ ] Reply with mention → verify notification
- [ ] Check `mentions` table has records
- [ ] Check `notifications` table has records

### 7. Performance Testing

- [ ] Test with large file uploads (near max size)
- [ ] Test with many nested comments (10+ levels)
- [ ] Test with many mentions (5+ users)
- [ ] Check page load time with media
- [ ] Verify images lazy load

### 8. Mobile Testing

- [ ] Test on iOS Safari
- [ ] Test on Android Chrome
- [ ] Verify mention dropdown on mobile
- [ ] Check video playback on mobile
- [ ] Test PDF viewer on mobile
- [ ] Verify comment nesting on small screens

### 9. Browser Compatibility

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### 10. Security

- [ ] Verify authentication required for uploads
- [ ] Test file type validation
- [ ] Test file size limits
- [ ] Verify RLS policies work correctly
- [ ] Check for SQL injection vulnerabilities
- [ ] Test XSS protection in content

---

## 🚀 Deployment Steps

### Step 1: Database Migration

```bash
# Connect to production database
psql $DATABASE_URL

# Run the migration
\i path/to/advanced-features.sql

# Verify tables
\dt

# Verify functions
\df extract_mentions
\df get_comment_depth
```

### Step 2: Storage Setup

1. Go to Supabase Dashboard → Storage
2. Create `media-files` bucket
3. Set to public
4. Add RLS policies
5. Test upload and public URL

### Step 3: Code Deployment

```bash
# Build the project
npm run build

# Run tests (if you have them)
npm test

# Deploy to your platform
# Vercel example:
vercel --prod

# Or build and upload manually
```

### Step 4: Post-Deployment Verification

- [ ] Visit /articles/new
- [ ] Create a test article with media
- [ ] Mention a test user
- [ ] Verify notification appears
- [ ] Check database records
- [ ] Test on mobile device

---

## 🔧 Rollback Plan

If issues occur, you can rollback:

### Database Rollback

```sql
-- Remove new columns (if needed)
ALTER TABLE articles DROP COLUMN IF EXISTS media_type;
ALTER TABLE articles DROP COLUMN IF EXISTS media_url;

-- Drop new indexes
DROP INDEX IF EXISTS idx_articles_media_type;
DROP INDEX IF EXISTS idx_mentions_mentioned_profile;
DROP INDEX IF EXISTS idx_mentions_entity;

-- Drop new functions
DROP FUNCTION IF EXISTS extract_mentions;
DROP FUNCTION IF EXISTS get_comment_depth;
```

### Code Rollback

```bash
# Git revert to previous version
git revert HEAD

# Redeploy
vercel --prod
```

---

## 📊 Monitoring

After deployment, monitor:

### Metrics to Track

1. **Upload Success Rate**
   ```sql
   SELECT 
     COUNT(*) as total_uploads,
     COUNT(CASE WHEN file_path IS NOT NULL THEN 1 END) as successful
   FROM media_files
   WHERE created_at > NOW() - INTERVAL '24 hours';
   ```

2. **Mention Usage**
   ```sql
   SELECT COUNT(*) FROM mentions 
   WHERE created_at > NOW() - INTERVAL '24 hours';
   ```

3. **Notification Delivery**
   ```sql
   SELECT 
     type, 
     COUNT(*) 
   FROM notifications 
   WHERE created_at > NOW() - INTERVAL '24 hours'
   GROUP BY type;
   ```

4. **Comment Depth Distribution**
   ```sql
   WITH RECURSIVE comment_depths AS (
     SELECT id, parent_id, 0 as depth
     FROM comments
     WHERE parent_id IS NULL
     
     UNION ALL
     
     SELECT c.id, c.parent_id, cd.depth + 1
     FROM comments c
     JOIN comment_depths cd ON c.parent_id = cd.id
   )
   SELECT depth, COUNT(*) 
   FROM comment_depths 
   GROUP BY depth 
   ORDER BY depth;
   ```

### Error Monitoring

Watch for:
- 413 errors (file too large)
- 415 errors (unsupported media type)
- 500 errors (server issues)
- Failed uploads in logs
- Slow query performance

---

## 🐛 Common Issues & Solutions

### Issue: Files not uploading

**Solution:**
1. Check storage bucket exists
2. Verify RLS policies
3. Check file size limits
4. Test with smaller file

### Issue: Mentions not working

**Solution:**
1. Verify `/api/friends/search` endpoint exists
2. Check profile table structure
3. Test friend search query
4. Verify user authentication

### Issue: Notifications not appearing

**Solution:**
1. Check notifications table schema
2. Verify type constraint includes 'mention'
3. Test notification creation directly
4. Check user permissions

### Issue: Comments not nesting

**Solution:**
1. Verify parent_id column exists
2. Check foreign key constraints
3. Test recursive query
4. Verify comment creation API

---

## ✅ Post-Deployment Tasks

After successful deployment:

- [ ] Update team documentation
- [ ] Send announcement to users
- [ ] Create tutorial/walkthrough
- [ ] Monitor for first 24 hours
- [ ] Collect user feedback
- [ ] Plan next iteration

---

## 📞 Support Resources

- Supabase Docs: https://supabase.com/docs
- Next.js Docs: https://nextjs.org/docs
- PostgreSQL Docs: https://www.postgresql.org/docs/

For project-specific help:
- See `ADVANCED_FEATURES.md`
- See `QUICK_START.md`
- See `IMPLEMENTATION_SUMMARY.md`

---

**Good luck with your deployment! 🚀**
