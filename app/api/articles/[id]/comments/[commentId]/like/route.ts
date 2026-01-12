import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Toggle like on a comment
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const params = await context.params;
    const commentId = params.commentId;

    // Check if already liked
    const { data: existingLike } = await supabaseAdmin
      .from('comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('profile_id', user.id)
      .maybeSingle();

    let liked = false;

    if (existingLike) {
      // Unlike
      await supabaseAdmin
        .from('comment_likes')
        .delete()
        .eq('id', existingLike.id);
      liked = false;
    } else {
      // Like
      await supabaseAdmin
        .from('comment_likes')
        .insert({
          comment_id: commentId,
          profile_id: user.id,
        });
      liked = true;
    }

    // Get updated likes count
    const { count: likesCount } = await supabaseAdmin
      .from('comment_likes')
      .select('*', { count: 'exact', head: true })
      .eq('comment_id', commentId);

    return NextResponse.json({
      liked,
      likes_count: likesCount || 0,
    });
  } catch (error) {
    console.error('Error toggling comment like:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
