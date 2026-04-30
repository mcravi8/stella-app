import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase.from("user_interests").select("tag").eq("user_id", user.id);
  return NextResponse.json({ tags: (data || []).map(d => d.tag) });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tags } = await request.json();

  await supabase.from("profiles").upsert({
    user_id: user.id,
    github_username: user.user_metadata?.user_name || user.email || "",
    avatar_url: user.user_metadata?.avatar_url || null,
    bio: user.user_metadata?.bio || null,
    interests_set: true,
  }, { onConflict: "user_id" });

  await supabase.from("user_interests").delete().eq("user_id", user.id);
  if (tags?.length) {
    await supabase.from("user_interests").insert(
      tags.map((tag: string) => ({ user_id: user.id, tag }))
    );
  }

  return NextResponse.json({ success: true });
}
