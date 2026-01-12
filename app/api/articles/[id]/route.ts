import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Update article
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: articleId } = await params;

    // Verify ownership
    const { data: article, error: fetchError } = await supabaseAdmin
      .from('articles')
      .select('created_by')
      .eq('id', articleId)
      .single();

    if (fetchError || !article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    if (article.created_by !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to update this article' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, slug, content, excerpt, cover_image, status } = body;

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    // Check if new slug conflicts with another article
    if (slug) {
      const { data: existingArticle } = await supabaseAdmin
        .from('articles')
        .select('id')
        .eq('slug', slug)
        .neq('id', articleId)
        .maybeSingle();

      if (existingArticle) {
        return NextResponse.json(
          { error: 'An article with this slug already exists' },
          { status: 409 }
        );
      }
    }

    const updateData = {
      title: title.trim(),
      slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      content: content.trim(),
      excerpt: excerpt || null,
      cover_image: cover_image || null,
      status: status || 'draft',
      updated_at: new Date().toISOString(),
      ...(status === 'published' && { published_at: new Date().toISOString() }),
    };

    const { data: updatedArticle, error: updateError } = await supabaseAdmin
      .from('articles')
      .update(updateData)
      .eq('id', articleId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating article:', updateError);
      return NextResponse.json(
        { error: 'Failed to update article' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedArticle);
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete article
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: articleId } = await params;
    console.log('DELETE API route called for article:', articleId);

    const user = await currentUser();
    console.log('User ID from Clerk:', user?.id);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Attempting to delete article:', articleId, 'by user:', user.id);

    // Verify ownership
    const { data: article, error: fetchError } = await supabaseAdmin
      .from('articles')
      .select('created_by')
      .eq('id', articleId)
      .eq('created_by', user.id)
      .single();

    console.log('Article lookup result:', { article, fetchError });

    if (fetchError || !article) {
      console.error('Fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Article not found or you do not have permission to delete it' },
        { status: 404 }
      );
    }

    // Delete the article
    const { error: deleteError } = await supabaseAdmin
      .from('articles')
      .delete()
      .eq('id', articleId);

    console.log('Delete result:', { deleteError });

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    console.log('Article deleted successfully');
    return NextResponse.json(
      { success: true, message: 'Article deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Server error in DELETE route:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
