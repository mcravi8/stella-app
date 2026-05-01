import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SwipePageClient from "@/components/SwipePageClient";

export default async function HomePage() {
  const supabase = await createClient();

  // Use getUser() for secure server-side auth verification
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get session separately to access provider_token (GitHub token for fork/star)
  const { data: { session } } = await supabase.auth.getSession();

  // Has the user already had their pre-existing GitHub stars imported?
  // Null on first feed load → SwipePageClient kicks off /api/import-stars in the background.
  const { data: profile } = await supabase
    .from("profiles")
    .select("imported_stars_at")
    .eq("user_id", user.id)
    .single();

  const userName =
    user.user_metadata?.user_name ||
    user.user_metadata?.name ||
    "there";

  return (
    <SwipePageClient
      providerToken={session?.provider_token ?? null}
      userName={userName}
      needsStarsImport={!profile?.imported_stars_at}
    />
  );
}
