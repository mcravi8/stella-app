import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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

  await supabase.from("showcased_repos").delete().eq("user_id", user.id);
  if (repos?.length) {
    await supabase.from("showcased_repos").insert(
      repos.map((r: { full_name: string; repo_data: unknown }, i: number) => ({
        user_id: user.id,
        repo_full_name: r.full_name,
        repo_data: r.repo_data,
        position: i,
      }))
    );
  }

  return NextResponse.json({ success: true });
}
