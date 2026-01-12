import { supabase } from './supabase';

export type NotificationType = 
  | 'comment'           // New comment on your article
  | 'reply'             // Reply to your comment
  | 'mention'           // Tagged in article or comment
  | 'group_invite'      // Invited to join a group
  | 'group_accept'      // Accepted to join a group
  | 'group_post'        // New post in your group
  | 'message'           // New message
  | 'like'              // Someone liked your content
  | 'article_published' // Your article was published
  | 'admin_action';     // Admin action (post approved/rejected)

interface CreateNotificationParams {
  userId: string;           // Who receives the notification
  actorId?: string;         // Who triggered the notification
  type: NotificationType;
  content: string;          // Notification message
  link?: string;            // Link to relevant page
}

/**
 * Create a new notification via API
 */
export async function createNotification({
  userId,
  actorId,
  type,
  content,
  link
}: CreateNotificationParams) {
  try {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        actor_id: actorId,
        type,
        content,
        link,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to create notification:', error);
      return { success: false, error };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Failed to create notification:', error);
    return { success: false, error };
  }
}

/**
 * Get all notifications for a user (reading is safe with client)
 */
export async function getUserNotifications(userId: string, limit = 50) {
  const { data, error } = await supabase
    .from('notifications')
    .select(`
      *,
      actor:profiles!actor_id(
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch notifications:', error);
    return { notifications: [], error };
  }

  return { notifications: data || [], error: null };
}

/**
 * Get unread notification count (reading is safe with client)
 */
export async function getUnreadCount(userId: string) {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) {
    console.error('Failed to fetch unread count:', error);
    return { count: 0, error };
  }

  return { count: count || 0, error: null };
}

/**
 * Mark notification(s) as read via API
 */
export async function markAsRead(notificationIds: string[]) {
  try {
    const response = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        notification_ids: notificationIds,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to mark as read:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to mark as read:', error);
    return { success: false, error };
  }
}

/**
 * Mark all notifications as read for a user via API
 */
export async function markAllAsRead(userId: string) {
  try {
    const response = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mark_all: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to mark all as read:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to mark all as read:', error);
    return { success: false, error };
  }
}

/**
 * Delete notification(s) via API
 */
export async function deleteNotifications(notificationIds: string[]) {
  try {
    const response = await fetch(`/api/notifications?ids=${notificationIds.join(',')}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to delete notifications:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to delete notifications:', error);
    return { success: false, error };
  }
}

/**
 * Subscribe to real-time notification updates (reading is safe)
 */
export function subscribeToNotifications(
  userId: string, 
  callback: (notification: any) => void
) {
  const subscription = supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();

  return subscription;
}

// ============================================
// NOTIFICATION TRIGGER HELPERS
// ============================================

/**
 * Notify when someone comments on an article
 */
export async function notifyArticleComment(
  articleId: string,
  articleTitle: string,
  articleAuthorId: string,
  commentAuthorId: string,
  commentAuthorName: string
) {
  // Don't notify if you commented on your own article
  if (articleAuthorId === commentAuthorId) return;

  await createNotification({
    userId: articleAuthorId,
    actorId: commentAuthorId,
    type: 'comment',
    content: `${commentAuthorName} commented on your article "${articleTitle}"`,
    link: `/articles/${articleId}`
  });
}

/**
 * Notify when someone replies to a comment
 */
export async function notifyCommentReply(
  articleSlug: string,
  parentCommentAuthorId: string,
  replyAuthorId: string,
  replyAuthorName: string
) {
  // Don't notify if you replied to yourself
  if (parentCommentAuthorId === replyAuthorId) return;

  await createNotification({
    userId: parentCommentAuthorId,
    actorId: replyAuthorId,
    type: 'reply',
    content: `${replyAuthorName} replied to your comment`,
    link: `/articles/${articleSlug}`
  });
}

/**
 * Notify when accepted to join a group
 */
export async function notifyGroupAccepted(
  userId: string,
  groupId: string,
  groupName: string
) {
  await createNotification({
    userId,
    type: 'group_accept',
    content: `You have been accepted to join "${groupName}"`,
    link: `/groups/${groupId}`
  });
}

/**
 * Notify when invited to a group
 */
export async function notifyGroupInvite(
  userId: string,
  groupId: string,
  groupName: string,
  inviterId: string
) {
  await createNotification({
    userId,
    actorId: inviterId,
    type: 'group_invite',
    content: `You have been invited to join "${groupName}"`,
    link: `/groups/${groupId}`
  });
}

/**
 * Notify when there's a new post in a group
 */
export async function notifyGroupPost(
  groupId: string,
  groupName: string,
  postAuthorId: string,
  postAuthorName: string,
  memberIds: string[]
) {
  // Notify all group members except the post author
  const notifications = memberIds
    .filter(memberId => memberId !== postAuthorId)
    .map(memberId => 
      createNotification({
        userId: memberId,
        actorId: postAuthorId,
        type: 'group_post',
        content: `${postAuthorName} posted in "${groupName}"`,
        link: `/groups/${groupId}`
      })
    );

  await Promise.all(notifications);
}

/**
 * Notify when someone sends you a message
 */
export async function notifyNewMessage(
  recipientId: string,
  senderId: string,
  senderName: string,
  conversationId: string
) {
  // Don't notify if you messaged yourself
  if (recipientId === senderId) return;

  await createNotification({
    userId: recipientId,
    actorId: senderId,
    type: 'message',
    content: `${senderName} sent you a message`,
    link: `/messages?conversation=${conversationId}`
  });
}
