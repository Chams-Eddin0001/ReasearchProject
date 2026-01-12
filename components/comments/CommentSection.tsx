'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MentionInput } from '@/components/mentions/MentionInput';
import { CommentItem } from './CommentItem';
import { toast } from 'sonner';

interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  profile?: Profile;
  profile_id?: string;
  likes_count?: number;
  user_liked?: boolean;
  replies_count?: number;
  replies?: Comment[];
}

interface CommentSectionProps {
  entityId: string;
  entityType: 'article' | 'group_post';
  currentUser?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export function CommentSection({
  entityId,
  entityType,
  currentUser,
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newCommentMentions, setNewCommentMentions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [repliesLoading, setRepliesLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchComments();
  }, [entityId, entityType]);

  const fetchComments = async () => {
    try {
      const endpoint =
        entityType === 'article'
          ? `/api/articles/${entityId}/comments`
          : `/api/group-posts/${entityId}/comments`;

      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReplies = async (commentId: string) => {
    setRepliesLoading({ ...repliesLoading, [commentId]: true });

    try {
      const endpoint =
        entityType === 'article'
          ? `/api/articles/${entityId}/comments?parent_id=${commentId}`
          : `/api/group-posts/${entityId}/comments?parent_id=${commentId}`;

      const response = await fetch(endpoint);
      if (response.ok) {
        const replies = await response.json();
        
        // Update the comment with replies
        const updateCommentsWithReplies = (comments: Comment[]): Comment[] => {
          return comments.map((comment) => {
            if (comment.id === commentId) {
              return { ...comment, replies };
            }
            if (comment.replies) {
              return { ...comment, replies: updateCommentsWithReplies(comment.replies) };
            }
            return comment;
          });
        };

        setComments(updateCommentsWithReplies(comments));
      }
    } catch (error) {
      console.error('Error fetching replies:', error);
    } finally {
      setRepliesLoading({ ...repliesLoading, [commentId]: false });
    }
  };

  const handlePostComment = async () => {
    if (!currentUser) {
      toast.error('Please sign in to comment');
      return;
    }

    if (!newComment.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    setSubmitting(true);

    try {
      const endpoint =
        entityType === 'article'
          ? `/api/articles/${entityId}/comments`
          : `/api/group-posts/${entityId}/comments`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: newComment,
          mentions: newCommentMentions,
        }),
      });

      if (response.ok) {
        setNewComment('');
        setNewCommentMentions([]);
        toast.success('Comment posted!');
        fetchComments();
      } else {
        toast.error('Failed to post comment');
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      toast.error('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (parentId: string, content: string, mentions: string[]) => {
    if (!currentUser) {
      toast.error('Please sign in to reply');
      return;
    }

    try {
      const endpoint =
        entityType === 'article'
          ? `/api/articles/${entityId}/comments`
          : `/api/group-posts/${entityId}/comments`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content, 
          parent_id: parentId,
          mentions,
        }),
      });

      if (response.ok) {
        toast.success('Reply posted!');
        fetchReplies(parentId);
        
        // Update replies count
        const updateRepliesCount = (comments: Comment[]): Comment[] => {
          return comments.map((comment) => {
            if (comment.id === parentId) {
              return { ...comment, replies_count: (comment.replies_count || 0) + 1 };
            }
            if (comment.replies) {
              return { ...comment, replies: updateRepliesCount(comment.replies) };
            }
            return comment;
          });
        };

        setComments(updateRepliesCount(comments));
      } else {
        toast.error('Failed to post reply');
      }
    } catch (error) {
      console.error('Error posting reply:', error);
      toast.error('Failed to post reply');
    }
  };

  const handleLike = async (commentId: string) => {
    if (!currentUser) {
      toast.error('Please sign in to like comments');
      return;
    }

    try {
      const endpoint =
        entityType === 'article'
          ? `/api/articles/${entityId}/comments/${commentId}/like`
          : `/api/group-posts/${entityId}/comments/${commentId}/like`;

      const response = await fetch(endpoint, {
        method: 'POST',
      });

      if (response.ok) {
        const { liked, likes_count } = await response.json();
        
        // Update comment likes in state recursively
        const updateCommentLikes = (comments: Comment[]): Comment[] => {
          return comments.map((comment) => {
            if (comment.id === commentId) {
              return { ...comment, user_liked: liked, likes_count };
            }
            if (comment.replies) {
              return { ...comment, replies: updateCommentLikes(comment.replies) };
            }
            return comment;
          });
        };

        setComments(updateCommentLikes(comments));
      }
    } catch (error) {
      console.error('Error liking comment:', error);
      toast.error('Failed to like comment');
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!currentUser) return;

    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      const endpoint =
        entityType === 'article'
          ? `/api/articles/${entityId}/comments/${commentId}`
          : `/api/group-posts/${entityId}/comments/${commentId}`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Comment deleted');
        fetchComments();
      } else {
        toast.error('Failed to delete comment');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-6">
        <h3 className="text-lg font-semibold mb-4">
          Comments ({comments.length})
        </h3>

        {/* New comment input */}
        {currentUser ? (
          <div className="mb-6">
            <div className="flex gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={currentUser.avatar_url} />
                <AvatarFallback>
                  {getInitials(currentUser.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <MentionInput
                  value={newComment}
                  onChange={(value, mentions) => {
                    setNewComment(value);
                    setNewCommentMentions(mentions);
                  }}
                  placeholder="Write a comment... (use @ to mention someone)"
                  rows={3}
                  className="resize-none"
                />
                <div className="flex justify-end mt-2">
                  <Button
                    onClick={handlePostComment}
                    disabled={submitting || !newComment.trim()}
                    className="bg-black text-white hover:bg-gray-800"
                  >
                    {submitting ? 'Posting...' : 'Post Comment'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-gray-600">
              Please sign in to comment
            </p>
          </div>
        )}

        {/* Comments list */}
        <div className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No comments yet. Be the first to comment!
            </p>
          ) : (
            comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                currentUserId={currentUser?.id}
                onLike={handleLike}
                onReply={handleReply}
                onDelete={handleDelete}
                onLoadReplies={fetchReplies}
                repliesLoading={repliesLoading[comment.id]}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
