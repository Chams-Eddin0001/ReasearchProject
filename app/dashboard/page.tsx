'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Article } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Edit, Trash2, Eye, PenSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export default function DashboardPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [myArticles, setMyArticles] = useState<Article[]>([]);
  const [collaborations, setCollaborations] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }

    if (user) {
      fetchArticles();
    }
  }, [user, authLoading]);

  const fetchArticles = async () => {
    if (!user) return;

    const { data: myData } = await supabase
      .from('articles')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (myData) {
      setMyArticles(myData);
    }

    const { data: collabData } = await supabase
      .from('article_authors')
      .select(`
        article:articles(*)
      `)
      .eq('profile_id', user.id);

    if (collabData) {
      setCollaborations(collabData.map((c: any) => c.article).filter(Boolean));
    }

    setLoading(false);
  };

  const handleDelete = async (articleId: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;

    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', articleId);

    if (error) {
      toast.error('Failed to delete article');
    } else {
      toast.success('Article deleted');
      fetchArticles();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return '';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'N/A';
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              My Dashboard
            </h1>
            <p className="text-gray-600">
              Manage your articles and collaborations
            </p>
          </div>
          <Button asChild>
            <Link href="/write">
              <PenSquare className="mr-2 h-4 w-4" />
              Write New Article
            </Link>
          </Button>
        </div>

        <Tabs defaultValue="my-articles">
          <TabsList>
            <TabsTrigger value="my-articles">
              My Articles ({myArticles.length})
            </TabsTrigger>
            <TabsTrigger value="collaborations">
              Collaborations ({collaborations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-articles" className="mt-6">
            {loading ? (
              <div className="grid gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : myArticles.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-500 mb-4">
                    You haven't written any articles yet.
                  </p>
                  <Button asChild>
                    <Link href="/write">Write Your First Article</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {myArticles.map((article) => (
                  <Card key={article.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle>{article.title}</CardTitle>
                            <Badge className={getStatusColor(article.status)}>
                              {article.status}
                            </Badge>
                          </div>
                          <CardDescription className="flex items-center gap-4">
                            {article.status === 'published' && article.published_at ? (
                              <span>
                                Published {formatDate(article.published_at)}
                              </span>
                            ) : (
                              <span>
                                Last edited {formatDate(article.updated_at)}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {article.views_count || 0} views
                            </span>
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/write?edit=${article.id}`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          {article.status === 'published' && (
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/articles/${article.slug}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(article.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="collaborations" className="mt-6">
            {loading ? (
              <div className="grid gap-4">
                {[1, 2].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : collaborations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-500">
                    You are not collaborating on any articles yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {collaborations.map((article) => (
                  <Card key={article.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle>{article.title}</CardTitle>
                            <Badge className={getStatusColor(article.status)}>
                              {article.status}
                            </Badge>
                          </div>
                          <CardDescription>
                            {article.status === 'published' && article.published_at && (
                              <span>
                                Published {formatDate(article.published_at)}
                              </span>
                            )}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/write?edit=${article.id}`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          {article.status === 'published' && (
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/articles/${article.slug}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}