import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase, Comment, Profile } from '@/lib/supabase';
import { toast } from 'sonner';
import { notifyCommentReply } from '@/lib/notifications';

interface CommentWithAuthor extends Comment {
  author?: Profile | null;
  replies?: CommentWithAuthor[];
}

interface CommentThreadProps {
  comment: CommentWithAuthor;
  articleId: string;
  currentUserId?: string;
  onDelete: (commentId: string, commentContent: string) => void;
  onReplySuccess: () => void;
  removingCommentId: string | null;
  depth?: number;
}

const MAX_DEPTH = 3; // Maximum nesting level

export function CommentThread({ 
  comment, 
  articleId,
  currentUserId, 
  onDelete, 
  onReplySuccess,
  removingCommentId,
  depth = 0 
}: CommentThreadProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replies, setReplies] = useState<CommentWithAuthor[]>([]);
  const [showReplies, setShowReplies] = useState(true);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [repliesLoaded, setRepliesLoaded] = useState(false);

  const isCommentAuthor = currentUserId && comment.profile_id === currentUserId;
  const canReply = depth < MAX_DEPTH;

  // Load replies when comment is first shown
  React.useEffect(() => {
    if (!repliesLoaded) {
      loadReplies();
    }
  }, []);

  const loadReplies = async () => {
    setLoadingReplies(true);
    // Reading data is safe with client-side supabase
    const { data } = await supabase
      .from('comments')
      .select(`
        *,
        author:profiles!profile_id(*)
      `)
      .eq('parent_id', comment.id)
      .order('created_at', { ascending: true });

    if (data) {
      setReplies(data as CommentWithAuthor[]);
      setRepliesLoaded(true);
    }
    setLoadingReplies(false);
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId || !replyContent.trim()) return;

    setSubmitting(true);

    try {
      // Use API route for creating comment
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          article_id: articleId,
          content: replyContent,
          parent_id: comment.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to post reply');
      }

      const newComment = await response.json();
      toast.success('Reply posted!');
      
      // Trigger notification
      if (comment.profile_id !== currentUserId) {
        // Get article slug for the link (reading is safe)
        const { data: articleData } = await supabase
          .from('articles')
          .select('slug')
          .eq('id', articleId)
          .single();
        
        // Get current user's name (reading is safe)
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', currentUserId)
          .single();

        if (articleData && profileData) {
          await notifyCommentReply(
            articleData.slug,
            comment.profile_id,
            currentUserId,
            profileData.full_name
          );
        }
      }
      
      setReplyContent('');
      setIsReplying(false);
      await loadReplies();
      setShowReplies(true);
      onReplySuccess();
    } catch (error: any) {
      console.error('Error posting reply:', error);
      toast.error(error.message || 'Failed to post reply');
    } finally {
      setSubmitting(false);
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

  // Calculate left margin based on depth (indent nested comments)
  const marginLeft = depth * 32; // 32px per level

  return (
    <div 
      className={`transition-all duration-300 ${
        removingCommentId === comment.id 
          ? 'opacity-0 scale-95 -translate-x-full' 
          : 'opacity-100 scale-100 translate-x-0'
      }`}
      style={{ marginLeft: depth > 0 ? `${marginLeft}px` : '0' }}
    >
      <div className="flex gap-3 py-4">
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={comment.author?.avatar_url || undefined} />
          <AvatarFallback>
            {getInitials(comment.author?.full_name || null)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-gray-900">
                {comment.author?.full_name || 'Anonymous'}
              </span>
              <span className="text-sm text-gray-500">
                {formatDate(comment.created_at)}
              </span>
              {depth > 0 && (
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  Reply
                </span>
              )}
            </div>
            {isCommentAuthor && (
              <button
                onClick={() => onDelete(comment.id, comment.content)}
                className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors flex-shrink-0"
                title="Delete comment"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <p className="text-gray-700 whitespace-pre-wrap break-words mb-2">
            {comment.content}
          </p>

          <div className="flex items-center gap-4">
            {currentUserId && canReply && (
              <button
                onClick={() => setIsReplying(!isReplying)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Reply
              </button>
            )}

            {replies.length > 0 && (
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="text-sm text-gray-600 hover:text-gray-800 font-medium flex items-center gap-1"
              >
                {showReplies ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" />
                    Hide {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" />
                    Show {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                  </>
                )}
              </button>
            )}
          </div>

          {/* Reply Form */}
          {isReplying && (
            <form onSubmit={handleReplySubmit} className="mt-3">
              <Textarea
                placeholder="Write a reply..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                rows={2}
                className="mb-2"
                required
              />
              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  size="sm" 
                  disabled={submitting || !replyContent.trim()}
                >
                  {submitting ? 'Posting...' : 'Post Reply'}
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setIsReplying(false);
                    setReplyContent('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Nested Replies */}
      {showReplies && replies.length > 0 && (
        <div className="border-l-2 border-gray-200 ml-5">
          {replies.map((reply) => (
            <CommentThread
              key={reply.id}
              comment={reply}
              articleId={articleId}
              currentUserId={currentUserId}
              onDelete={onDelete}
              onReplySuccess={onReplySuccess}
              removingCommentId={removingCommentId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}

      {loadingReplies && (
        <div className="ml-12 text-sm text-gray-500 py-2">
          Loading replies...
        </div>
      )}
    </div>
  );
}
