"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

const INTEREST_TAGS: Record<string, string[]> = {
  Languages: ["JavaScript", "TypeScript", "Python", "Rust", "Go", "Java", "C/C++", "Ruby", "Swift", "Kotlin"],
  Topics: ["AI / ML", "Web Dev", "Mobile", "CLI Tools", "DevOps", "Security", "Games", "Data Science", "Databases", "Dev Tools"],
};

type Repo = {
  id: number;
  full_name: string;
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  owner: { avatar_url: string; login: string };
};

interface Props {
  username: string;
  initialInterests: string[];
  swipedRepos: Repo[];
  initialShowcased: string[];
}

export default function SettingsClient({ username, initialInterests, swipedRepos, initialShowcased }: Props) {
  const [interests, setInterests] = useState<Set<string>>(new Set(initialInterests));
  const [showcased, setShowcased] = useState<Set<string>>(new Set(initialShowcased));
  const [savingInterests, setSavingInterests] = useState(false);
  const [savedInterests, setSavedInterests] = useState(false);
  const [savingShowcase, setSavingShowcase] = useState(false);
  const [savedShowcase, setSavedShowcase] = useState(false);

  const toggleInterest = (tag: string) => {
    setInterests(prev => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag); else next.add(tag);
      return next;
    });
    setSavedInterests(false);
  };

  const toggleShowcase = (full_name: string) => {
    setShowcased(prev => {
      const next = new Set(prev);
      if (next.has(full_name)) next.delete(full_name); else next.add(full_name);
      return next;
    });
    setSavedShowcase(false);
  };

  const saveInterests = async () => {
    setSavingInterests(true);
    await fetch("/api/interests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: Array.from(interests) }),
    });
    setSavingInterests(false);
    setSavedInterests(true);
  };

  const saveShowcase = async () => {
    setSavingShowcase(true);
    const reposToShowcase = swipedRepos.filter(r => showcased.has(r.full_name));
    await fetch("/api/showcased", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repos: reposToShowcase.map(r => ({ full_name: r.full_name, repo_data: r })) }),
    });
    setSavingShowcase(false);
    setSavedShowcase(true);
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
            <span className="font-bold text-white text-lg">Stella</span>
          </Link>
          <Link href={`/profile/${username}`} className="text-muted hover:text-accent text-sm transition-colors">View profile</Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-10 space-y-12">
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-white font-bold text-xl mb-1">Interests</h2>
              <p className="text-muted text-sm">We&apos;ll use these to personalize your feed</p>
            </div>
            <button
              onClick={saveInterests}
              disabled={savingInterests}
              className="px-5 py-2 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {savingInterests ? "Saving..." : savedInterests ? "Saved ✓" : "Save"}
            </button>
          </div>
          {Object.entries(INTEREST_TAGS).map(([section, tags]) => (
            <div key={section} className="mb-6">
              <h3 className="text-white/60 text-xs font-medium uppercase tracking-wider mb-3">{section}</h3>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleInterest(tag)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      interests.has(tag)
                        ? "bg-accent text-white"
                        : "bg-surface border border-border text-muted hover:text-white hover:border-accent"
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
              <h2 className="text-white font-bold text-xl mb-1">Showcased repos</h2>
              <p className="text-muted text-sm">Pick which repos appear on your public profile</p>
            </div>
            <button
              onClick={saveShowcase}
              disabled={savingShowcase || swipedRepos.length === 0}
              className="px-5 py-2 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {savingShowcase ? "Saving..." : savedShowcase ? "Saved ✓" : "Save"}
            </button>
          </div>
          {swipedRepos.length === 0 ? (
            <p className="text-muted text-sm">Swipe right on some repos first — they&apos;ll appear here to choose from.</p>
          ) : (
            <div className="space-y-2">
              {swipedRepos.map(repo => (
                <button
                  key={repo.full_name}
                  onClick={() => toggleShowcase(repo.full_name)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    showcased.has(repo.full_name)
                      ? "border-accent bg-accent/10"
                      : "border-border bg-surface hover:border-border/80"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {repo.owner?.avatar_url && (
                      <Image src={repo.owner.avatar_url} alt={repo.owner.login} width={32} height={32} className="rounded-lg" unoptimized />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{repo.full_name}</p>
                      {repo.description && <p className="text-muted text-xs truncate">{repo.description}</p>}
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      showcased.has(repo.full_name) ? "border-accent bg-accent" : "border-border"
                    }`}>
                      {showcased.has(repo.full_name) && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
