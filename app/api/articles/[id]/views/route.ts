import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Increment article views
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: articleId } = await params;

    // Get current views count
    const { data: article, error: fetchError } = await supabaseAdmin
      .from('articles')
      .select('views_count')
      .eq('id', articleId)
      .single();

    if (fetchError || !article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // Increment views
    const { error: updateError } = await supabaseAdmin
      .from('articles')
      .update({ views_count: (article.views_count || 0) + 1 })
      .eq('id', articleId);

    if (updateError) {
      console.error('Error incrementing views:', updateError);
      return NextResponse.json(
        { error: 'Failed to increment views' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
