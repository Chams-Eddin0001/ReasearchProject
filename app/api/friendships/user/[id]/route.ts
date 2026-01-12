import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const userId = params.id;

    // Get all friendships for this user
    const { data: friendships, error } = await supabaseAdmin
      .from('friendships')
      .select(`
        *,
        requester:profiles!requester_id(*),
        addressee:profiles!addressee_id(*)
      `)
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Format response to return friend profiles
    const friends = friendships?.map((f: any) => ({
      id: f.id,
      created_at: f.created_at,
      friend: f.requester_id === userId ? f.addressee : f.requester,
    })) || [];

    return NextResponse.json({
      friends,
      count: friends.length,
    });
  } catch (error) {
    console.error('Error fetching user friends:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
