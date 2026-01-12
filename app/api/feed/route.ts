import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    
    if (!user) {
      // Return public articles for non-authenticated users
      const { data: articles, error } = await supabaseAdmin
        .from('articles')
        .select(`
          *,
          profile:profiles!created_by(*),
          article_likes(count),
          comments(count)
        `)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return NextResponse.json({ articles: articles || [], groupPosts: [] });
    }

    // Get user's friends
    const { data: friendships } = await supabaseAdmin
      .from('friendships')
      .select('requester_id, addressee_id')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq('status', 'accepted');

    const friendIds = friendships?.map(f => 
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    ) || [];

    // Get user's groups
    const { data: userGroups } = await supabaseAdmin
      .from('group_members')
      .select('group_id')
      .eq('profile_id', user.id);

    const groupIds = userGroups?.map(g => g.group_id) || [];

    // Fetch articles from friends
    const articlesPromise = friendIds.length > 0
      ? supabaseAdmin
          .from('articles')
          .select(`
            *,
            profile:profiles!created_by(*),
            article_likes(count),
            comments(count)
          `)
          .in('created_by', friendIds)
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [], error: null });

    // Fetch group posts from user's groups
    const groupPostsPromise = groupIds.length > 0
      ? supabaseAdmin
          .from('group_posts')
          .select(`
            *,
            author:profiles!author_id(*),
            group:groups(*),
            group_post_likes(count),
            group_post_comments(count)
          `)
          .in('group_id', groupIds)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [], error: null });

    const [articlesResult, groupPostsResult] = await Promise.all([
      articlesPromise,
      groupPostsPromise,
    ]);

    if (articlesResult.error) throw articlesResult.error;
    if (groupPostsResult.error) throw groupPostsResult.error;

    // Combine and sort by date
    const articles = (articlesResult.data || []).map((a: any) => ({
      ...a,
      type: 'article',
      date: a.published_at || a.created_at,
      likes_count: a.article_likes?.[0]?.count || 0,
      comments_count: a.comments?.[0]?.count || 0,
    }));

    const groupPosts = (groupPostsResult.data || []).map((p: any) => ({
      ...p,
      type: 'group_post',
      date: p.created_at,
      likes_count: p.group_post_likes?.[0]?.count || 0,
      comments_count: p.group_post_comments?.[0]?.count || 0,
    }));

    // Combine and sort
    const feed = [...articles, ...groupPosts].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return NextResponse.json({
      feed,
      articles,
      groupPosts,
      friendsCount: friendIds.length,
      groupsCount: groupIds.length,
    });
  } catch (error) {
    console.error('Error fetching feed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
