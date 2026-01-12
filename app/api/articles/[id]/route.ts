import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// PATCH - Update article
export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } } // ✅ plain object
) {
  try {
    const { id } = context.params;

    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: article, error: fetchError } = await supabaseAdmin
      .from("articles")
      .select("created_by")
      .eq("id", id)
      .single();

    if (fetchError || !article) return NextResponse.json({ error: "Article not found" }, { status: 404 });
    if (article.created_by !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const { title, slug, content, excerpt, cover_image, status } = body;

    if (!title?.trim() || !content?.trim()) return NextResponse.json({ error: "Title and content are required" }, { status: 400 });

    // Check slug conflict
    if (slug) {
      const { data: existingArticle } = await supabaseAdmin
        .from("articles")
        .select("id")
        .eq("slug", slug)
        .neq("id", id)
        .maybeSingle();
      if (existingArticle) return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    }

    const updateData = {
      title: title.trim(),
      slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      content: content.trim(),
      excerpt: excerpt || null,
      cover_image: cover_image || null,
      status: status || "draft",
      updated_at: new Date().toISOString(),
      ...(status === "published" && { published_at: new Date().toISOString() }),
    };

    const { data: updatedArticle, error: updateError } = await supabaseAdmin
      .from("articles")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) return NextResponse.json({ error: "Failed to update article" }, { status: 500 });

    return NextResponse.json(updatedArticle);
  } catch (error: any) {
    console.error("PATCH error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// DELETE - Delete article
export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } } // ✅ plain object
) {
  try {
    const { id } = context.params;

    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: article, error: fetchError } = await supabaseAdmin
      .from("articles")
      .select("created_by")
      .eq("id", id)
      .eq("created_by", user.id)
      .single();

    if (fetchError || !article) return NextResponse.json({ error: "Not found or no permission" }, { status: 404 });

    const { error: deleteError } = await supabaseAdmin
      .from("articles")
      .delete()
      .eq("id", id);

    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

    return NextResponse.json({ success: true, message: "Article deleted successfully" });
  } catch (error: any) {
    console.error("DELETE error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
