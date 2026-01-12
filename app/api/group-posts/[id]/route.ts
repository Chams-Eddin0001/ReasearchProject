import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: postId } = await params;

    // Get the post and group info
    const { data: post, error: fetchError } = await supabaseAdmin
      .from('group_posts')
      .select(`
        author_id,
        group_id,
        groups!inner(id)
      `)
      .eq('id', postId)
      .single();

    if (fetchError || !post) {
      console.error('Fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Check if user is the post author
    const isAuthor = post.author_id === userId;

    // Check if user is group admin/moderator
    const { data: membership } = await supabaseAdmin
      .from('group_members')
      .select('role')
      .eq('group_id', post.group_id)
      .eq('profile_id', userId)
      .single();

    const isModerator = membership && ['admin', 'moderator'].includes(membership.role);

    // User must be either the author or a moderator/admin
    if (!isAuthor && !isModerator) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this post' },
        { status: 403 }
      );
    }

    // Delete the post
    const { error: deleteError } = await supabaseAdmin
      .from('group_posts')
      .delete()
      .eq('id', postId);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Post deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
