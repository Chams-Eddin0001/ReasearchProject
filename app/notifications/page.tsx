'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  MessageCircle, 
  Users, 
  FileText, 
  Heart,
  CheckCircle,
  Trash2,
  Check,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { 
  getUserNotifications, 
  markAsRead, 
  markAllAsRead, 
  deleteNotifications,
  subscribeToNotifications,
  NotificationType 
} from '@/lib/notifications';
import { toast } from 'sonner';

interface Notification {
  id: string;
  user_id: string;
  actor_id?: string;
  type: NotificationType;
  content: string;
  link?: string;
  read: boolean;
  created_at: string;
  actor?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }

    if (user) {
      loadNotifications();
      
      // Subscribe to real-time notifications
      const subscription = subscribeToNotifications(user.id, (newNotification) => {
        setNotifications(prev => [newNotification, ...prev]);
        toast.info('New notification received');
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user, authLoading]);

  const loadNotifications = async () => {
    if (!user) return;
    
    setLoading(true);
    const { notifications: data } = await getUserNotifications(user.id);
    setNotifications(data);
    setLoading(false);
  };

  const handleMarkAsRead = async (notificationIds: string[]) => {
    await markAsRead(notificationIds);
    setNotifications(prev =>
      prev.map(n => 
        notificationIds.includes(n.id) ? { ...n, read: true } : n
      )
    );
    toast.success('Marked as read');
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    await markAllAsRead(user.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success('All notifications marked as read');
  };

  const handleDelete = async (notificationIds: string[]) => {
    await deleteNotifications(notificationIds);
    setNotifications(prev => prev.filter(n => !notificationIds.includes(n.id)));
    setSelectedIds(new Set());
    toast.success('Deleted');
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await handleMarkAsRead([notification.id]);
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'comment':
      case 'reply':
        return <MessageCircle className="h-5 w-5" />;
      case 'group_invite':
      case 'group_accept':
      case 'group_post':
        return <Users className="h-5 w-5" />;
      case 'message':
        return <MessageCircle className="h-5 w-5" />;
      case 'like':
        return <Heart className="h-5 w-5" />;
      case 'article_published':
        return <FileText className="h-5 w-5" />;
      case 'admin_action':
        return <CheckCircle className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case 'comment':
      case 'reply':
        return 'bg-blue-100 text-blue-600';
      case 'group_invite':
      case 'group_accept':
      case 'group_post':
        return 'bg-purple-100 text-purple-600';
      case 'message':
        return 'bg-green-100 text-green-600';
      case 'like':
        return 'bg-pink-100 text-pink-600';
      case 'article_published':
        return 'bg-yellow-100 text-yellow-600';
      case 'admin_action':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
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

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  const filteredNotifications = notifications.filter(n => 
    filter === 'all' ? true : !n.read
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <Bell className="h-10 w-10" />
              Notifications
            </h1>
            <p className="text-gray-600">
              {unreadCount > 0 ? (
                <span className="font-medium text-blue-600">
                  {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                </span>
              ) : (
                "You're all caught up!"
              )}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button onClick={handleMarkAllAsRead} variant="outline">
              <Check className="h-4 w-4 mr-2" />
              Mark all as read
            </Button>
          )}
        </div>

        {/* Filters & Actions */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={filter === 'all' ? 'default' : 'outline'}
                  onClick={() => setFilter('all')}
                >
                  All ({notifications.length})
                </Button>
                <Button
                  size="sm"
                  variant={filter === 'unread' ? 'default' : 'outline'}
                  onClick={() => setFilter('unread')}
                >
                  Unread ({unreadCount})
                </Button>
              </div>

              {selectedIds.size > 0 && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleMarkAsRead(Array.from(selectedIds))}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Mark read ({selectedIds.size})
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(Array.from(selectedIds))}
                  >
                    <Trash2 className="h-4 w-4 mr-1 text-red-500" />
                    Delete ({selectedIds.size})
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notifications List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </h3>
              <p className="text-gray-500">
                {filter === 'unread' 
                  ? "You're all caught up! Check back later for new updates."
                  : "We'll notify you when something important happens."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map((notification) => (
              <Card
                key={notification.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  !notification.read ? 'bg-blue-50 border-blue-200' : 'bg-white'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedIds.has(notification.id)}
                      onChange={() => toggleSelect(notification.id)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />

                    {/* Icon */}
                    <div className={`p-2 rounded-full ${getNotificationColor(notification.type)} flex-shrink-0`}>
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div 
                      className="flex-1 min-w-0"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className={`text-sm mb-1 ${!notification.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                            {notification.content}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-gray-500">
                              {formatDate(notification.created_at)}
                            </span>
                            {!notification.read && (
                              <Badge variant="secondary" className="text-xs">
                                New
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Actor Avatar */}
                        {notification.actor && (
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarImage src={notification.actor.avatar_url} />
                            <AvatarFallback className="text-xs">
                              {getInitials(notification.actor.full_name)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete([notification.id]);
                      }}
                      className="text-gray-400 hover:text-red-500 p-1 flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
