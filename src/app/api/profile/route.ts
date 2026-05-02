import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

const MAX_BIO_LEN = 280;

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof body.bio === "string") {
    const trimmed = body.bio.trim();
    if (trimmed.length > MAX_BIO_LEN) {
      return NextResponse.json(
        { error: `Bio must be ${MAX_BIO_LEN} characters or fewer` },
        { status: 400 }
      );
    }
    updates.bio = trimmed.length === 0 ? null : trimmed;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("user_id", user.id);

  if (error) {
    console.error("[/api/profile] update failed:", error);
    return NextResponse.json(
      { error: "Failed to save profile", details: error.message },
      { status: 500 }
    );
  }

  // Bio change shows on the user's public profile. Bust its cache.
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
