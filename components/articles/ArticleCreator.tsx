'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MentionTextarea } from '@/components/mentions/MentionTextarea';
import { FileUpload } from '@/components/upload/FileUpload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { FileVideo, FileText, X, Loader2 } from 'lucide-react';

type MediaType = 'video' | 'pdf' | null;

interface ArticleCreatorProps {
  onSuccess?: (article: any) => void;
}

export function ArticleCreator({ onSuccess }: ArticleCreatorProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [mediaType, setMediaType] = useState<MediaType>(null);
  const [mediaUrl, setMediaUrl] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'draft' | 'published'>('draft');

  // Auto-generate slug from title
  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slug || slug === generateSlug(title)) {
      setSlug(generateSlug(value));
    }
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleMediaUpload = (url: string, type: MediaType) => {
    setMediaUrl(url);
    setMediaType(type);
  };

  const removeMedia = () => {
    setMediaUrl('');
    setMediaType(null);
  };

  const validateForm = () => {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return false;
    }
    if (!content.trim()) {
      toast.error('Please enter article content');
      return false;
    }
    if (!slug.trim()) {
      toast.error('Please enter a slug');
      return false;
    }
    return true;
  };

  const handleSubmit = async (publishStatus: 'draft' | 'published') => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setStatus(publishStatus);

    try {
      const response = await fetch('/api/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim(),
          content: content.trim(),
          excerpt: excerpt.trim() || null,
          cover_image: coverImage || null,
          media_type: mediaType,
          media_url: mediaUrl || null,
          mentions,
          status: publishStatus,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create article');
      }

      const article = await response.json();

      toast.success(
        publishStatus === 'published'
          ? 'Article published successfully!'
          : 'Article saved as draft'
      );

      // Notify about mentions
      if (mentions.length > 0) {
        toast.success(`${mentions.length} user(s) will be notified about your mention`);
      }

      if (onSuccess) {
        onSuccess(article);
      } else {
        router.push(`/articles/${article.slug}`);
      }

      // Reset form
      setTitle('');
      setSlug('');
      setContent('');
      setExcerpt('');
      setCoverImage('');
      setMediaUrl('');
      setMediaType(null);
      setMentions([]);
    } catch (error: any) {
      console.error('Error creating article:', error);
      toast.error(error.message || 'Failed to create article');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Create New Article</CardTitle>
        <CardDescription>
          Share your research, thoughts, and ideas with the community
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            placeholder="Enter article title..."
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        {/* Slug */}
        <div className="space-y-2">
          <Label htmlFor="slug">URL Slug *</Label>
          <Input
            id="slug"
            placeholder="article-url-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            disabled={isSubmitting}
          />
          <p className="text-xs text-gray-500">
            This will be the URL: /articles/{slug || 'your-slug'}
          </p>
        </div>

        {/* Excerpt */}
        <div className="space-y-2">
          <Label htmlFor="excerpt">Excerpt (Optional)</Label>
          <Input
            id="excerpt"
            placeholder="A brief summary of your article..."
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        {/* Cover Image */}
        <div className="space-y-2">
          <Label htmlFor="cover">Cover Image (Optional)</Label>
          <FileUpload
            type="image"
            entityType="article"
            onUploadComplete={setCoverImage}
            currentUrl={coverImage}
          />
        </div>

        {/* Content with Mentions */}
        <div className="space-y-2">
          <Label htmlFor="content">Content *</Label>
          <p className="text-xs text-gray-500 mb-2">
            💡 Use @ to mention friends in your article
          </p>
          <MentionTextarea
            value={content}
            onChange={setContent}
            onMentionsChange={setMentions}
            placeholder="Write your article content... Use @ to mention friends"
            rows={12}
            className="font-mono text-sm"
          />
          {mentions.length > 0 && (
            <p className="text-xs text-blue-600">
              📨 {mentions.length} user(s) will be notified
            </p>
          )}
        </div>

        {/* Media Attachment (Video or PDF) */}
        <div className="space-y-2">
          <Label>Attach Media (Optional)</Label>
          <p className="text-xs text-gray-500 mb-3">
            Add a video or PDF to enhance your article
          </p>
          
          {mediaUrl ? (
            <Card className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {mediaType === 'video' ? (
                    <FileVideo className="h-8 w-8 text-blue-500" />
                  ) : (
                    <FileText className="h-8 w-8 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium text-sm">
                      {mediaType === 'video' ? 'Video' : 'PDF'} attached
                    </p>
                    <p className="text-xs text-gray-500">{mediaUrl}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeMedia}
                  disabled={isSubmitting}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ) : (
            <Tabs defaultValue="video" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="video">Video</TabsTrigger>
                <TabsTrigger value="pdf">PDF</TabsTrigger>
              </TabsList>
              <TabsContent value="video" className="mt-4">
                <FileUpload
                  type="video"
                  entityType="article"
                  onUploadComplete={(url) => handleMediaUpload(url, 'video')}
                />
              </TabsContent>
              <TabsContent value="pdf" className="mt-4">
                <FileUpload
                  type="pdf"
                  entityType="article"
                  onUploadComplete={(url) => handleMediaUpload(url, 'pdf')}
                />
              </TabsContent>
            </Tabs>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={() => handleSubmit('draft')}
            disabled={isSubmitting}
            variant="outline"
            className="flex-1"
          >
            {isSubmitting && status === 'draft' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save as Draft'
            )}
          </Button>
          <Button
            onClick={() => handleSubmit('published')}
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting && status === 'published' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Publishing...
              </>
            ) : (
              'Publish Article'
            )}
          </Button>
        </div>

        {/* Feature Info */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
          <p className="font-semibold text-blue-900 mb-2">✨ New Features:</p>
          <ul className="text-blue-800 space-y-1 text-xs">
            <li>📹 Attach videos or PDF files to your articles</li>
            <li>👥 Mention friends using @ - they'll get notifications</li>
            <li>💬 Readers can leave comments with infinite replies</li>
            <li>🔔 Everyone you mention will be notified instantly</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
