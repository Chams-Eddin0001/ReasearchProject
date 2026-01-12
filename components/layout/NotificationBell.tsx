'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getUnreadCount, subscribeToNotifications } from '@/lib/notifications';
import { Button } from '@/components/ui/button';

export function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    // Load initial count
    loadUnreadCount();

    // Subscribe to real-time updates
    const subscription = subscribeToNotifications(user.id, () => {
      loadUnreadCount();
    });

    // Refresh count every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [user]);

  const loadUnreadCount = async () => {
    if (!user) return;
    const { count } = await getUnreadCount(user.id);
    setUnreadCount(count);
  };

  if (!user) return null;

  return (
    <Link href="/notifications">
      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>
    </Link>
  );
}
