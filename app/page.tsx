'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowRight, TrendingUp, Users, BookOpen, 
  Heart, MessageCircle, Eye, UserPlus 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface FeedItem {
  id: string;
  type: 'article' | 'group_post';
  title?: string;
  content?: string;
  excerpt?: string;
  cover_image?: string;
  date: string;
  likes_count: number;
  comments_count: number;
  views_count?: number;
  profile?: any;
  author?: any;
  group?: any;
  slug?: string;
}

export default function Home() {
  const { user } = useAuth();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (user) {
      fetchFeed();
      fetchFriendRequests();
    } else {
      fetchPublicArticles();
    }
  }, [user]);

  const fetchFeed = async () => {
    try {
      const response = await fetch('/api/feed');
      const data = await response.json();
      setFeed(data.feed || []);
    } catch (error) {
      console.error('Error fetching feed:', error);
      toast.error('Failed to load feed');
    } finally {
      setLoading(false);
    }
  };

  const fetchFriendRequests = async () => {
    try {
      const response = await fetch('/api/friendships?type=pending');
      const data = await response.json();
      setFriendRequests(data || []);
    } catch (error) {
      console.error('Error fetching friend requests:', error);
    }
  };

  const fetchPublicArticles = async () => {
    try {
      const response = await fetch('/api/feed');
      const data = await response.json();
      setFeed(data.articles || []);
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFriendRequest = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      const response = await fetch(`/api/friendships/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        toast.success(action === 'accept' ? 'Friend request accepted!' : 'Friend request rejected');
        fetchFriendRequests();
        if (action === 'accept') {
          fetchFeed(); // Refresh feed to show new friend's content
        }
      }
    } catch (error) {
      console.error('Error handling friend request:', error);
      toast.error('Failed to process request');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Recently';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Recently';
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

  // Show landing page for non-authenticated users
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Collaborate on Research
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Join a community of researchers sharing insights, collaborating on
              projects, and advancing knowledge together.
            </p>
            <div className="flex justify-center gap-4">
              <Button size="lg" asChild className="bg-black text-white hover:bg-gray-800">
                <Link href="/articles">
                  Explore Articles
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/researchers">Find Researchers</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              <Card>
                <CardHeader>
                  <BookOpen className="h-10 w-10 mb-4 text-blue-600" />
                  <CardTitle>Share Research</CardTitle>
                  <CardDescription>
                    Publish your findings and make them accessible to the global
                    research community.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <Users className="h-10 w-10 mb-4 text-green-600" />
                  <CardTitle>Collaborate</CardTitle>
                  <CardDescription>
                    Connect with fellow researchers and collaborate on projects
                    with co-authorship features.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <TrendingUp className="h-10 w-10 mb-4 text-purple-600" />
                  <CardTitle>Stay Updated</CardTitle>
                  <CardDescription>
                    Follow friends and join groups to stay updated on the latest
                    research trends.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900">
                Recent Publications
              </h2>
              <Button variant="ghost" asChild>
                <Link href="/articles">View All</Link>
              </Button>
            </div>
            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-20 bg-gray-200 rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : feed.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-500">No articles published yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {feed.slice(0, 6).map((item) => (
                  <Link href={`/articles/${item.slug}`} key={item.id}>
                    <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                      {item.cover_image && (
                        <div className="h-48 overflow-hidden rounded-t-lg">
                          <img
                            src={item.cover_image}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <CardHeader>
                        <CardTitle className="line-clamp-2">
                          {item.title}
                        </CardTitle>
                        <CardDescription>
                          By {item.profile?.full_name || 'Anonymous'} •{' '}
                          {formatDate(item.date)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-600 line-clamp-3">
                          {item.excerpt || 'No excerpt available'}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    );
  }

  // Personalized feed for authenticated users
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Main Feed */}
          <div className="lg:col-span-3">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Feed</h1>
              <p className="text-gray-600">
                Latest from your friends and groups
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="article">Articles</TabsTrigger>
                <TabsTrigger value="group_post">Group Posts</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-6 mt-6">
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="animate-pulse">
                        <CardHeader>
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        </CardHeader>
                        <CardContent>
                          <div className="h-20 bg-gray-200 rounded"></div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : feed.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-500 mb-4">
                        Your feed is empty. Connect with researchers and join groups to see content here.
                      </p>
                      <div className="flex justify-center gap-4">
                        <Button asChild>
                          <Link href="/researchers">Find Researchers</Link>
                        </Button>
                        <Button variant="outline" asChild>
                          <Link href="/groups">Join Groups</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  feed.map((item) => (
                    <Card key={item.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        {item.type === 'article' ? (
                          <Link href={`/articles/${item.slug}`}>
                            <div className="flex gap-4">
                              <Avatar>
                                <AvatarImage src={item.profile?.avatar_url} />
                                <AvatarFallback>
                                  {getInitials(item.profile?.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-medium">
                                    {item.profile?.full_name || 'Anonymous'}
                                  </span>
                                  <span className="text-gray-500">published an article</span>
                                  <Badge variant="secondary">Article</Badge>
                                  <span className="text-sm text-gray-500 ml-auto">
                                    {formatDate(item.date)}
                                  </span>
                                </div>
                                <h3 className="text-xl font-bold mb-2 hover:text-blue-600">
                                  {item.title}
                                </h3>
                                {item.cover_image && (
                                  <img
                                    src={item.cover_image}
                                    alt={item.title}
                                    className="w-full h-64 object-cover rounded-lg mb-3"
                                  />
                                )}
                                <p className="text-gray-600 mb-4 line-clamp-3">
                                  {item.excerpt}
                                </p>
                                <div className="flex items-center gap-6 text-sm text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Heart className="h-4 w-4" />
                                    {item.likes_count}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <MessageCircle className="h-4 w-4" />
                                    {item.comments_count}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Eye className="h-4 w-4" />
                                    {item.views_count || 0}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </Link>
                        ) : (
                          <Link href={`/groups/${item.group?.id}`}>
                            <div className="flex gap-4">
                              <Avatar>
                                <AvatarImage src={item.author?.avatar_url} />
                                <AvatarFallback>
                                  {getInitials(item.author?.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-medium">
                                    {item.author?.full_name || 'Anonymous'}
                                  </span>
                                  <span className="text-gray-500">posted in</span>
                                  <span className="font-medium">{item.group?.name}</span>
                                  <Badge variant="secondary">Group</Badge>
                                  <span className="text-sm text-gray-500 ml-auto">
                                    {formatDate(item.date)}
                                  </span>
                                </div>
                                <p className="text-gray-700 mb-3">{item.content}</p>
                                <div className="flex items-center gap-6 text-sm text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Heart className="h-4 w-4" />
                                    {item.likes_count}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <MessageCircle className="h-4 w-4" />
                                    {item.comments_count}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </Link>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="article" className="space-y-6 mt-6">
                {feed.filter((item) => item.type === 'article').map((item) => (
                  <Card key={item.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <Link href={`/articles/${item.slug}`}>
                        <div className="flex gap-4">
                          <Avatar>
                            <AvatarImage src={item.profile?.avatar_url} />
                            <AvatarFallback>
                              {getInitials(item.profile?.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium">
                                {item.profile?.full_name || 'Anonymous'}
                              </span>
                              <span className="text-sm text-gray-500 ml-auto">
                                {formatDate(item.date)}
                              </span>
                            </div>
                            <h3 className="text-xl font-bold mb-2 hover:text-blue-600">
                              {item.title}
                            </h3>
                            {item.cover_image && (
                              <img
                                src={item.cover_image}
                                alt={item.title}
                                className="w-full h-64 object-cover rounded-lg mb-3"
                              />
                            )}
                            <p className="text-gray-600 mb-4 line-clamp-3">
                              {item.excerpt}
                            </p>
                            <div className="flex items-center gap-6 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Heart className="h-4 w-4" />
                                {item.likes_count}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageCircle className="h-4 w-4" />
                                {item.comments_count}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="group_post" className="space-y-6 mt-6">
                {feed.filter((item) => item.type === 'group_post').map((item) => (
                  <Card key={item.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <Link href={`/groups/${item.group?.id}`}>
                        <div className="flex gap-4">
                          <Avatar>
                            <AvatarImage src={item.author?.avatar_url} />
                            <AvatarFallback>
                              {getInitials(item.author?.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium">
                                {item.author?.full_name || 'Anonymous'}
                              </span>
                              <span className="text-gray-500">in</span>
                              <span className="font-medium">{item.group?.name}</span>
                              <span className="text-sm text-gray-500 ml-auto">
                                {formatDate(item.date)}
                              </span>
                            </div>
                            <p className="text-gray-700 mb-3">{item.content}</p>
                            <div className="flex items-center gap-6 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Heart className="h-4 w-4" />
                                {item.likes_count}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageCircle className="h-4 w-4" />
                                {item.comments_count}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Friend Requests */}
            {friendRequests.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Friend Requests ({friendRequests.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {friendRequests.slice(0, 3).map((request) => (
                    <div key={request.id} className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={request.requester?.avatar_url} />
                        <AvatarFallback>
                          {getInitials(request.requester?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {request.requester?.full_name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {request.requester?.institution}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            onClick={() => handleFriendRequest(request.id, 'accept')}
                            className="flex-1 h-8 text-xs"
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleFriendRequest(request.id, 'reject')}
                            className="flex-1 h-8 text-xs"
                          >
                            Decline
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {friendRequests.length > 3 && (
                    <Button variant="ghost" size="sm" className="w-full" asChild>
                      <Link href="/researchers?tab=requests">
                        View all {friendRequests.length} requests
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-start" variant="outline" asChild>
                  <Link href="/write">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Write Article
                  </Link>
                </Button>
                <Button className="w-full justify-start" variant="outline" asChild>
                  <Link href="/researchers">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Find Researchers
                  </Link>
                </Button>
                <Button className="w-full justify-start" variant="outline" asChild>
                  <Link href="/groups">
                    <Users className="h-4 w-4 mr-2" />
                    Browse Groups
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Trending Topics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Trending
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Link href="/articles?tag=AI" className="block hover:bg-gray-50 p-2 rounded">
                    <p className="font-medium text-sm">#AI</p>
                    <p className="text-xs text-gray-500">45 articles</p>
                  </Link>
                  <Link href="/articles?tag=Machine Learning" className="block hover:bg-gray-50 p-2 rounded">
                    <p className="font-medium text-sm">#MachineLearning</p>
                    <p className="text-xs text-gray-500">32 articles</p>
                  </Link>
                  <Link href="/articles?tag=Climate" className="block hover:bg-gray-50 p-2 rounded">
                    <p className="font-medium text-sm">#Climate</p>
                    <p className="text-xs text-gray-500">28 articles</p>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
