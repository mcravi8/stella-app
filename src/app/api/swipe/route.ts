import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

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

  // Invalidate the Starred page's Next.js Router Cache so the new repo shows up
  // immediately on the user's next visit instead of after a hard reload.
  revalidatePath("/my-repos");

  return NextResponse.json({ success: true });
}

/**
 * Undo a previous swipe — removes the swipes row and, if it was a right-swipe,
 * also unstars the repo on GitHub so the user's stars stay in sync with the
 * "I don't actually want this" choice.
 *
 * Body: { repo_full_name: string, provider_token?: string }
 */
export async function DELETE(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.repo_full_name) {
    return NextResponse.json({ error: "Missing repo_full_name" }, { status: 400 });
  }
  const { repo_full_name, provider_token } = body as {
    repo_full_name: string;
    provider_token?: string | null;
  };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Read the swipe first so we know whether to unstar on GitHub.
  const { data: existing } = await supabase
    .from("swipes")
    .select("direction")
    .eq("user_id", user.id)
    .eq("repo_full_name", repo_full_name)
    .maybeSingle();

  const wasRightSwipe = existing?.direction === "right";

  const { error: deleteError } = await supabase
    .from("swipes")
    .delete()
    .eq("user_id", user.id)
    .eq("repo_full_name", repo_full_name);

  if (deleteError) {
    console.error("[/api/swipe DELETE] failed:", deleteError);
    return NextResponse.json(
      { error: "Failed to undo swipe", details: deleteError.message },
      { status: 500 }
    );
  }

  // If the original swipe starred + forked the repo on GitHub, undo the star.
  // (Forks aren't easily reversible — leave them.)
  if (wasRightSwipe && provider_token) {
    await fetch(`https://api.github.com/user/starred/${repo_full_name}`, {
      method: "DELETE",
      headers: {
        Authorization: `token ${provider_token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Stella-App/1.0",
      },
    }).catch(err => console.error("[/api/swipe DELETE] github unstar failed:", err));
  }

  revalidatePath("/my-repos");

  return NextResponse.json({ success: true, was_right_swipe: wasRightSwipe });
}
