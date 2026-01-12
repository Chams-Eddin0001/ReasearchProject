'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, Globe, Mail, MessageSquare, Users, 
  UserPlus, UserCheck, Clock, UserX 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string;
  email: string;
  bio?: string;
  institution?: string;
  website?: string;
  research_interests?: string[];
}

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  cover_image?: string;
  published_at?: string;
  created_by: string;
  status: string;
}

interface Friend {
  id: string;
  friend: Profile;
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsCount, setFriendsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [friendshipStatus, setFriendshipStatus] = useState<{
    status: 'none' | 'pending_sent' | 'pending_received' | 'friends';
    id?: string;
  }>({ status: 'none' });

  useEffect(() => {
    if (params.id) {
      fetchProfile(params.id as string);
    }
  }, [params.id, user]);

  const fetchProfile = async (userId: string) => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profileData) {
      setProfile(profileData);

      // Fetch articles
      const { data: articlesData } = await supabase
        .from('articles')
        .select('*')
        .eq('created_by', userId)
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (articlesData) {
        setArticles(articlesData);
      }

      // Fetch friends
      await fetchFriends(userId);
      
      // Check friendship status with current user
      if (user && user.id !== userId) {
        await checkFriendshipStatus(userId);
      }
    }

    setLoading(false);
  };

  const fetchFriends = async (userId: string) => {
    try {
      const response = await fetch(`/api/friendships/user/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setFriends(data.friends || []);
        setFriendsCount(data.count || 0);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const checkFriendshipStatus = async (profileId: string) => {
    if (!user) return;

    const { data: friendships } = await supabase
      .from('friendships')
      .select('*')
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${profileId}),and(requester_id.eq.${profileId},addressee_id.eq.${user.id})`)
      .maybeSingle();

    if (!friendships) {
      setFriendshipStatus({ status: 'none' });
      return;
    }

    if (friendships.status === 'accepted') {
      setFriendshipStatus({ status: 'friends', id: friendships.id });
    } else if (friendships.requester_id === user.id) {
      setFriendshipStatus({ status: 'pending_sent', id: friendships.id });
    } else {
      setFriendshipStatus({ status: 'pending_received', id: friendships.id });
    }
  };

  const sendFriendRequest = async () => {
    if (!user || !profile) return;

    try {
      const response = await fetch('/api/friendships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addressee_id: profile.id }),
      });

      if (response.ok) {
        toast.success('Friend request sent!');
        checkFriendshipStatus(profile.id);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to send request');
      }
    } catch (error) {
      toast.error('Failed to send friend request');
    }
  };

  const handleFriendRequest = async (action: 'accept' | 'reject') => {
    if (!friendshipStatus.id) return;

    try {
      const response = await fetch(`/api/friendships/${friendshipStatus.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        toast.success(action === 'accept' ? 'Friend request accepted!' : 'Friend request rejected');
        if (profile) {
          checkFriendshipStatus(profile.id);
          fetchFriends(profile.id);
        }
      }
    } catch (error) {
      toast.error('Failed to process request');
    }
  };

  const removeFriend = async () => {
    if (!friendshipStatus.id) return;

    try {
      const response = await fetch(`/api/friendships/${friendshipStatus.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Friend removed');
        if (profile) {
          checkFriendshipStatus(profile.id);
          fetchFriends(profile.id);
        }
      }
    } catch (error) {
      toast.error('Failed to remove friend');
    }
  };

  const cancelRequest = async () => {
    if (!friendshipStatus.id) return;

    try {
      const response = await fetch(`/api/friendships/${friendshipStatus.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Request cancelled');
        if (profile) {
          checkFriendshipStatus(profile.id);
        }
      }
    } catch (error) {
      toast.error('Failed to cancel request');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getFriendButton = () => {
    if (!user || !profile || user.id === profile.id) return null;

    if (friendshipStatus.status === 'friends') {
      return (
        <Button variant="outline" onClick={removeFriend}>
          <UserCheck className="h-4 w-4 mr-2" />
          Friends
        </Button>
      );
    }

    if (friendshipStatus.status === 'pending_sent') {
      return (
        <Button variant="outline" onClick={cancelRequest}>
          <Clock className="h-4 w-4 mr-2" />
          Pending
        </Button>
      );
    }

    if (friendshipStatus.status === 'pending_received') {
      return (
        <div className="flex gap-2">
          <Button onClick={() => handleFriendRequest('accept')}>
            Accept Request
          </Button>
          <Button variant="outline" onClick={() => handleFriendRequest('reject')}>
            Decline
          </Button>
        </div>
      );
    }

    return (
      <Button onClick={sendFriendRequest} className="bg-black text-white hover:bg-gray-800">
        <UserPlus className="h-4 w-4 mr-2" />
        Add Friend
      </Button>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-5xl mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-32 w-32 bg-gray-200 rounded-full mx-auto mb-4"></div>
            <div className="h-6 bg-gray-200 rounded w-1/3 mx-auto mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold">Profile not found</h1>
        </div>
      </div>
    );
  }

  const isOwnProfile = user && user.id === profile.id;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-5xl mx-auto px-4">
        <Card className="mb-8">
          <CardContent className="pt-8">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <Avatar className="h-32 w-32">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback className="text-3xl">
                  {getInitials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-2">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">{profile.full_name}</h1>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <Link 
                        href={`/profile/${profile.id}?tab=friends`}
                        className="flex items-center gap-1 hover:text-blue-600"
                      >
                        <Users className="h-4 w-4" />
                        <span className="font-semibold">{friendsCount}</span> friends
                      </Link>
                      <span className="flex items-center gap-1">
                        <span className="font-semibold">{articles.length}</span> articles
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {getFriendButton()}
                    {user && user.id !== profile.id && (
                      <Button
                        onClick={() => router.push(`/messages?user=${profile.id}`)}
                        variant="outline"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Message
                      </Button>
                    )}
                    {isOwnProfile && (
                      <Button variant="outline" asChild>
                        <Link href="/settings">Edit Profile</Link>
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2 text-gray-600">
                  {profile.institution && (
                    <p className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {profile.institution}
                    </p>
                  )}
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {profile.email}
                  </p>
                  {profile.website && (
                    <p className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      <a
                        href={profile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {profile.website}
                      </a>
                    </p>
                  )}
                </div>
                {profile.bio && (
                  <p className="mt-4 text-gray-700">{profile.bio}</p>
                )}
                {profile.research_interests &&
                  profile.research_interests.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-sm font-semibold mb-2">
                        Research Interests
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {profile.research_interests.map((interest) => (
                          <Badge key={interest} variant="secondary">
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="articles" className="mb-6">
          <TabsList>
            <TabsTrigger value="articles">Articles ({articles.length})</TabsTrigger>
            <TabsTrigger value="friends">Friends ({friendsCount})</TabsTrigger>
          </TabsList>

          <TabsContent value="articles" className="mt-6">
            {articles.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-500">No published articles yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {articles.map((article) => (
                  <Link href={`/articles/${article.slug}`} key={article.id}>
                    <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                      {article.cover_image && (
                        <div className="h-48 overflow-hidden rounded-t-lg">
                          <img
                            src={article.cover_image}
                            alt={article.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <CardHeader>
                        <CardTitle className="line-clamp-2">
                          {article.title}
                        </CardTitle>
                        <CardDescription>
                          {article.published_at &&
                            formatDistanceToNow(new Date(article.published_at), {
                              addSuffix: true,
                            })}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-600 line-clamp-3">
                          {article.excerpt}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="friends" className="mt-6">
            {friends.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-500">
                    {isOwnProfile ? "You haven't added any friends yet." : "No friends to show."}
                  </p>
                  {isOwnProfile && (
                    <Button asChild className="mt-4">
                      <Link href="/researchers">Find Researchers</Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
                {friends.map((friendship) => {
                  const friend = friendship.friend;
                  return (
                    <Link href={`/profile/${friend.id}`} key={friendship.id}>
                      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <Avatar className="h-20 w-20 mx-auto mb-3">
                              <AvatarImage src={friend.avatar_url} />
                              <AvatarFallback>
                                {getInitials(friend.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <h3 className="font-semibold truncate">
                              {friend.full_name}
                            </h3>
                            {friend.institution && (
                              <p className="text-xs text-gray-500 truncate mt-1">
                                {friend.institution}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
