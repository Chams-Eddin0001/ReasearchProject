'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Profile } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Search, UserPlus, UserCheck, UserX, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface ResearcherWithStatus extends Profile {
  friendship_status?: 'none' | 'pending_sent' | 'pending_received' | 'friends' | 'self';
  friendship_id?: string;
}

export default function ResearchersPage() {
  const { user } = useAuth();
  const [researchers, setResearchers] = useState<ResearcherWithStatus[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('discover');

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    await Promise.all([
      fetchResearchers(),
      fetchFriends(),
      fetchPendingRequests(),
      fetchSentRequests(),
    ]);
    setLoading(false);
  };

  const fetchResearchers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (data && user) {
      // Get friendship statuses
      const { data: friendships } = await supabase
        .from('friendships')
        .select('*')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      const researchersWithStatus = data.map((researcher) => {
        if (researcher.id === user.id) {
          return { ...researcher, friendship_status: 'self' as const };
        }

        const friendship = friendships?.find(
          (f) =>
            (f.requester_id === user.id && f.addressee_id === researcher.id) ||
            (f.addressee_id === user.id && f.requester_id === researcher.id)
        );

        if (!friendship) {
          return { ...researcher, friendship_status: 'none' as const };
        }

        if (friendship.status === 'accepted') {
          return {
            ...researcher,
            friendship_status: 'friends' as const,
            friendship_id: friendship.id,
          };
        }

        if (friendship.requester_id === user.id) {
          return {
            ...researcher,
            friendship_status: 'pending_sent' as const,
            friendship_id: friendship.id,
          };
        }

        return {
          ...researcher,
          friendship_status: 'pending_received' as const,
          friendship_id: friendship.id,
        };
      });

      setResearchers(researchersWithStatus);
    } else if (data) {
      setResearchers(data);
    }
  };

  const fetchFriends = async () => {
    if (!user) return;
    const response = await fetch('/api/friendships');
    const data = await response.json();
    setFriends(data || []);
  };

  const fetchPendingRequests = async () => {
    if (!user) return;
    const response = await fetch('/api/friendships?type=pending');
    const data = await response.json();
    setPendingRequests(data || []);
  };

  const fetchSentRequests = async () => {
    if (!user) return;
    const response = await fetch('/api/friendships?type=sent');
    const data = await response.json();
    setSentRequests(data || []);
  };

  const sendFriendRequest = async (addresseeId: string) => {
    if (!user) {
      toast.error('Please sign in to send friend requests');
      return;
    }

    try {
      const response = await fetch('/api/friendships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addressee_id: addresseeId }),
      });

      if (response.ok) {
        toast.success('Friend request sent!');
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to send request');
      }
    } catch (error) {
      toast.error('Failed to send friend request');
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
        toast.success(
          action === 'accept' ? 'Friend request accepted!' : 'Friend request rejected'
        );
        fetchData();
      }
    } catch (error) {
      toast.error('Failed to process request');
    }
  };

  const removeFriend = async (friendshipId: string) => {
    try {
      const response = await fetch(`/api/friendships/${friendshipId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Friend removed');
        fetchData();
      }
    } catch (error) {
      toast.error('Failed to remove friend');
    }
  };

  const cancelRequest = async (requestId: string) => {
    try {
      const response = await fetch(`/api/friendships/${requestId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Request cancelled');
        fetchData();
      }
    } catch (error) {
      toast.error('Failed to cancel request');
    }
  };

  const filteredResearchers = researchers.filter((researcher) => {
    const query = searchQuery.toLowerCase();
    const name = researcher.full_name?.toLowerCase() || '';
    const institution = researcher.institution?.toLowerCase() || '';
    const hasMatchingInterest = researcher.research_interests?.some((interest) =>
      interest.toLowerCase().includes(query)
    );

    return (
      name.includes(query) ||
      institution.includes(query) ||
      hasMatchingInterest
    );
  });

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getFriendButton = (researcher: ResearcherWithStatus) => {
    if (!user) {
      return (
        <Button size="sm" disabled>
          Sign in to connect
        </Button>
      );
    }

    if (researcher.friendship_status === 'self') {
      return (
        <Button size="sm" variant="outline" asChild>
          <Link href="/settings">Edit Profile</Link>
        </Button>
      );
    }

    if (researcher.friendship_status === 'friends') {
      return (
        <Button
          size="sm"
          variant="outline"
          onClick={() => removeFriend(researcher.friendship_id!)}
        >
          <UserCheck className="h-4 w-4 mr-2" />
          Friends
        </Button>
      );
    }

    if (researcher.friendship_status === 'pending_sent') {
      return (
        <Button
          size="sm"
          variant="outline"
          onClick={() => cancelRequest(researcher.friendship_id!)}
        >
          <Clock className="h-4 w-4 mr-2" />
          Pending
        </Button>
      );
    }

    if (researcher.friendship_status === 'pending_received') {
      return (
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => handleFriendRequest(researcher.friendship_id!, 'accept')}
          >
            Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleFriendRequest(researcher.friendship_id!, 'reject')}
          >
            Decline
          </Button>
        </div>
      );
    }

    return (
      <Button size="sm" onClick={() => sendFriendRequest(researcher.id)}>
        <UserPlus className="h-4 w-4 mr-2" />
        Add Friend
      </Button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Researchers</h1>
          <p className="text-gray-600">
            Connect with fellow researchers and build your network
          </p>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search by name, institution, or research interests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {user && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList>
              <TabsTrigger value="discover">Discover</TabsTrigger>
              <TabsTrigger value="friends">
                Friends ({friends.length})
              </TabsTrigger>
              <TabsTrigger value="requests">
                Requests ({pendingRequests.length})
              </TabsTrigger>
              <TabsTrigger value="sent">
                Sent ({sentRequests.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="discover">
              {loading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredResearchers
                    .filter((r) => r.friendship_status !== 'self')
                    .map((researcher) => (
                      <Card key={researcher.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-start gap-4">
                            <Link href={`/profile/${researcher.id}`}>
                              <Avatar className="h-16 w-16">
                                <AvatarImage src={researcher.avatar_url || undefined} />
                                <AvatarFallback className="text-lg">
                                  {getInitials(researcher.full_name)}
                                </AvatarFallback>
                              </Avatar>
                            </Link>
                            <div className="flex-1 min-w-0">
                              <Link href={`/profile/${researcher.id}`}>
                                <CardTitle className="text-lg hover:text-blue-600 cursor-pointer truncate">
                                  {researcher.full_name || 'Anonymous'}
                                </CardTitle>
                              </Link>
                              {researcher.institution && (
                                <CardDescription className="flex items-center gap-1 mt-1">
                                  <Building2 className="h-3 w-3" />
                                  <span className="truncate">{researcher.institution}</span>
                                </CardDescription>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {researcher.bio && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                              {researcher.bio}
                            </p>
                          )}
                          {researcher.research_interests &&
                            researcher.research_interests.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-4">
                                {researcher.research_interests.slice(0, 3).map((interest, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {interest}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          {getFriendButton(researcher)}
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="friends">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {friends.length === 0 ? (
                  <Card className="col-span-full">
                    <CardContent className="py-12 text-center">
                      <p className="text-gray-500">No friends yet. Start connecting!</p>
                    </CardContent>
                  </Card>
                ) : (
                  friends.map((friendship) => {
                    const friend = friendship.friend;
                    return (
                      <Card key={friendship.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-start gap-4">
                            <Link href={`/profile/${friend.id}`}>
                              <Avatar className="h-16 w-16">
                                <AvatarImage src={friend.avatar_url || undefined} />
                                <AvatarFallback className="text-lg">
                                  {getInitials(friend.full_name)}
                                </AvatarFallback>
                              </Avatar>
                            </Link>
                            <div className="flex-1 min-w-0">
                              <Link href={`/profile/${friend.id}`}>
                                <CardTitle className="text-lg hover:text-blue-600 cursor-pointer truncate">
                                  {friend.full_name || 'Anonymous'}
                                </CardTitle>
                              </Link>
                              {friend.institution && (
                                <CardDescription className="flex items-center gap-1 mt-1">
                                  <Building2 className="h-3 w-3" />
                                  <span className="truncate">{friend.institution}</span>
                                </CardDescription>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {friend.bio && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                              {friend.bio}
                            </p>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeFriend(friendship.id)}
                          >
                            <UserX className="h-4 w-4 mr-2" />
                            Unfriend
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </TabsContent>

            <TabsContent value="requests">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingRequests.length === 0 ? (
                  <Card className="col-span-full">
                    <CardContent className="py-12 text-center">
                      <p className="text-gray-500">No pending requests</p>
                    </CardContent>
                  </Card>
                ) : (
                  pendingRequests.map((request) => {
                    const requester = request.requester;
                    return (
                      <Card key={request.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-start gap-4">
                            <Avatar className="h-16 w-16">
                              <AvatarImage src={requester.avatar_url || undefined} />
                              <AvatarFallback className="text-lg">
                                {getInitials(requester.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <CardTitle className="text-lg">
                                {requester.full_name || 'Anonymous'}
                              </CardTitle>
                              {requester.institution && (
                                <CardDescription className="flex items-center gap-1 mt-1">
                                  <Building2 className="h-3 w-3" />
                                  {requester.institution}
                                </CardDescription>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleFriendRequest(request.id, 'accept')}
                              className="flex-1"
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleFriendRequest(request.id, 'reject')}
                              className="flex-1"
                            >
                              Decline
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </TabsContent>

            <TabsContent value="sent">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sentRequests.length === 0 ? (
                  <Card className="col-span-full">
                    <CardContent className="py-12 text-center">
                      <p className="text-gray-500">No sent requests</p>
                    </CardContent>
                  </Card>
                ) : (
                  sentRequests.map((request) => {
                    const addressee = request.addressee;
                    return (
                      <Card key={request.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-start gap-4">
                            <Avatar className="h-16 w-16">
                              <AvatarImage src={addressee.avatar_url || undefined} />
                              <AvatarFallback className="text-lg">
                                {getInitials(addressee.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <CardTitle className="text-lg">
                                {addressee.full_name || 'Anonymous'}
                              </CardTitle>
                              {addressee.institution && (
                                <CardDescription className="flex items-center gap-1 mt-1">
                                  <Building2 className="h-3 w-3" />
                                  {addressee.institution}
                                </CardDescription>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => cancelRequest(request.id)}
                          >
                            <UserX className="h-4 w-4 mr-2" />
                            Cancel Request
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}

        {!user && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResearchers.map((researcher) => (
              <Card key={researcher.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <Link href={`/profile/${researcher.id}`}>
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={researcher.avatar_url || undefined} />
                        <AvatarFallback className="text-lg">
                          {getInitials(researcher.full_name)}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1">
                      <Link href={`/profile/${researcher.id}`}>
                        <CardTitle className="text-lg hover:text-blue-600 cursor-pointer">
                          {researcher.full_name || 'Anonymous'}
                        </CardTitle>
                      </Link>
                      {researcher.institution && (
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <Building2 className="h-3 w-3" />
                          {researcher.institution}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {researcher.bio && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {researcher.bio}
                    </p>
                  )}
                  {researcher.research_interests &&
                    researcher.research_interests.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {researcher.research_interests.slice(0, 3).map((interest, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
