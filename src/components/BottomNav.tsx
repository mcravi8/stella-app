"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const HIDE_ON = ["/login", "/onboarding", "/auth", "/success"];

interface Tab {
  href: string;
  label: string;
  match: (p: string) => boolean;
  icon: (active: boolean) => React.ReactNode;
}

export default function BottomNav() {
  const pathname = usePathname() || "/";
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        if (cancelled) return;
        setUsername(
          user?.user_metadata?.user_name || user?.user_metadata?.name || null
        );
      });
    return () => { cancelled = true; };
  }, []);

  if (HIDE_ON.some(p => pathname === p || pathname.startsWith(p + "/"))) {
    return null;
  }

  const profileHref = username ? `/profile/${username}` : "/settings";

  const tabs: Tab[] = [
    {
      href: "/",
      label: "Home",
      match: p => p === "/",
      icon: (active) => (
        <svg className="w-6 h-6" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3v-6h6v6h3a1 1 0 001-1V10" />
        </svg>
      ),
    },
    {
      href: "/search",
      label: "Search",
      match: p => p.startsWith("/search"),
      icon: () => (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="7" />
          <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
        </svg>
      ),
    },
    {
      href: "/my-repos",
      label: "Starred",
      match: p => p.startsWith("/my-repos"),
      icon: (active) => (
        <svg className="w-6 h-6" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
          <path d="M12 3l2.7 5.5 6 .9-4.4 4.3 1 6-5.3-2.8L6.7 19.7l1-6L3.3 9.4l6-.9L12 3z" />
        </svg>
      ),
    },
    {
      href: profileHref,
      label: "Profile",
      match: p => p.startsWith("/profile") || p.startsWith("/settings"),
      icon: (active) => (
        <svg className="w-6 h-6" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="8" r="4" />
          <path strokeLinecap="round" d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
        </svg>
      ),
    },
  ];

  return (
    <nav
      className="fixed left-1/2 -translate-x-1/2 z-40 pointer-events-none"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
      aria-label="Primary"
    >
      <ul
        className="pointer-events-auto flex items-center gap-3 bg-surface/85 backdrop-blur-xl border border-border rounded-full px-3 py-2"
        style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.18), 0 1px 0 rgba(255,255,255,0.04) inset" }}
      >
        {tabs.map(tab => {
          const active = tab.match(pathname);
          return (
            <li key={tab.label}>
              <Link
                href={tab.href}
                prefetch
                className={`flex items-center justify-center w-14 h-12 rounded-full transition-colors ${
                  active
                    ? "bg-foreground text-background"
                    : "text-muted hover:text-foreground hover:bg-background/60"
                }`}
                aria-label={tab.label}
                aria-current={active ? "page" : undefined}
                title={tab.label}
              >
                {tab.icon(active)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
