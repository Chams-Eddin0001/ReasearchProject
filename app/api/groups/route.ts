import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, cover_image, privacy, post_approval_required } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      );
    }

    // Create the group
    const { data: group, error: groupError } = await supabaseAdmin
      .from('groups')
      .insert({
        name: name.trim(),
        description: description || null,
        cover_image: cover_image || null,
        privacy: privacy || 'public',
        post_approval_required: post_approval_required || false,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (groupError) {
      console.error('Error creating group:', groupError);
      return NextResponse.json(
        { error: 'Failed to create group', details: groupError },
        { status: 500 }
      );
    }

    // The trigger automatically adds the creator as admin, so no need to manually insert
    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error('Error in group creation:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const privacy = searchParams.get('privacy');
    const userId = searchParams.get('userId');

    let query = supabaseAdmin.from('groups').select('*');

    // Filter by privacy if specified
    if (privacy === 'public' || privacy === 'private') {
      query = query.eq('privacy', privacy);
    }

    // Filter by creator if specified
    if (userId) {
      query = query.eq('created_by', userId);
    }

    const { data: groups, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching groups:', error);
      return NextResponse.json(
        { error: 'Failed to fetch groups', details: error },
        { status: 500 }
      );
    }

    return NextResponse.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}
