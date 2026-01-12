'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, Article, Profile } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CommentSection } from '@/components/comments/CommentSection';
import { ArticleMedia } from '@/components/articles';
import { ArrowLeft, Calendar, Eye, Edit, Heart, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

// Extended types with relations
interface ArticleWithAuthor extends Article {
  author?: Profile | null;
}

export default function ArticleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, profile } = useAuth();
  const [article, setArticle] = useState<ArticleWithAuthor | null>(null);
  const [coAuthors, setCoAuthors] = useState<Profile[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [userLiked, setUserLiked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.slug) {
      fetchArticle(params.slug as string);
    }
  }, [params.slug, user]);

  const fetchArticle = async (slug: string) => {
    const { data: articleData, error } = await supabase
      .from('articles')
      .select(`
        *,
        author:profiles!created_by(*)
      `)
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle();

    if (articleData) {
      setArticle(articleData as ArticleWithAuthor);
      await Promise.all([
        fetchCoAuthors(articleData.id),
        fetchTags(articleData.id),
        fetchLikesAndComments(articleData.id),
        incrementViews(articleData.id),
      ]);
    }
    setLoading(false);
  };

  const fetchCoAuthors = async (articleId: string) => {
    const { data } = await supabase
      .from('article_authors')
      .select('profile:profiles(*)')
      .eq('article_id', articleId);

    if (data) {
      setCoAuthors(data.map((d: any) => d.profile).filter(Boolean));
    }
  };

  const fetchTags = async (articleId: string) => {
    const { data } = await supabase
      .from('article_tags')
      .select('tag')
      .eq('article_id', articleId);

    if (data) {
      setTags(data.map((t) => t.tag));
    }
  };

  const fetchLikesAndComments = async (articleId: string) => {
    // Fetch likes count
    const { count: likesCount } = await supabase
      .from('article_likes')
      .select('*', { count: 'exact', head: true })
      .eq('article_id', articleId);

    setLikesCount(likesCount || 0);

    // Check if current user liked
    if (user) {
      const { data: likeData } = await supabase
        .from('article_likes')
        .select('id')
        .eq('article_id', articleId)
        .eq('profile_id', user.id)
        .maybeSingle();

      setUserLiked(!!likeData);
    }

    // Fetch comments count
    const { count: commentsCount } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('article_id', articleId);

    setCommentsCount(commentsCount || 0);
  };

  const incrementViews = async (articleId: string) => {
    try {
      await fetch(`/api/articles/${articleId}/views`, {
        method: 'POST',
      });
      
      // Update local state
      if (article) {
        setArticle({
          ...article,
          views_count: (article.views_count || 0) + 1,
        });
      }
    } catch (error) {
      console.error('Failed to increment views:', error);
    }
  };

  const toggleLike = async () => {
    if (!user || !article) {
      toast.error('Please sign in to like articles');
      return;
    }

    try {
      if (userLiked) {
        // Unlike
        await supabase
          .from('article_likes')
          .delete()
          .eq('article_id', article.id)
          .eq('profile_id', user.id);

        setUserLiked(false);
        setLikesCount(likesCount - 1);
        toast.success('Removed like');
      } else {
        // Like
        await supabase
          .from('article_likes')
          .insert({
            article_id: article.id,
            profile_id: user.id,
          });

        setUserLiked(true);
        setLikesCount(likesCount + 1);
        toast.success('Article liked!');
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Recently';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold mb-4">Article not found</h1>
          <Button asChild>
            <Link href="/articles">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Articles
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const isAuthor =
    user &&
    (article.created_by === user.id || coAuthors.some((a) => a.id === user.id));

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <article className="max-w-4xl mx-auto px-4">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/articles">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Articles
          </Link>
        </Button>

        <Card className="mb-8">
          {article.cover_image && (
            <div className="h-96 overflow-hidden rounded-t-lg">
              <img
                src={article.cover_image}
                alt={article.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <CardHeader className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-4xl font-bold mb-4">{article.title}</h1>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              {isAuthor && (
                <Button size="sm" asChild>
                  <Link href={`/write?edit=${article.id}`}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Link>
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center gap-4">
                <Link href={`/profile/${article.author?.id}`} className="flex items-center gap-2 hover:opacity-80">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={article.author?.avatar_url || undefined} />
                    <AvatarFallback>
                      {getInitials(article.author?.full_name || null)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-gray-900">
                      {article.author?.full_name || 'Anonymous'}
                    </p>
                    {article.author?.institution && (
                      <p className="text-xs">{article.author.institution}</p>
                    )}
                  </div>
                </Link>
                {coAuthors.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span>with</span>
                    <div className="flex -space-x-2">
                      {coAuthors.slice(0, 3).map((author) => (
                        <Avatar
                          key={author.id}
                          className="h-8 w-8 border-2 border-white"
                        >
                          <AvatarImage src={author.avatar_url || undefined} />
                          <AvatarFallback>
                            {getInitials(author.full_name)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    {coAuthors.length > 3 && (
                      <span>+{coAuthors.length - 3} more</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(article.published_at)}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {article.views_count || 0} views
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <div className="whitespace-pre-wrap">{article.content}</div>
            
            {/* Display attached media (video or PDF) */}
            <ArticleMedia 
              mediaType={article.media_type as 'video' | 'pdf' | null}
              mediaUrl={article.media_url}
            />
          </CardContent>

          {/* Like and Comment Stats */}
          <div className="px-6 pb-4">
            <Separator className="mb-4" />
            <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
              <div className="flex items-center gap-4">
                {likesCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                    {likesCount} {likesCount === 1 ? 'like' : 'likes'}
                  </span>
                )}
              </div>
              {commentsCount > 0 && (
                <span>{commentsCount} {commentsCount === 1 ? 'comment' : 'comments'}</span>
              )}
            </div>
            
            <Separator className="mb-4" />
            
            {/* Like and Comment Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                className={`flex-1 ${userLiked ? 'text-red-600 hover:text-red-700' : 'hover:bg-gray-100'}`}
                onClick={toggleLike}
              >
                <Heart className={`h-5 w-5 mr-2 ${userLiked ? 'fill-red-600' : ''}`} />
                {userLiked ? 'Liked' : 'Like'}
              </Button>
              <Button
                variant="ghost"
                className="flex-1 hover:bg-gray-100"
                onClick={() => {
                  const commentSection = document.getElementById('comment-section');
                  if (commentSection) {
                    commentSection.scrollIntoView({ behavior: 'smooth' });
                    // Focus on the comment textarea
                    setTimeout(() => {
                      const textarea = commentSection.querySelector('textarea');
                      textarea?.focus();
                    }, 500);
                  }
                }}
              >
                <MessageCircle className="h-5 w-5 mr-2" />
                Comment
              </Button>
            </div>
          </div>
        </Card>

        {/* Comment Section with Facebook-style UI */}
        <div id="comment-section">
          <CommentSection
            entityId={article.id}
            entityType="article"
            currentUser={user ? {
              id: user.id,
              full_name: profile?.full_name || user.firstName || 'User',
              avatar_url: profile?.avatar_url || user.imageUrl,
            } : undefined}
          />
        </div>
      </article>
    </div>
  );
}
