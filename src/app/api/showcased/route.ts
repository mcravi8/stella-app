import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ repos: [] });

  const { data } = await supabase
    .from("showcased_repos")
    .select("repo_data, position")
    .eq("user_id", user.id)
    .order("position", { ascending: true });
  return NextResponse.json({ repos: (data || []).map(r => r.repo_data).filter(Boolean) });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { repos } = await request.json();

  const { error: deleteError } = await supabase
    .from("showcased_repos")
    .delete()
    .eq("user_id", user.id);
  if (deleteError) {
    console.error("[/api/showcased] delete failed:", deleteError);
    return NextResponse.json(
      { error: "Failed to clear existing showcase", details: deleteError.message },
      { status: 500 }
    );
  }

  if (repos?.length) {
    const { error: insertError } = await supabase.from("showcased_repos").insert(
      repos.map((r: { full_name: string; repo_data: unknown }, i: number) => ({
        user_id: user.id,
        repo_full_name: r.full_name,
        repo_data: r.repo_data,
        position: i,
      }))
    );
    if (insertError) {
      console.error("[/api/showcased] insert failed:", insertError);
      return NextResponse.json(
        { error: "Failed to save showcase", details: insertError.message },
        { status: 500 }
      );
    }
  }

  // Showcased repos render on the user's public profile. Bust the cache so
  // the next navigation to that page reflects the change immediately.
  const { data: profile } = await supabase
    .from("profiles")
    .select("github_username")
    .eq("user_id", user.id)
    .single();
  if (profile?.github_username) {
    revalidatePath(`/profile/${profile.github_username}`);
  }

  return NextResponse.json({ success: true });
}
