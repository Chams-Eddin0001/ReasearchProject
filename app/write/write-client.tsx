'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { FileUpload } from '@/components/upload/FileUpload';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, FileVideo, FileText as FilePdf } from 'lucide-react';
import { toast } from 'sonner';

interface MediaAttachment {
  type: 'video' | 'pdf';
  url: string;
  name: string;
}

export default function WritePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const editId = searchParams.get('edit');

  const [loading, setLoading] = useState(false);
  const [loadingArticle, setLoadingArticle] = useState(!!editId);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    cover_image: '',
    status: 'draft' as 'draft' | 'published',
  });
  const [mediaAttachments, setMediaAttachments] = useState<MediaAttachment[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }

    if (editId && user) {
      loadArticle(editId);
    }
  }, [editId, user, authLoading]);

  const loadArticle = async (articleId: string) => {
    setLoadingArticle(true);
    
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', articleId)
      .maybeSingle();

    if (error) {
      console.error('Error loading article:', error);
      toast.error('Failed to load article');
      router.push('/dashboard');
      return;
    }

    if (!data) {
      toast.error('Article not found');
      router.push('/dashboard');
      return;
    }

    if (data.created_by !== user?.id) {
      toast.error('You are not authorized to edit this article');
      router.push('/dashboard');
      return;
    }

    setFormData({
      title: data.title,
      slug: data.slug,
      content: data.content || '',
      excerpt: data.excerpt || '',
      cover_image: data.cover_image || '',
      status: data.status,
    });

    // Load media attachments
    const { data: media } = await supabase
      .from('article_media')
      .select('*')
      .eq('article_id', articleId);

    if (media) {
      setMediaAttachments(
        media.map((m) => ({
          type: m.media_type as 'video' | 'pdf',
          url: m.media_url,
          name: m.file_name || '',
        }))
      );
    }

    setLoadingArticle(false);
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleTitleChange = (title: string) => {
    setFormData({
      ...formData,
      title,
      slug: generateSlug(title),
    });
  };

  const addMediaAttachment = (type: 'video' | 'pdf', url: string, name: string) => {
    setMediaAttachments([...mediaAttachments, { type, url, name }]);
  };

  const removeMediaAttachment = (index: number) => {
    setMediaAttachments(mediaAttachments.filter((_, i) => i !== index));
  };

  const handleSubmit = async (status: 'draft' | 'published') => {
    if (!user) return;

    if (!formData.title || !formData.content) {
      toast.error('Title and content are required');
      return;
    }

    setLoading(true);

    try {
      const articleData = {
        title: formData.title,
        slug: formData.slug,
        content: formData.content,
        excerpt: formData.excerpt,
        cover_image: formData.cover_image,
        status,
        media_attachments: mediaAttachments,
      };

      if (editId) {
        const response = await fetch(`/api/articles/${editId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(articleData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update article');
        }

        toast.success('Article updated successfully!');
        router.push('/dashboard');
      } else {
        const response = await fetch('/api/articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(articleData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create article');
        }

        const article = await response.json();
        toast.success('Article created successfully!');
        router.push(status === 'published' ? `/articles/${article.slug}` : '/dashboard');
      }
    } catch (error: any) {
      console.error('Error saving article:', error);
      toast.error(error.message || 'Failed to save article');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loadingArticle) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <Card>
          <CardHeader>
            <CardTitle>{editId ? 'Edit Article' : 'Write New Article'}</CardTitle>
            <CardDescription>
              Share your research with the community. Use @username to tag friends.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Enter article title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="article-slug"
              />
              <p className="text-xs text-gray-500">
                URL-friendly version of the title (auto-generated)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="excerpt">Excerpt</Label>
              <Textarea
                id="excerpt"
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                placeholder="Brief summary of your article"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cover_image">Cover Image</Label>
              <FileUpload
                type="image"
                entityType="article"
                currentUrl={formData.cover_image}
                onUploadComplete={(url) => setFormData({ ...formData, cover_image: url })}
              />
            </div>

            {/* Media Attachments */}
            <div className="space-y-2">
              <Label>Media Attachments (Videos & PDFs)</Label>
              <Tabs defaultValue="video" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="video">Add Video</TabsTrigger>
                  <TabsTrigger value="pdf">Add PDF</TabsTrigger>
                </TabsList>
                <TabsContent value="video" className="space-y-4">
                  <FileUpload
                    type="video"
                    entityType="article"
                    onUploadComplete={(url) => {
                      addMediaAttachment('video', url, 'Video attachment');
                      toast.success('Video added!');
                    }}
                  />
                </TabsContent>
                <TabsContent value="pdf" className="space-y-4">
                  <FileUpload
                    type="pdf"
                    entityType="article"
                    onUploadComplete={(url) => {
                      addMediaAttachment('pdf', url, 'PDF attachment');
                      toast.success('PDF added!');
                    }}
                  />
                </TabsContent>
              </Tabs>

              {/* Display current attachments */}
              {mediaAttachments.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium">Attached Files:</p>
                  {mediaAttachments.map((media, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        {media.type === 'video' ? (
                          <FileVideo className="h-5 w-5 text-blue-600" />
                        ) : (
                          <FilePdf className="h-5 w-5 text-red-600" />
                        )}
                        <span className="text-sm">{media.name}</span>
                        <Badge variant="secondary">{media.type.toUpperCase()}</Badge>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMediaAttachment(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Write your article content here... Use @username to mention friends."
                rows={15}
                required
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-500">
                You can use Markdown formatting. Use @username to tag friends (e.g., @john).
              </p>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={() => handleSubmit('draft')}
                variant="outline"
                disabled={loading}
              >
                {loading ? 'Saving...' : editId ? 'Update as Draft' : 'Save as Draft'}
              </Button>
              <Button
                onClick={() => handleSubmit('published')}
                disabled={loading}
                className="bg-black text-white hover:bg-gray-800"
              >
                {loading ? 'Publishing...' : editId ? 'Update & Publish' : 'Publish'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => router.push('/dashboard')}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
