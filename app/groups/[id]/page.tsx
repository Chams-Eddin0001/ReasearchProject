'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Group, GroupPost, Profile } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileUpload } from '@/components/upload/FileUpload';
import { CommentSection } from '@/components/comments/CommentSection';
import { 
  ArrowLeft, Users, Settings as SettingsIcon, 
  Image as ImageIcon, Video, FileText, ThumbsUp,
  Check, X
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface GroupWithRole extends Group {
  user_role?: 'admin' | 'moderator' | 'member' | null;
  member_count: number;
}

interface PostWithAuthor extends GroupPost {
  author?: Profile;
  likes_count: number;
  user_liked: boolean;
}

export default function GroupPage() {
  const params = useParams();
  const router = useRouter();
  const { user, profile } = useAuth();
  const groupId = params.id as string;

  const [group, setGroup] = useState<GroupWithRole | null>(null);
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'pdf'>('image');
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (groupId) {
      fetchGroup();
      fetchPosts();
      fetchMembers();
    }
  }, [groupId, user]);

  const fetchGroup = async () => {
    const { data: groupData } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (groupData) {
      const { count: memberCount } = await supabase
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId);

      let userRole = null;
      if (user) {
        const { data: memberData } = await supabase
          .from('group_members')
          .select('role')
          .eq('group_id', groupId)
          .eq('profile_id', user.id)
          .maybeSingle();
        userRole = memberData?.role || null;
      }

      setGroup({
        ...groupData,
        user_role: userRole,
        member_count: memberCount || 0,
      });
    }

    setLoading(false);
  };

  const fetchPosts = async () => {
    const query = supabase
      .from('group_posts')
      .select(`
        *,
        author:profiles!author_id(*)
      `)
      .eq('group_id', groupId);

    // Only show approved posts for non-admins
    if (!group?.user_role || (group.user_role !== 'admin' && group.user_role !== 'moderator')) {
      query.eq('status', 'approved');
    }

    const { data: postsData } = await query.order('created_at', { ascending: false });

    if (postsData) {
      const postsWithStats = await Promise.all(
        postsData.map(async (post) => {
          const { count: likesCount } = await supabase
            .from('group_post_likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          let userLiked = false;
          if (user) {
            const { data: likeData } = await supabase
              .from('group_post_likes')
              .select('id')
              .eq('post_id', post.id)
              .eq('profile_id', user.id)
              .maybeSingle();
            userLiked = !!likeData;
          }

          return {
            ...post,
            likes_count: likesCount || 0,
            user_liked: userLiked,
          } as PostWithAuthor;
        })
      );

      setPosts(postsWithStats);
    }
  };

  const fetchMembers = async () => {
    const { data: memberData } = await supabase
      .from('group_members')
      .select('profile:profiles(*)')
      .eq('group_id', groupId);

    if (memberData) {
      setMembers(memberData.map((m: any) => m.profile).filter(Boolean));
    }
  };

  const joinGroup = async () => {
    if (!user) {
      toast.error('Please sign in to join this group');
      return;
    }

    const { error } = await supabase.from('group_members').insert({
      group_id: groupId,
      profile_id: user.id,
      role: 'member',
    });

    if (error) {
      toast.error('Failed to join group');
    } else {
      toast.success('Joined group successfully!');
      fetchGroup();
      fetchMembers();
    }
  };

  const leaveGroup = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('profile_id', user.id);

    if (error) {
      toast.error('Failed to leave group');
    } else {
      toast.success('Left group successfully');
      fetchGroup();
      fetchMembers();
    }
  };

  const createPost = async () => {
    if (!user || !group) return;

    if (!newPostContent.trim()) {
      toast.error('Post content is required');
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from('group_posts').insert({
      group_id: groupId,
      author_id: user.id,
      content: newPostContent,
      media_type: mediaUrl ? mediaType : null,
      media_url: mediaUrl || null,
    });

    if (error) {
      toast.error('Failed to create post');
    } else {
      if (group.post_approval_required) {
        toast.success('Post submitted for approval');
      } else {
        toast.success('Post created successfully!');
      }
      setNewPostContent('');
      setMediaUrl('');
      setShowMediaUpload(false);
      fetchPosts();
    }

    setSubmitting(false);
  };

  const approvePost = async (postId: string) => {
    const { error } = await supabase
      .from('group_posts')
      .update({ status: 'approved' })
      .eq('id', postId);

    if (error) {
      toast.error('Failed to approve post');
    } else {
      toast.success('Post approved');
      fetchPosts();
    }
  };

  const rejectPost = async (postId: string) => {
    const { error } = await supabase
      .from('group_posts')
      .update({ status: 'rejected' })
      .eq('id', postId);

    if (error) {
      toast.error('Failed to reject post');
    } else {
      toast.success('Post rejected');
      fetchPosts();
    }
  };

  const toggleLike = async (postId: string, currentlyLiked: boolean) => {
    if (!user) {
      toast.error('Please sign in to like posts');
      return;
    }

    if (currentlyLiked) {
      await supabase
        .from('group_post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('profile_id', user.id);
    } else {
      await supabase.from('group_post_likes').insert({
        post_id: postId,
        profile_id: user.id,
      });
    }

    fetchPosts();
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
    if (!dateString) return '';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold mb-4">Group not found</h1>
          <Button asChild>
            <Link href="/groups">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Groups
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const isAdmin = group.user_role === 'admin';
  const isModerator = group.user_role === 'moderator' || isAdmin;
  const isMember = !!group.user_role;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/groups">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Groups
          </Link>
        </Button>

        {/* Group Header */}
        <Card className="mb-6">
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
              <div className="flex-1">
                <CardTitle className="text-3xl mb-2">{group.name}</CardTitle>
                <p className="text-gray-600 mb-4">{group.description}</p>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {group.member_count} members
                  </span>
                  <Badge variant="secondary">
                    {group.privacy === 'private' ? 'Private' : 'Public'}
                  </Badge>
                  {group.post_approval_required && (
                    <Badge variant="secondary">Post Approval Required</Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {isMember ? (
                  <>
                    {isAdmin && (
                      <Button variant="outline" size="sm">
                        <SettingsIcon className="h-4 w-4 mr-2" />
                        Settings
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={leaveGroup}>
                      Leave Group
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    onClick={joinGroup}
                    className="bg-black text-white hover:bg-gray-800"
                  >
                    Join Group
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Create Post */}
            {isMember && (
              <Card>
                <CardContent className="pt-6">
                  <Textarea
                    placeholder="Share something with the group..."
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    rows={3}
                    className="mb-4"
                  />
                  
                  {/* Media Type Selector */}
                  <div className="flex gap-2 mb-4">
                    <Button
                      type="button"
                      size="sm"
                      variant={showMediaUpload && mediaType === 'image' ? 'default' : 'outline'}
                      onClick={() => {
                        setMediaType('image');
                        setShowMediaUpload(true);
                      }}
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Image
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={showMediaUpload && mediaType === 'video' ? 'default' : 'outline'}
                      onClick={() => {
                        setMediaType('video');
                        setShowMediaUpload(true);
                      }}
                    >
                      <Video className="h-4 w-4 mr-2" />
                      Video
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={showMediaUpload && mediaType === 'pdf' ? 'default' : 'outline'}
                      onClick={() => {
                        setMediaType('pdf');
                        setShowMediaUpload(true);
                      }}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                    {showMediaUpload && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setShowMediaUpload(false);
                          setMediaUrl('');
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* File Upload */}
                  {showMediaUpload && (
                    <div className="mb-4">
                      <FileUpload
                        type={mediaType}
                        entityType="group_post"
                        currentUrl={mediaUrl}
                        onUploadComplete={(url) => setMediaUrl(url)}
                      />
                    </div>
                  )}

                  <Button
                    onClick={createPost}
                    disabled={submitting}
                    className="bg-black text-white hover:bg-gray-800"
                  >
                    {submitting ? 'Posting...' : 'Post'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Posts */}
            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all">All Posts</TabsTrigger>
                {isModerator && (
                  <TabsTrigger value="pending">
                    Pending ({posts.filter((p) => p.status === 'pending').length})
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="all" className="space-y-4">
                {posts.filter((p) => p.status === 'approved').length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-gray-500">No posts yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  posts
                    .filter((p) => p.status === 'approved')
                    .map((post) => (
                      <Card key={post.id}>
                        <CardContent className="pt-6">
                          <div className="flex gap-4 mb-4">
                            <Link href={`/profile/${post.author?.id}`}>
                              <Avatar>
                                <AvatarImage src={post.author?.avatar_url || undefined} />
                                <AvatarFallback>
                                  {getInitials(post.author?.full_name || null)}
                                </AvatarFallback>
                              </Avatar>
                            </Link>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <Link 
                                    href={`/profile/${post.author?.id}`}
                                    className="font-medium hover:underline"
                                  >
                                    {post.author?.full_name || 'Anonymous'}
                                  </Link>
                                  <p className="text-xs text-gray-500">
                                    {formatDate(post.created_at)}
                                  </p>
                                </div>
                              </div>
                              <p className="text-gray-700 mb-4 whitespace-pre-wrap">{post.content}</p>

                              {post.media_url && (
                                <div className="mb-4">
                                  {post.media_type === 'image' && (
                                    <img
                                      src={post.media_url}
                                      alt="Post media"
                                      className="rounded-lg max-h-96 w-full object-cover"
                                    />
                                  )}
                                  {post.media_type === 'video' && (
                                    <video
                                      src={post.media_url}
                                      controls
                                      className="rounded-lg max-h-96 w-full"
                                    />
                                  )}
                                  {post.media_type === 'pdf' && (
                                    <a
                                      href={post.media_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 text-blue-600 hover:underline"
                                    >
                                      <FileText className="h-4 w-4" />
                                      View PDF
                                    </a>
                                  )}
                                </div>
                              )}

                              <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                                <button
                                  onClick={() => toggleLike(post.id, post.user_liked)}
                                  className={`flex items-center gap-1 hover:text-blue-600 ${
                                    post.user_liked ? 'text-blue-600' : ''
                                  }`}
                                >
                                  <ThumbsUp className="h-4 w-4" />
                                  {post.likes_count > 0 && post.likes_count}
                                </button>
                              </div>

                              {/* Comment Section for each post */}
                              <div className="border-t pt-4">
                                <CommentSection
                                  entityId={post.id}
                                  entityType="group_post"
                                  currentUser={user ? {
                                    id: user.id,
                                    full_name: profile?.full_name || user.firstName || 'User',
                                    avatar_url: profile?.avatar_url || user.imageUrl,
                                  } : undefined}
                                />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                )}
              </TabsContent>

              {isModerator && (
                <TabsContent value="pending" className="space-y-4">
                  {posts.filter((p) => p.status === 'pending').length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <p className="text-gray-500">No pending posts</p>
                      </CardContent>
                    </Card>
                  ) : (
                    posts
                      .filter((p) => p.status === 'pending')
                      .map((post) => (
                        <Card key={post.id}>
                          <CardContent className="pt-6">
                            <div className="flex gap-4">
                              <Avatar>
                                <AvatarImage src={post.author?.avatar_url || undefined} />
                                <AvatarFallback>
                                  {getInitials(post.author?.full_name || null)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <p className="font-medium mb-2">
                                  {post.author?.full_name || 'Anonymous'}
                                </p>
                                <p className="text-gray-700 mb-4">{post.content}</p>
                                {post.media_url && (
                                  <div className="mb-4">
                                    {post.media_type === 'image' && (
                                      <img
                                        src={post.media_url}
                                        alt="Post media"
                                        className="rounded-lg max-h-96"
                                      />
                                    )}
                                    {post.media_type === 'video' && (
                                      <video
                                        src={post.media_url}
                                        controls
                                        className="rounded-lg max-h-96"
                                      />
                                    )}
                                    {post.media_type === 'pdf' && (
                                      <a
                                        href={post.media_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-blue-600 hover:underline"
                                      >
                                        <FileText className="h-4 w-4" />
                                        View PDF
                                      </a>
                                    )}
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => approvePost(post.id)}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <Check className="h-4 w-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => rejectPost(post.id)}
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                  )}
                </TabsContent>
              )}
            </Tabs>
          </div>

          {/* Sidebar */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Members ({members.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {members.slice(0, 10).map((member) => (
                    <Link
                      key={member.id}
                      href={`/profile/${member.id}`}
                      className="flex items-center gap-2 hover:bg-gray-50 p-2 rounded"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback>
                          {getInitials(member.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{member.full_name || 'Anonymous'}</span>
                    </Link>
                  ))}
                  {members.length > 10 && (
                    <p className="text-sm text-gray-500 text-center">
                      +{members.length - 10} more
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
