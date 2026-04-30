import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { repo_full_name, direction, repo_data, provider_token } = body;

  if (!repo_full_name || !direction) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: upsertError } = await supabase.from("swipes").upsert(
    { user_id: user.id, repo_full_name, direction, repo_data },
    { onConflict: "user_id,repo_full_name" }
  );

  if (upsertError) {
    console.error("[/api/swipe] swipes upsert failed:", upsertError);
    return NextResponse.json(
      { error: "Failed to record swipe", details: upsertError.message },
      { status: 500 }
    );
  }

  if (direction === "right" && provider_token) {
    const ghHeaders = {
      Authorization: `token ${provider_token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "Stella-App/1.0",
    };
    await Promise.allSettled([
      fetch(`https://api.github.com/repos/${repo_full_name}/forks`, {
        method: "POST",
        headers: ghHeaders,
      }),
      fetch(`https://api.github.com/user/starred/${repo_full_name}`, {
        method: "PUT",
        headers: { ...ghHeaders, "Content-Length": "0" },
      }),
    ]);
  }

  return NextResponse.json({ success: true });
}
