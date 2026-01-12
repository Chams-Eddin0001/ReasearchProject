import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Create new article
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
    const { title, slug, content, excerpt, cover_image, status, media_type, media_url, mentions } = body;

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const { data: existingArticle } = await supabaseAdmin
      .from('articles')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (existingArticle) {
      return NextResponse.json(
        { error: 'An article with this slug already exists' },
        { status: 409 }
      );
    }

    const articleData = {
      title: title.trim(),
      slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      content: content.trim(),
      excerpt: excerpt || null,
      cover_image: cover_image || null,
      media_type: media_type || null,
      media_url: media_url || null,
      status: status || 'draft',
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...(status === 'published' && { published_at: new Date().toISOString() }),
    };

    const { data: article, error } = await supabaseAdmin
      .from('articles')
      .insert(articleData)
      .select()
      .single();

    if (error) {
      console.error('Error creating article:', error);
      return NextResponse.json(
        { error: 'Failed to create article', details: error },
        { status: 500 }
      );
    }

    // Handle mentions - create mention records and notifications
    if (mentions && mentions.length > 0 && article) {
      try {
        // Get profile IDs for mentioned usernames
        const { data: mentionedProfiles } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name')
          .in('id', mentions);

        if (mentionedProfiles && mentionedProfiles.length > 0) {
          // Create mention records
          const mentionRecords = mentionedProfiles.map(profile => ({
            mentioned_profile_id: profile.id,
            mentioner_profile_id: user.id,
            entity_type: 'article',
            entity_id: article.id
          }));

          await supabaseAdmin.from('mentions').insert(mentionRecords);

          // Create notifications for mentioned users
          const notifications = mentionedProfiles.map(profile => ({
            profile_id: profile.id,
            type: 'mention',
            entity_type: 'article',
            entity_id: article.id,
            created_by: user.id,
            message: `mentioned you in an article: ${title.substring(0, 50)}...`
          }));

          await supabaseAdmin.from('notifications').insert(notifications);
        }
      } catch (mentionError) {
        console.error('Error handling mentions:', mentionError);
        // Continue anyway - article was created successfully
      }
    }

    return NextResponse.json(article, { status: 201 });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get all articles (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');

    let query = supabaseAdmin.from('articles').select('*');

    if (status) {
      query = query.eq('status', status);
    }

    if (userId) {
      query = query.eq('created_by', userId);
    }

    const { data: articles, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching articles:', error);
      return NextResponse.json(
        { error: 'Failed to fetch articles' },
        { status: 500 }
      );
    }

    return NextResponse.json(articles);
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
