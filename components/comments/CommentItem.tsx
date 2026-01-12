'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MentionInput, renderMentions } from '@/components/mentions/MentionInput';
import { ThumbsUp, MessageCircle, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

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

interface CommentItemProps {
  comment: Comment;
  currentUserId?: string;
  onLike: (commentId: string) => void;
  onReply: (parentId: string, content: string, mentions: string[]) => void;
  onDelete: (commentId: string) => void;
  depth?: number;
  onLoadReplies?: (commentId: string) => void;
  repliesLoading?: boolean;
}

export function CommentItem({
  comment,
  currentUserId,
  onLike,
  onReply,
  onDelete,
  depth = 0,
  onLoadReplies,
  repliesLoading = false,
}: CommentItemProps) {
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replyMentions, setReplyMentions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showReplies, setShowReplies] = useState(false);

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return '';
    }
  };

  const handleReplySubmit = async () => {
    if (!replyContent.trim()) return;

    setSubmitting(true);
    await onReply(comment.id, replyContent, replyMentions);
    setReplyContent('');
    setReplyMentions([]);
    setShowReplyBox(false);
    setShowReplies(true);
    setSubmitting(false);
  };

  const handleLoadReplies = () => {
    if (onLoadReplies) {
      onLoadReplies(comment.id);
      setShowReplies(true);
    }
  };

  const isOwner = currentUserId === (comment.profile_id || comment.profile?.id);
  const hasReplies = (comment.replies_count || 0) > 0;

  // Indent based on depth, but cap at reasonable level for UI
  const indentClass = depth > 0 ? 'ml-12' : '';

  return (
    <div className={indentClass}>
      <div className="flex gap-3">
        <Link href={`/profile/${comment.profile?.id}`}>
          <Avatar className="h-8 w-8">
            <AvatarImage src={comment.profile?.avatar_url} />
            <AvatarFallback className="text-xs">
              {getInitials(comment.profile?.full_name || 'User')}
            </AvatarFallback>
          </Avatar>
        </Link>

        <div className="flex-1">
          <div className="bg-gray-100 rounded-2xl px-4 py-2">
            <Link
              href={`/profile/${comment.profile?.id}`}
              className="font-semibold text-sm hover:underline"
            >
              {comment.profile?.full_name || 'Anonymous'}
            </Link>
            <p className="text-sm mt-1 whitespace-pre-wrap break-words">
              {renderMentions(comment.content)}
            </p>
          </div>

          <div className="flex items-center gap-4 mt-1 ml-3 text-xs text-gray-600">
            <button
              onClick={() => onLike(comment.id)}
              className={`font-semibold hover:underline ${
                comment.user_liked ? 'text-blue-600' : ''
              }`}
            >
              Like {comment.likes_count ? `(${comment.likes_count})` : ''}
            </button>
            <button
              onClick={() => setShowReplyBox(!showReplyBox)}
              className="font-semibold hover:underline"
            >
              Reply
            </button>
            <span className="text-gray-500">{formatDate(comment.created_at)}</span>
            {isOwner && (
              <button
                onClick={() => onDelete(comment.id)}
                className="font-semibold text-red-600 hover:underline flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            )}
          </div>

          {/* Reply input box */}
          {showReplyBox && (
            <div className="mt-2 ml-3">
              <div className="flex gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={comment.profile?.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {getInitials(comment.profile?.full_name || 'U')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <MentionInput
                    value={replyContent}
                    onChange={(value, mentions) => {
                      setReplyContent(value);
                      setReplyMentions(mentions);
                    }}
                    placeholder="Write a reply..."
                    rows={2}
                    className="text-sm resize-none"
                  />
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      onClick={handleReplySubmit}
                      disabled={submitting || !replyContent.trim()}
                      className="h-7 text-xs"
                    >
                      {submitting ? 'Posting...' : 'Reply'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShowReplyBox(false);
                        setReplyContent('');
                        setReplyMentions([]);
                      }}
                      className="h-7 text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Show replies button */}
          {hasReplies && !showReplies && (
            <button
              onClick={handleLoadReplies}
              disabled={repliesLoading}
              className="ml-3 mt-2 text-sm font-semibold text-gray-600 hover:underline flex items-center gap-1"
            >
              <MessageCircle className="h-4 w-4" />
              {repliesLoading ? 'Loading...' : `View ${comment.replies_count} ${comment.replies_count === 1 ? 'reply' : 'replies'}`}
            </button>
          )}

          {/* Hide replies button */}
          {showReplies && hasReplies && (
            <button
              onClick={() => setShowReplies(false)}
              className="ml-3 mt-2 text-sm font-semibold text-gray-600 hover:underline"
            >
              Hide replies
            </button>
          )}

          {/* Replies - Infinite nesting */}
          {showReplies && comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-3">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  currentUserId={currentUserId}
                  onLike={onLike}
                  onReply={onReply}
                  onDelete={onDelete}
                  depth={depth + 1}
                  onLoadReplies={onLoadReplies}
                  repliesLoading={repliesLoading}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
