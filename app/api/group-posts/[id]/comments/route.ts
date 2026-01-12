import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Get comments for a group post
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const postId = params.id;
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parent_id');

    const user = await currentUser();

    let query = supabaseAdmin
      .from('group_post_comments')
      .select(`
        *,
        profile:profiles!author_id(*)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (parentId) {
      query = query.eq('parent_id', parentId);
    } else {
      query = query.is('parent_id', null);
    }

    const { data: comments, error } = await query;

    if (error) throw error;

    // Add likes count and user liked status
    const commentsWithStats = await Promise.all(
      (comments || []).map(async (comment) => {
        const { count: likesCount } = await supabaseAdmin
          .from('group_post_comment_likes')
          .select('*', { count: 'exact', head: true })
          .eq('comment_id', comment.id);

        const { count: repliesCount } = await supabaseAdmin
          .from('group_post_comments')
          .select('*', { count: 'exact', head: true })
          .eq('parent_id', comment.id);

        let userLiked = false;
        if (user) {
          const { data: likeData } = await supabaseAdmin
            .from('group_post_comment_likes')
            .select('id')
            .eq('comment_id', comment.id)
            .eq('profile_id', user.id)
            .maybeSingle();
          userLiked = !!likeData;
        }

        return {
          ...comment,
          profile_id: comment.author_id, // Map author_id to profile_id for consistency
          likes_count: likesCount || 0,
          replies_count: repliesCount || 0,
          user_liked: userLiked,
        };
      })
    );

    return NextResponse.json(commentsWithStats);
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Post a comment
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
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
    const postId = params.id;
    const { content, parent_id } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      );
    }

    const { data: comment, error } = await supabaseAdmin
      .from('group_post_comments')
      .insert({
        post_id: postId,
        author_id: user.id,
        content: content.trim(),
        parent_id: parent_id || null,
      })
      .select(`
        *,
        profile:profiles!author_id(*)
      `)
      .single();

    if (error) throw error;

    // Create notification for post author
    const { data: post } = await supabaseAdmin
      .from('group_posts')
      .select('author_id')
      .eq('id', postId)
      .single();

    if (post && post.author_id !== user.id) {
      await supabaseAdmin.from('notifications').insert({
        user_id: post.author_id,
        actor_id: user.id,
        type: parent_id ? 'reply' : 'comment',
        content: parent_id ? 'replied to your comment' : 'commented on your post',
        link: `/groups/${postId}`,
      });
    }

    return NextResponse.json({
      ...comment,
      profile_id: comment.author_id,
    }, { status: 201 });
  } catch (error) {
    console.error('Error posting comment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
