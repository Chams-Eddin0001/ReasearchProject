import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Create comment
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
    const { article_id, content, parent_id, mentions } = body;

    if (!article_id || !content?.trim()) {
      return NextResponse.json(
        { error: 'Article ID and content are required' },
        { status: 400 }
      );
    }

    const commentData = {
      article_id,
      profile_id: user.id,
      content: content.trim(),
      parent_id: parent_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: comment, error } = await supabaseAdmin
      .from('comments')
      .insert(commentData)
      .select()
      .single();

    if (error) {
      console.error('Error creating comment:', error);
      return NextResponse.json(
        { error: 'Failed to create comment', details: error },
        { status: 500 }
      );
    }

    // Handle mentions in comments
    if (mentions && mentions.length > 0 && comment) {
      try {
        // Get profile IDs for mentioned users
        const { data: mentionedProfiles } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name')
          .in('id', mentions);

        if (mentionedProfiles && mentionedProfiles.length > 0) {
          // Create mention records
          const mentionRecords = mentionedProfiles.map(profile => ({
            mentioned_profile_id: profile.id,
            mentioner_profile_id: user.id,
            entity_type: 'comment',
            entity_id: comment.id
          }));

          await supabaseAdmin.from('mentions').insert(mentionRecords);

          // Get article title for notification
          const { data: article } = await supabaseAdmin
            .from('articles')
            .select('title')
            .eq('id', article_id)
            .single();

          // Create notifications for mentioned users
          const notifications = mentionedProfiles.map(profile => ({
            profile_id: profile.id,
            type: 'mention',
            entity_type: 'comment',
            entity_id: comment.id,
            created_by: user.id,
            message: parent_id 
              ? `mentioned you in a reply` 
              : `mentioned you in a comment on "${article?.title || 'an article'}"`
          }));

          await supabaseAdmin.from('notifications').insert(notifications);
        }
      } catch (mentionError) {
        console.error('Error handling mentions:', mentionError);
        // Continue anyway - comment was created successfully
      }
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
