import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type Params = { id: string };

// ---------------- PATCH (Update article) ----------------
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<Params> }
): Promise<Response> {
  try {
    const { id } = await context.params;

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: article } = await supabaseAdmin
      .from("articles")
      .select("created_by")
      .eq("id", id)
      .single();

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    if (article.created_by !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const { error } = await supabaseAdmin
      .from("articles")
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------- DELETE (Delete article) ----------------
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<Params> }
): Promise<Response> {
  try {
    const { id } = await context.params;

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabaseAdmin
      .from("articles")
      .delete()
      .eq("id", id)
      .eq("created_by", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Article deleted successfully",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
