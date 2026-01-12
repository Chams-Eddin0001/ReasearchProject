import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Send friend request
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { addressee_id } = await request.json();

    if (!addressee_id) {
      return NextResponse.json(
        { error: 'Addressee ID is required' },
        { status: 400 }
      );
    }

    if (addressee_id === user.id) {
      return NextResponse.json(
        { error: 'Cannot send friend request to yourself' },
        { status: 400 }
      );
    }

    // Check if friendship already exists
    const { data: existing } = await supabaseAdmin
      .from('friendships')
      .select('*')
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${addressee_id}),and(requester_id.eq.${addressee_id},addressee_id.eq.${user.id})`)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'blocked') {
        return NextResponse.json(
          { error: 'Cannot send friend request' },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: 'Friend request already exists' },
        { status: 400 }
      );
    }

    // Create friend request
    const { data: friendship, error } = await supabaseAdmin
      .from('friendships')
      .insert({
        requester_id: user.id,
        addressee_id: addressee_id,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating friendship:', error);
      return NextResponse.json(
        { error: 'Failed to send friend request' },
        { status: 500 }
      );
    }

    // Create notification
    await supabaseAdmin.from('notifications').insert({
      user_id: addressee_id,
      actor_id: user.id,
      type: 'friend_request',
      content: 'sent you a friend request',
      link: `/profile/${user.id}`,
    });

    return NextResponse.json(friendship, { status: 201 });
  } catch (error) {
    console.error('Error in friend request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get friend requests and friends list
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'pending', 'friends', 'sent'

    if (type === 'pending') {
      // Get pending friend requests received
      const { data: requests, error } = await supabaseAdmin
        .from('friendships')
        .select(`
          *,
          requester:profiles!requester_id(*)
        `)
        .eq('addressee_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return NextResponse.json(requests);
    }

    if (type === 'sent') {
      // Get pending friend requests sent
      const { data: requests, error } = await supabaseAdmin
        .from('friendships')
        .select(`
          *,
          addressee:profiles!addressee_id(*)
        `)
        .eq('requester_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return NextResponse.json(requests);
    }

    // Get all friends (accepted)
    const { data: friendships, error } = await supabaseAdmin
      .from('friendships')
      .select(`
        *,
        requester:profiles!requester_id(*),
        addressee:profiles!addressee_id(*)
      `)
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Format response to return friend profiles
    const friends = friendships?.map((f: any) => ({
      id: f.id,
      created_at: f.created_at,
      friend: f.requester_id === user.id ? f.addressee : f.requester,
    }));

    return NextResponse.json(friends);
  } catch (error) {
    console.error('Error fetching friendships:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
