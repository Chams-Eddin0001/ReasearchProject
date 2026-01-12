import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 1) {
      return NextResponse.json([]);
    }

    // Search users by name
    const { data: users, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, avatar_url, institution')
      .ilike('full_name', `%${query}%`)
      .limit(10);

    if (error) throw error;

    return NextResponse.json(users || []);
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
