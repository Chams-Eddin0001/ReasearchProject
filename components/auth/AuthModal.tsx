'use client';

import Link from 'next/link';
import { useUser, useClerk } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BookOpen, PenSquare, User, LogOut, Settings } from 'lucide-react';

export function Navbar() {
  const { user, isSignedIn } = useUser();
  const { signOut, openSignIn } = useClerk();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <nav className="border-b bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <BookOpen className="h-6 w-6" />
              <span className="font-bold text-xl">Research Blog</span>
            </Link>
            <div className="hidden md:flex space-x-6">
              <Link
                href="/articles"
                className="text-gray-700 hover:text-gray-900 transition-colors"
              >
                Articles
              </Link>
              <Link
                href="/researchers"
                className="text-gray-700 hover:text-gray-900 transition-colors"
              >
                Researchers
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {isSignedIn ? (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/write">
                    <PenSquare className="h-4 w-4 mr-2" />
                    Write
                  </Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.imageUrl} />
                      <AvatarFallback>
                        {user?.fullName
                          ? getInitials(user.fullName)
                          : user?.firstName?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">
                        {user?.fullName || user?.firstName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {user?.primaryEmailAddress?.emailAddress}
                      </p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={`/profile/${user?.id}`}>
                        <User className="h-4 w-4 mr-2" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard">
                        <PenSquare className="h-4 w-4 mr-2" />
                        My Articles
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings">
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => signOut()}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button onClick={() => openSignIn()}>
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}