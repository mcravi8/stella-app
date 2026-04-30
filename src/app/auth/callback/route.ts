import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");
  const oauthErrorDescription = searchParams.get("error_description");

  // GitHub returned an error (e.g. user denied access)
  if (oauthError) {
    const url = new URL(`${origin}/login`);
    url.searchParams.set("error", oauthErrorDescription || oauthError);
    return NextResponse.redirect(url.toString());
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Upsert profile and check if onboarding needed
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const username = user.user_metadata?.user_name || user.email || "";
        const { data: profile } = await supabase
          .from("profiles")
          .select("interests_set")
          .eq("user_id", user.id)
          .single();
        if (!profile) {
          await supabase.from("profiles").upsert({
            user_id: user.id,
            github_username: username,
            avatar_url: user.user_metadata?.avatar_url || null,
            interests_set: false,
          }, { onConflict: "user_id" });
          return NextResponse.redirect(`${origin}/onboarding`);
        }
        if (!profile.interests_set) {
          return NextResponse.redirect(`${origin}/onboarding`);
        }
      }
      return NextResponse.redirect(`${origin}/`);
    }
    const url = new URL(`${origin}/login`);
    url.searchParams.set("error", error.message);
    return NextResponse.redirect(url.toString());
  }

  // No code and no error — unexpected state
  return NextResponse.redirect(`${origin}/login?error=Missing+authorization+code`);
}
