"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { INTEREST_TAGS } from "@/lib/interests";

type Repo = {
  id: number;
  full_name: string;
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  owner: { avatar_url: string; login: string };
};

const BIO_MAX = 280;

interface Props {
  username: string;
  initialInterests: string[];
  swipedRepos: Repo[];
  initialShowcased: string[];
  initialBio: string | null;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export default function SettingsClient({ username, initialInterests, swipedRepos, initialShowcased, initialBio }: Props) {
  const [bio, setBio] = useState<string>(initialBio || "");
  const [bioState, setBioState] = useState<SaveState>("idle");
  const [interests, setInterests] = useState<Set<string>>(new Set(initialInterests));
  // Ordered list of full_names — order is the public display order on /profile/[username].
  const [showcasedOrder, setShowcasedOrder] = useState<string[]>(
    initialShowcased.filter(n => swipedRepos.some(r => r.full_name === n))
  );
  const [interestsState, setInterestsState] = useState<SaveState>("idle");
  const [showcaseState, setShowcaseState] = useState<SaveState>("idle");

  const showcasedSet = new Set(showcasedOrder);
  const repoByName = new Map(swipedRepos.map(r => [r.full_name, r]));
  const showcasedRepos = showcasedOrder
    .map(n => repoByName.get(n))
    .filter((r): r is Repo => Boolean(r));
  const availableRepos = swipedRepos.filter(r => !showcasedSet.has(r.full_name));

  const toggleInterest = (tag: string) => {
    setInterests(prev => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag); else next.add(tag);
      return next;
    });
    setInterestsState("idle");
  };

  const addToShowcase = (full_name: string) => {
    setShowcasedOrder(prev => prev.includes(full_name) ? prev : [...prev, full_name]);
    setShowcaseState("idle");
  };

  const removeFromShowcase = (full_name: string) => {
    setShowcasedOrder(prev => prev.filter(n => n !== full_name));
    setShowcaseState("idle");
  };

  const move = (full_name: string, direction: -1 | 1) => {
    setShowcasedOrder(prev => {
      const i = prev.indexOf(full_name);
      const j = i + direction;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setShowcaseState("idle");
  };

  const saveBio = async () => {
    setBioState("saving");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio }),
      });
      setBioState(res.ok ? "saved" : "error");
    } catch {
      setBioState("error");
    }
  };

  const saveInterests = async () => {
    setInterestsState("saving");
    try {
      const res = await fetch("/api/interests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: Array.from(interests) }),
      });
      setInterestsState(res.ok ? "saved" : "error");
    } catch {
      setInterestsState("error");
    }
  };

  const saveShowcase = async () => {
    setShowcaseState("saving");
    try {
      const res = await fetch("/api/showcased", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repos: showcasedRepos.map(r => ({ full_name: r.full_name, repo_data: r })),
        }),
      });
      setShowcaseState(res.ok ? "saved" : "error");
    } catch {
      setShowcaseState("error");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border sticky top-0 bg-background/90 backdrop-blur-sm z-40">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-xl flex items-center justify-center">
              <svg viewBox="0 0 64 64" className="w-5 h-5" fill="none">
                <path d="M20 18h16c4 0 8 3 8 7s-4 7-8 7H28c-2 0-4 1-4 3s2 3 4 3h16v8H28c-4 0-8-3-8-7s4-7 8-7h8c2 0 4-1 4-3s-2-3-4-3H20v-8z" fill="white"/>
              </svg>
            </div>
            <span className="font-bold text-foreground text-lg">Stella</span>
          </Link>
          <Link href={`/profile/${username}`} className="text-muted hover:text-accent text-sm transition-colors">View profile</Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-10 space-y-12">
        <section>
          <div className="flex items-center justify-between mb-4 gap-4">
            <div>
              <h2 className="text-foreground font-bold text-xl mb-1">About</h2>
              <p className="text-muted text-sm">Shown on your public profile (overrides your GitHub bio).</p>
            </div>
            <button
              onClick={saveBio}
              disabled={bioState === "saving" || bio.length > BIO_MAX}
              className="px-5 py-2 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50 shrink-0"
            >
              {bioState === "saving" ? "Saving..." : bioState === "saved" ? "Saved ✓" : bioState === "error" ? "Retry" : "Save"}
            </button>
          </div>
          <textarea
            value={bio}
            onChange={e => { setBio(e.target.value); setBioState("idle"); }}
            placeholder="Brief description of your expertise…"
            rows={3}
            maxLength={BIO_MAX + 50}
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-muted focus:outline-none focus:border-accent transition-colors resize-none"
          />
          <div className="flex items-center justify-between mt-1.5 text-xs">
            {bioState === "error" ? (
              <span className="text-red-500">Save failed — try again.</span>
            ) : (
              <span className="text-muted">Markdown not supported.</span>
            )}
            <span className={bio.length > BIO_MAX ? "text-red-500 tabular-nums" : "text-muted tabular-nums"}>
              {bio.length}/{BIO_MAX}
            </span>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-foreground font-bold text-xl mb-1">Interests</h2>
              <p className="text-muted text-sm">We&apos;ll use these to personalize your feed</p>
            </div>
            <button
              onClick={saveInterests}
              disabled={interestsState === "saving"}
              className="px-5 py-2 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {interestsState === "saving" ? "Saving..." : interestsState === "saved" ? "Saved ✓" : interestsState === "error" ? "Retry" : "Save"}
            </button>
          </div>
          {Object.entries(INTEREST_TAGS).map(([section, tags]) => (
            <div key={section} className="mb-6">
              <h3 className="text-muted text-xs font-medium uppercase tracking-wider mb-3">{section}</h3>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleInterest(tag)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      interests.has(tag)
                        ? "bg-accent text-white"
                        : "bg-surface border border-border text-muted hover:text-foreground hover:border-accent"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-foreground font-bold text-xl mb-1">Showcased repos</h2>
              <p className="text-muted text-sm">Pick which repos appear on your public profile</p>
            </div>
            <button
              onClick={saveShowcase}
              disabled={showcaseState === "saving" || swipedRepos.length === 0}
              className="px-5 py-2 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {showcaseState === "saving" ? "Saving..." : showcaseState === "saved" ? "Saved ✓" : showcaseState === "error" ? "Retry" : "Save"}
            </button>
            {showcaseState === "error" && (
              <span className="text-red-500 text-xs">Save failed — see console.</span>
            )}
          </div>
          {swipedRepos.length === 0 ? (
            <p className="text-muted text-sm">Swipe right on some repos first — they&apos;ll appear here to choose from.</p>
          ) : (
            <>
              {showcasedRepos.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-muted text-xs font-medium uppercase tracking-wider mb-3">
                    On your profile · {showcasedRepos.length} {showcasedRepos.length === 1 ? "repo" : "repos"} (top first)
                  </h3>
                  <div className="space-y-2">
                    {showcasedRepos.map((repo, i) => (
                      <div
                        key={repo.full_name}
                        className="p-3 rounded-xl border border-accent bg-accent/10 flex items-center gap-3"
                      >
                        {repo.owner?.avatar_url && (
                          <Image src={repo.owner.avatar_url} alt={repo.owner.login} width={32} height={32} className="rounded-lg" unoptimized />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground text-sm font-medium truncate">{repo.full_name}</p>
                          {repo.description && <p className="text-muted text-xs truncate">{repo.description}</p>}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => move(repo.full_name, -1)}
                            disabled={i === 0}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-surface disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            title="Move up"
                            aria-label="Move up"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => move(repo.full_name, 1)}
                            disabled={i === showcasedRepos.length - 1}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-surface disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            title="Move down"
                            aria-label="Move down"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => removeFromShowcase(repo.full_name)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
                            title="Remove from showcase"
                            aria-label="Remove from showcase"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {availableRepos.length > 0 && (
                <div>
                  <h3 className="text-muted text-xs font-medium uppercase tracking-wider mb-3">
                    Available · click to add to your profile
                  </h3>
                  <div className="space-y-2">
                    {availableRepos.map(repo => (
                      <button
                        key={repo.full_name}
                        onClick={() => addToShowcase(repo.full_name)}
                        className="w-full text-left p-3 rounded-xl border border-border bg-surface hover:border-accent/60 transition-colors flex items-center gap-3"
                      >
                        {repo.owner?.avatar_url && (
                          <Image src={repo.owner.avatar_url} alt={repo.owner.login} width={32} height={32} className="rounded-lg" unoptimized />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground text-sm font-medium truncate">{repo.full_name}</p>
                          {repo.description && <p className="text-muted text-xs truncate">{repo.description}</p>}
                        </div>
                        <span className="text-muted shrink-0" aria-hidden>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                          </svg>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
