'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Group } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Users, Lock, Globe } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface GroupWithStats extends Group {
  member_count: number;
  post_count: number;
  is_member: boolean;
}

export default function GroupsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState<GroupWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchGroups();
  }, [user]);

  const fetchGroups = async () => {
    const { data: groupsData } = await supabase
      .from('groups')
      .select('*')
      .order('created_at', { ascending: false });

    if (groupsData) {
      const groupsWithStats = await Promise.all(
        groupsData.map(async (group) => {
          const { count: memberCount } = await supabase
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);

          const { count: postCount } = await supabase
            .from('group_posts')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id)
            .eq('status', 'approved');

          let isMember = false;
          if (user) {
            const { data: membership } = await supabase
              .from('group_members')
              .select('id')
              .eq('group_id', group.id)
              .eq('profile_id', user.id)
              .maybeSingle();
            isMember = !!membership;
          }

          return {
            ...group,
            member_count: memberCount || 0,
            post_count: postCount || 0,
            is_member: isMember,
          };
        })
      );

      setGroups(groupsWithStats);
    }

    setLoading(false);
  };

  const filteredGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Groups</h1>
            <p className="text-gray-600">
              Join groups to collaborate with researchers
            </p>
          </div>
          {user && (
            <Button
              onClick={() => router.push('/groups/create')}
              className="bg-black text-white hover:bg-gray-800"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          )}
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : filteredGroups.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 mb-4">
                {searchQuery
                  ? 'No groups found matching your search.'
                  : 'No groups yet. Create the first one!'}
              </p>
              {user && !searchQuery && (
                <Button onClick={() => router.push('/groups/create')}>
                  Create Group
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGroups.map((group) => (
              <Link href={`/groups/${group.id}`} key={group.id}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                  {group.cover_image && (
                    <div className="h-48 overflow-hidden rounded-t-lg">
                      <img
                        src={group.cover_image}
                        alt={group.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="line-clamp-2 flex-1">
                        {group.name}
                      </CardTitle>
                      {group.privacy === 'private' ? (
                        <Lock className="h-4 w-4 text-gray-500 ml-2" />
                      ) : (
                        <Globe className="h-4 w-4 text-gray-500 ml-2" />
                      )}
                    </div>
                    <CardDescription className="line-clamp-2">
                      {group.description || 'No description'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {group.member_count} members
                      </span>
                      <span>{group.post_count} posts</span>
                    </div>
                    {group.is_member && (
                      <Badge className="mt-2" variant="secondary">
                        Member
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
