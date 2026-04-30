# v1 — Stella MVP

**Date:** 2026-04-30
**Deployment:** https://naive-stella-app-8f6dee-mqj34av6j-naive-e9517ea2.vercel.app

## What was built

Full Stella MVP — swipe-based GitHub repo discovery app.

### Features
- **GitHub OAuth** via Supabase — users sign in with GitHub. Requests `public_repo` scope for forking/starring.
- **Auth callback** at `/auth/callback` — exchanges OAuth code for session.
- **Swipe deck** — Tinder-style stacked cards with Framer Motion drag. 3 cards visible in a perspective stack.
- **Visual feedback** — green "FORK ✓" label appears on right drag, red "SKIP ✗" on left drag.
- **Keyboard support** — ← → arrow keys to swipe.
- **Action buttons** — ✗ skip and ✓ fork & star buttons below the deck.
- **Repo cards** show: owner avatar, username, repo name, language tag, description, topics (up to 5), star count, fork count, link to GitHub.
- **Swipe right** → forks the repo + stars it via GitHub API (using provider token from OAuth session). Records swipe in Supabase.
- **Swipe left** → records dismissal in Supabase.
- **Infinite feed** — rotates through 6 language queues (TypeScript, Python, Go, Rust, JavaScript, Swift). Already-swiped repos are filtered out.
- **My Repos page** — grid of all right-swiped (forked) repos with name, description, language, stars, forks, and link to GitHub.
- **Sign out** — from nav.

### Tech stack
- Next.js 15 App Router + Tailwind CSS
- Framer Motion for drag animations
- Supabase Auth (GitHub OAuth) + Postgres (swipes table)
- GitHub API (public — no token required for repo search)

### Database
- `swipes` table: `id`, `user_id`, `repo_full_name`, `direction`, `repo_data` (JSONB), `created_at`
- RLS enabled — users can only read/write their own swipes

### Design
- Dark premium theme: background `#1E2A38`, surface `#253347`, accent `#A78BFA`
- Inter font, smooth transitions, card shadow depth effect

## Setup required (post-deploy)
1. In Supabase Dashboard → Auth → Providers → GitHub: enable and set Client ID + Secret
2. Set redirect URL: `https://<your-domain>/auth/callback`
3. Vercel env vars `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` must be set
