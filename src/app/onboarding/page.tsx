"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { INTEREST_TAGS } from "@/lib/interests";

export default function OnboardingPage() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const toggle = (tag: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/interests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: Array.from(selected) }),
    });
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full">
        <div className="text-center mb-10">
          <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg viewBox="0 0 64 64" className="w-9 h-9" fill="none">
              <path d="M20 18h16c4 0 8 3 8 7s-4 7-8 7H28c-2 0-4 1-4 3s2 3 4 3h16v8H28c-4 0-8-3-8-7s4-7 8-7h8c2 0 4-1 4-3s-2-3-4-3H20v-8z" fill="white"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">What are you into?</h1>
          <p className="text-muted">Pick your interests and we&apos;ll show you repos you&apos;ll love</p>
        </div>

        {Object.entries(INTEREST_TAGS).map(([section, tags]) => (
          <div key={section} className="mb-8">
            <h2 className="text-foreground font-semibold mb-3">{section}</h2>
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggle(tag)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selected.has(tag)
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

        <div className="flex gap-3 mt-6">
          <button
            onClick={async () => {
              // Mark interests_set=true even when skipping so we don't re-prompt on next login
              await fetch("/api/interests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tags: [] }),
              });
              router.push("/");
            }}
            className="flex-1 px-6 py-3 rounded-2xl border border-border text-muted hover:text-foreground text-sm font-medium transition-colors"
          >
            Skip for now
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-6 py-3 rounded-2xl bg-accent text-white text-sm font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : `Let's go${selected.size ? ` (${selected.size})` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
