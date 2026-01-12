'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { supabase, Profile } from '@/lib/supabase';

type User = {
  id: string;
  email?: string;
};

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut: clerkSignOut } = useClerk();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Transform Clerk user to match your existing interface
  const user: User | null = clerkUser
    ? {
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress,
      }
    : null;

  useEffect(() => {
    const initProfile = async () => {
      if (clerkUser) {
        await syncAndFetchProfile(clerkUser.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    };

    if (isLoaded) {
      initProfile();
    }
  }, [clerkUser, isLoaded]);

  const syncAndFetchProfile = async (userId: string) => {
    try {
      // Try to fetch the profile using the API route
      const response = await fetch('/api/profiles', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const profileData = await response.json();
        setProfile(profileData);
        return;
      }

      // If profile doesn't exist (404), create it
      if (response.status === 404) {
        console.log('Creating new profile for user:', userId);
        
        const createResponse = await fetch('/api/profiles', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (createResponse.ok) {
          const newProfile = await createResponse.json();
          console.log('Profile created successfully:', newProfile);
          setProfile(newProfile);
        } else {
          const errorData = await createResponse.json();
          console.error('Error creating profile:', errorData);
        }
      } else {
        const errorData = await response.json();
        console.error('Error fetching profile:', errorData);
      }
    } catch (error) {
      console.error('Error in syncAndFetchProfile:', error);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: 'No user logged in' };

    try {
      const response = await fetch('/api/profiles', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { error: errorData.error || 'Failed to update profile' };
      }

      const updatedProfile = await response.json();
      setProfile(updatedProfile);
      return { error: null };
    } catch (error: any) {
      console.error('Error updating profile:', error);
      return { error: error.message || 'Failed to update profile' };
    }
  };

  const signOut = async () => {
    await clerkSignOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading: loading || !isLoaded,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
