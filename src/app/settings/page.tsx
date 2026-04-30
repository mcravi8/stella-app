import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SettingsClient from "@/components/SettingsClient";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const username = user.user_metadata?.user_name || "";

  const [{ data: interests }, { data: swipes }, { data: showcased }] = await Promise.all([
    supabase.from("user_interests").select("tag").eq("user_id", user.id),
    supabase.from("swipes").select("repo_full_name, repo_data").eq("user_id", user.id).eq("direction", "right").order("created_at", { ascending: false }).limit(50),
    supabase.from("showcased_repos").select("repo_full_name").eq("user_id", user.id),
  ]);

  const showcasedSet = new Set((showcased || []).map(r => r.repo_full_name));

  return (
    <SettingsClient
      username={username}
      initialInterests={(interests || []).map(i => i.tag)}
      swipedRepos={(swipes || []).filter(s => s.repo_data).map(s => s.repo_data)}
      initialShowcased={Array.from(showcasedSet)}
    />
  );
}
