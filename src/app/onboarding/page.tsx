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
              <path d="M32 6L39 23L57 24L43 35L47 53L32 43L17 53L21 35L7 24L25 23Z" fill="white"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">What are you into?</h1>
          <p className="text-muted">Pick anything that fits. We&apos;ll bias your feed toward what you&apos;d actually use — without locking you out of stuff you might not have heard of.</p>
        </div>

        {Object.entries(INTEREST_TAGS).map(([section, tags]) => {
          const subtitle =
            section === "Industries"
              ? "What you do — biases the feed toward your domain plus adjacent things you'd reach for"
              : section === "Languages"
              ? "Your preferred languages"
              : section === "Frameworks"
              ? "Frameworks you reach for first"
              : "Specific topics you want more of";
          return (
            <div key={section} className="mb-8">
              <h2 className="text-foreground font-semibold mb-1">{section}</h2>
              <p className="text-muted text-xs mb-3">{subtitle}</p>
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
          );
        })}

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
