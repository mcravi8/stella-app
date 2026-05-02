import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Static fallback pool — shown when GitHub API is rate-limited or returns sparse results
const FALLBACK_REPOS = [
  { id: 1001, full_name: "vercel/next.js", name: "next.js", description: "The React Framework for the web — build fast, SEO-friendly full-stack apps with server components, streaming, and zero-config deploys. Powers millions of production sites.", language: "JavaScript", topics: ["react", "nextjs", "framework", "fullstack"], stargazers_count: 125000, forks_count: 27000, html_url: "https://github.com/vercel/next.js", owner: { avatar_url: "https://github.com/vercel.png", login: "vercel" } },
  { id: 1002, full_name: "shadcn-ui/ui", name: "ui", description: "Beautifully designed components built with Radix UI and Tailwind CSS. Copy-paste into your project — not a dependency. The new standard for React UI components.", language: "TypeScript", topics: ["react", "tailwind", "components", "ui"], stargazers_count: 68000, forks_count: 4000, html_url: "https://github.com/shadcn-ui/ui", owner: { avatar_url: "https://github.com/shadcn-ui.png", login: "shadcn-ui" } },
  { id: 1003, full_name: "trpc/trpc", name: "trpc", description: "End-to-end typesafe APIs made easy. Move fast and break nothing — build TypeScript-first backends with full type safety from server to client without any code generation.", language: "TypeScript", topics: ["typescript", "api", "rpc", "fullstack"], stargazers_count: 34000, forks_count: 1100, html_url: "https://github.com/trpc/trpc", owner: { avatar_url: "https://github.com/trpc.png", login: "trpc" } },
  { id: 1004, full_name: "supabase/supabase", name: "supabase", description: "The open source Firebase alternative. Build in a weekend, scale to millions. Includes Postgres, Auth, realtime subscriptions, storage, and edge functions.", language: "TypeScript", topics: ["postgres", "firebase", "realtime", "auth", "storage"], stargazers_count: 69000, forks_count: 6700, html_url: "https://github.com/supabase/supabase", owner: { avatar_url: "https://github.com/supabase.png", login: "supabase" } },
  { id: 1005, full_name: "excalidraw/excalidraw", name: "excalidraw", description: "Virtual whiteboard for sketching hand-drawn like diagrams. Open source, end-to-end encrypted collaborative drawing tool that feels like sketching on a whiteboard.", language: "TypeScript", topics: ["canvas", "drawing", "collaboration", "whiteboard"], stargazers_count: 83000, forks_count: 7400, html_url: "https://github.com/excalidraw/excalidraw", owner: { avatar_url: "https://github.com/excalidraw.png", login: "excalidraw" } },
  { id: 1006, full_name: "vitejs/vite", name: "vite", description: "Next generation frontend tooling. Lightning-fast dev server with instant HMR, optimized production builds, and a plugin ecosystem. The new standard for front-end build tools.", language: "TypeScript", topics: ["build-tool", "frontend", "hmr", "bundler"], stargazers_count: 67000, forks_count: 6000, html_url: "https://github.com/vitejs/vite", owner: { avatar_url: "https://github.com/vitejs.png", login: "vitejs" } },
  { id: 1007, full_name: "tailwindlabs/tailwindcss", name: "tailwindcss", description: "A utility-first CSS framework for rapid UI development. Compose designs directly in your markup with small, single-purpose classes. No more naming things.", language: "JavaScript", topics: ["css", "utility-first", "frontend", "design"], stargazers_count: 83000, forks_count: 4200, html_url: "https://github.com/tailwindlabs/tailwindcss", owner: { avatar_url: "https://github.com/tailwindlabs.png", login: "tailwindlabs" } },
  { id: 1008, full_name: "facebook/react", name: "react", description: "The library for web and native user interfaces. Declarative, component-based, learn once and write anywhere. The most popular UI library powering the modern web.", language: "JavaScript", topics: ["javascript", "ui", "frontend", "declarative"], stargazers_count: 228000, forks_count: 46000, html_url: "https://github.com/facebook/react", owner: { avatar_url: "https://github.com/facebook.png", login: "facebook" } },
  { id: 1009, full_name: "microsoft/vscode", name: "vscode", description: "Visual Studio Code — free, open source code editor that redefined developer tooling. Runs everywhere, extensible, and loved by millions of developers worldwide.", language: "TypeScript", topics: ["editor", "typescript", "developer-tools", "extensions"], stargazers_count: 163000, forks_count: 29000, html_url: "https://github.com/microsoft/vscode", owner: { avatar_url: "https://github.com/microsoft.png", login: "microsoft" } },
  { id: 1010, full_name: "burnash/gspread", name: "gspread", description: "Google Sheets Python API. The simplest way to interact with Google Sheets from Python — read, write, and manage spreadsheets with just a few lines of code.", language: "Python", topics: ["google-sheets", "api", "python", "spreadsheet"], stargazers_count: 9200, forks_count: 1300, html_url: "https://github.com/burnash/gspread", owner: { avatar_url: "https://github.com/burnash.png", login: "burnash" } },
  { id: 1011, full_name: "ansible/ansible", name: "ansible", description: "Radically simple IT automation. Deploy apps, manage systems, and orchestrate complex multi-tier IT workflows — no agents, no special setup, just SSH and YAML.", language: "Python", topics: ["devops", "automation", "yaml", "infrastructure"], stargazers_count: 63000, forks_count: 23000, html_url: "https://github.com/ansible/ansible", owner: { avatar_url: "https://github.com/ansible.png", login: "ansible" } },
  { id: 1012, full_name: "cli/cli", name: "cli", description: "GitHub's official command line tool. Manage pull requests, issues, releases, and workflows directly from your terminal. The fastest way to work with GitHub.", language: "Go", topics: ["cli", "github", "terminal", "developer-tools"], stargazers_count: 37000, forks_count: 5700, html_url: "https://github.com/cli/cli", owner: { avatar_url: "https://github.com/cli.png", login: "cli" } },
  { id: 1013, full_name: "junegunn/fzf", name: "fzf", description: "A command-line fuzzy finder. Blazing fast interactive filter for any list — files, history, processes, git branches. Shell integration makes it indispensable.", language: "Go", topics: ["cli", "fuzzy-finder", "terminal", "productivity"], stargazers_count: 64000, forks_count: 2400, html_url: "https://github.com/junegunn/fzf", owner: { avatar_url: "https://github.com/junegunn.png", login: "junegunn" } },
  { id: 1014, full_name: "BurntSushi/ripgrep", name: "ripgrep", description: "Recursively searches directories for a regex pattern at blazing speed. Written in Rust, faster than grep, respects gitignore, and handles binary files gracefully.", language: "Rust", topics: ["cli", "search", "regex", "rust"], stargazers_count: 47000, forks_count: 1900, html_url: "https://github.com/BurntSushi/ripgrep", owner: { avatar_url: "https://github.com/BurntSushi.png", login: "BurntSushi" } },
  { id: 1015, full_name: "sharkdp/bat", name: "bat", description: "A cat clone with wings. Syntax highlighting, Git integration, automatic paging, and line numbers — the upgrade your terminal has been waiting for.", language: "Rust", topics: ["cli", "terminal", "syntax-highlighting", "rust"], stargazers_count: 49000, forks_count: 1300, html_url: "https://github.com/sharkdp/bat", owner: { avatar_url: "https://github.com/sharkdp.png", login: "sharkdp" } },
  { id: 1016, full_name: "fastapi/fastapi", name: "fastapi", description: "FastAPI framework — high performance, easy to learn, fast to code, production ready. Build APIs with Python type hints and get automatic OpenAPI docs for free.", language: "Python", topics: ["api", "python", "async", "openapi"], stargazers_count: 77000, forks_count: 6600, html_url: "https://github.com/fastapi/fastapi", owner: { avatar_url: "https://github.com/fastapi.png", login: "fastapi" } },
  { id: 1017, full_name: "pocketbase/pocketbase", name: "pocketbase", description: "Open source backend in a single Go file. Realtime database, auth, file storage, and admin UI — ship a production-ready backend by just running one executable.", language: "Go", topics: ["backend", "database", "auth", "realtime"], stargazers_count: 39000, forks_count: 1800, html_url: "https://github.com/pocketbase/pocketbase", owner: { avatar_url: "https://github.com/pocketbase.png", login: "pocketbase" } },
  { id: 1018, full_name: "tauri-apps/tauri", name: "tauri", description: "Build smaller, faster, and more secure desktop applications with web technology. Rust backend with any frontend — ship cross-platform desktop apps at native speed.", language: "Rust", topics: ["desktop", "rust", "webview", "cross-platform"], stargazers_count: 82000, forks_count: 2400, html_url: "https://github.com/tauri-apps/tauri", owner: { avatar_url: "https://github.com/tauri-apps.png", login: "tauri-apps" } },
  { id: 1019, full_name: "solidjs/solid", name: "solid", description: "A declarative, efficient, flexible JavaScript library for building user interfaces. Fine-grained reactivity without a virtual DOM — faster than React with less overhead.", language: "TypeScript", topics: ["javascript", "frontend", "reactive", "ui"], stargazers_count: 31000, forks_count: 870, html_url: "https://github.com/solidjs/solid", owner: { avatar_url: "https://github.com/solidjs.png", login: "solidjs" } },
  { id: 1020, full_name: "neovim/neovim", name: "neovim", description: "Hyperextensible Vim-based text editor. Modern, embeddable, with a Lua API and a rich plugin ecosystem. The editor that never stops surprising you.", language: "Vim Script", topics: ["editor", "vim", "lua", "terminal"], stargazers_count: 83000, forks_count: 5700, html_url: "https://github.com/neovim/neovim", owner: { avatar_url: "https://github.com/neovim.png", login: "neovim" } },
  { id: 1021, full_name: "ollama/ollama", name: "ollama", description: "Get up and running with large language models locally. Run Llama 3, Mistral, Gemma, and other models on your Mac, Linux, or Windows machine with a single command.", language: "Go", topics: ["llm", "ai", "local", "machine-learning"], stargazers_count: 89000, forks_count: 7000, html_url: "https://github.com/ollama/ollama", owner: { avatar_url: "https://github.com/ollama.png", login: "ollama" } },
  { id: 1022, full_name: "langchain-ai/langchain", name: "langchain", description: "Build context-aware, reasoning LLM applications. Chain together prompts, tools, memory, and retrievers to create powerful AI agents and chatbots.", language: "Python", topics: ["ai", "llm", "agents", "nlp"], stargazers_count: 93000, forks_count: 15000, html_url: "https://github.com/langchain-ai/langchain", owner: { avatar_url: "https://github.com/langchain-ai.png", login: "langchain-ai" } },
  { id: 1023, full_name: "astro-build/astro", name: "astro", description: "The web framework for content-driven websites. Ship less JavaScript by default. Pull content from anywhere. Deploy everywhere. The best framework for static sites.", language: "TypeScript", topics: ["web", "static-site", "javascript", "framework"], stargazers_count: 47000, forks_count: 2600, html_url: "https://github.com/astro-build/astro", owner: { avatar_url: "https://github.com/astro-build.png", login: "astro-build" } },
  { id: 1024, full_name: "biomejs/biome", name: "biome", description: "One toolchain for your web project. Biome formats and lints JavaScript, TypeScript, JSX, and JSON at the speed of Rust — a drop-in replacement for Prettier and ESLint.", language: "Rust", topics: ["linter", "formatter", "javascript", "typescript"], stargazers_count: 16000, forks_count: 500, html_url: "https://github.com/biomejs/biome", owner: { avatar_url: "https://github.com/biomejs.png", login: "biomejs" } },
  { id: 1025, full_name: "oven-sh/bun", name: "bun", description: "Incredibly fast JavaScript runtime, bundler, test runner, and package manager — all in one. Compatible with Node.js, runs TypeScript natively, benchmarks 3x faster.", language: "Zig", topics: ["javascript", "runtime", "bundler", "nodejs"], stargazers_count: 74000, forks_count: 2700, html_url: "https://github.com/oven-sh/bun", owner: { avatar_url: "https://github.com/oven-sh.png", login: "oven-sh" } },
  { id: 1026, full_name: "zed-industries/zed", name: "zed", description: "High-performance, multiplayer code editor from the creators of Atom. Written in Rust for maximum speed, with built-in AI assistance and real-time collaboration.", language: "Rust", topics: ["editor", "rust", "collaboration", "ai"], stargazers_count: 48000, forks_count: 3100, html_url: "https://github.com/zed-industries/zed", owner: { avatar_url: "https://github.com/zed-industries.png", login: "zed-industries" } },
  { id: 1027, full_name: "denoland/deno", name: "deno", description: "A modern runtime for JavaScript and TypeScript. Secure by default, supports TypeScript out of the box, and ships with a standard library. Built on V8 and Rust.", language: "Rust", topics: ["javascript", "typescript", "runtime", "secure"], stargazers_count: 93000, forks_count: 5200, html_url: "https://github.com/denoland/deno", owner: { avatar_url: "https://github.com/denoland.png", login: "denoland" } },
  { id: 1028, full_name: "gothinkster/realworld", name: "realworld", description: "The mother of all demo apps. See how the exact same Medium.com clone is built with any frontend and backend framework — 100+ implementations to compare.", language: "None", topics: ["demo", "fullstack", "tutorial", "comparison"], stargazers_count: 80000, forks_count: 7300, html_url: "https://github.com/gothinkster/realworld", owner: { avatar_url: "https://github.com/gothinkster.png", login: "gothinkster" } },
  { id: 1029, full_name: "nicbarker/clay", name: "clay", description: "High performance UI layout library in C. Flex-box-like layout, measured in microseconds. Renders to any backend — the missing layout engine for games and native apps.", language: "C", topics: ["ui", "layout", "game", "performance"], stargazers_count: 12000, forks_count: 370, html_url: "https://github.com/nicbarker/clay", owner: { avatar_url: "https://github.com/nicbarker.png", login: "nicbarker" } },
  { id: 1030, full_name: "opentofu/opentofu", name: "opentofu", description: "The open source Terraform alternative. Community-driven infrastructure as code with a permissive license — plan, apply, and manage your cloud resources with confidence.", language: "Go", topics: ["infrastructure", "devops", "terraform", "iac"], stargazers_count: 23000, forks_count: 870, html_url: "https://github.com/opentofu/opentofu", owner: { avatar_url: "https://github.com/opentofu.png", login: "opentofu" } },
];

// Query strategies rotated across pages. Indices are referenced by INTEREST_STRATEGY_MAP.
const STRATEGIES = [
  /* 0  */ (p: number) => ({ q: `stars:>50 pushed:>${daysAgo(7)}`, sort: "stars", page: p }),       // trending 7d
  /* 1  */ (p: number) => ({ q: `stars:>100 pushed:>${daysAgo(30)}`, sort: "stars", page: p }),     // trending 30d
  /* 2  */ (p: number) => ({ q: `topic:machine-learning stars:>200`, sort: "stars", page: p }),     // ML
  /* 3  */ (p: number) => ({ q: `topic:developer-tools stars:>200`, sort: "stars", page: p }),      // dev tools
  /* 4  */ (p: number) => ({ q: `language:typescript stars:>500 pushed:>${daysAgo(180)}`, sort: "stars", page: p }),
  /* 5  */ (p: number) => ({ q: `language:python stars:>500 pushed:>${daysAgo(180)}`, sort: "stars", page: p }),
  /* 6  */ (p: number) => ({ q: `topic:frontend stars:>300`, sort: "updated", page: p }),
  /* 7  */ (p: number) => ({ q: `topic:cli stars:>300`, sort: "stars", page: p }),
  /* 8  */ (p: number) => ({ q: `language:rust stars:>200 pushed:>${daysAgo(180)}`, sort: "stars", page: p }),
  /* 9  */ (p: number) => ({ q: `language:go stars:>200 pushed:>${daysAgo(180)}`, sort: "stars", page: p }),
  /* 10 */ (p: number) => ({ q: `topic:ai stars:>500`, sort: "stars", page: p }),
  /* 11 */ (p: number) => ({ q: `topic:mobile stars:>300`, sort: "stars", page: p }),
  /* 12 */ (p: number) => ({ q: `topic:llm stars:>300`, sort: "stars", page: p }),                  // LLMs
  /* 13 */ (p: number) => ({ q: `topic:agents stars:>200 pushed:>${daysAgo(180)}`, sort: "stars", page: p }), // AI Agents
  /* 14 */ (p: number) => ({ q: `topic:react stars:>500`, sort: "stars", page: p }),                // React
  /* 15 */ (p: number) => ({ q: `topic:nextjs stars:>300`, sort: "stars", page: p }),               // Next.js
  /* 16 */ (p: number) => ({ q: `topic:vue stars:>300`, sort: "stars", page: p }),                  // Vue
  /* 17 */ (p: number) => ({ q: `topic:svelte stars:>200`, sort: "stars", page: p }),               // Svelte
  /* 18 */ (p: number) => ({ q: `topic:backend stars:>300`, sort: "stars", page: p }),              // Backend
  /* 19 */ (p: number) => ({ q: `topic:robotics stars:>200`, sort: "stars", page: p }),             // Robotics
  /* 20 */ (p: number) => ({ q: `topic:blockchain stars:>500`, sort: "stars", page: p }),           // Blockchain
  /* 21 */ (p: number) => ({ q: `topic:education stars:>500`, sort: "stars", page: p }),            // Education
  /* 22 */ (p: number) => ({ q: `topic:database stars:>300`, sort: "stars", page: p }),             // Databases
  /* 23 */ (p: number) => ({ q: `topic:security stars:>300`, sort: "stars", page: p }),             // Security

  // ─── Discovery buckets — surface non-obvious repos by velocity / recency / size ───
  // The upper bound on stars is what excludes "obvious" repos the user already knows.
  /* 24 */ (p: number) => ({ q: `stars:50..500 pushed:>${daysAgo(7)} created:>${daysAgo(90)}`, sort: "updated", page: p }),    // Rising — young repo gaining first traction
  /* 25 */ (p: number) => ({ q: `stars:200..2000 pushed:>${daysAgo(14)}`, sort: "stars", page: p }),                          // Sleeper hits — mid-tier still active
  /* 26 */ (p: number) => ({ q: `stars:25..200 pushed:>${daysAgo(30)} created:>${daysAgo(180)}`, sort: "updated", page: p }), // Hidden gems — small but recently active
  /* 27 */ (p: number) => ({ q: `stars:>5000 pushed:>${daysAgo(7)}`, sort: "updated", page: p }),                             // Active classics — famous + still shipping

  // ─── Mid-tier sweet spot: 2K–10K stars. The user's stated favourite range —
  // proven enough that there's signal, small enough that they probably haven't
  // already heard of them.
  /* 28 */ (p: number) => ({ q: `stars:5000..10000 pushed:>${daysAgo(14)} created:>${daysAgo(365)}`, sort: "stars", page: p }),  // Mid-tier breakouts (newer, in-range, active)
  /* 29 */ (p: number) => ({ q: `stars:2000..10000 pushed:>${daysAgo(30)}`, sort: "updated", page: p }),                         // Mid-tier active (broader range, just needs recent activity)

  // ─── Industry-specific gaps: domains the topical strategies above don't cover yet.
  // Each industry in INTEREST_STRATEGY_MAP boosts a curated mix of these (direct)
  // plus existing related strategies (e.g. Finance also boosts Python + Databases).
  /* 30 */ (p: number) => ({ q: `topic:quantitative-finance stars:>200`, sort: "stars", page: p }),    // Quant finance
  /* 31 */ (p: number) => ({ q: `topic:algorithmic-trading stars:>100`, sort: "stars", page: p }),     // Algo trading
  /* 32 */ (p: number) => ({ q: `topic:fintech stars:>300`, sort: "stars", page: p }),                 // FinTech
  /* 33 */ (p: number) => ({ q: `topic:time-series stars:>200`, sort: "stars", page: p }),             // Time-series (related to finance / data science)
  /* 34 */ (p: number) => ({ q: `topic:trading-bot stars:>100 pushed:>${daysAgo(180)}`, sort: "stars", page: p }), // Trading bots
  /* 35 */ (p: number) => ({ q: `topic:data-science stars:>500`, sort: "stars", page: p }),            // Data science (broad)
  /* 36 */ (p: number) => ({ q: `topic:jupyter-notebook stars:>200`, sort: "stars", page: p }),        // Notebooks (DS / research)
  /* 37 */ (p: number) => ({ q: `topic:deep-learning stars:>500`, sort: "stars", page: p }),           // Deep learning
  /* 38 */ (p: number) => ({ q: `topic:bioinformatics stars:>100`, sort: "stars", page: p }),          // Bioinformatics
  /* 39 */ (p: number) => ({ q: `topic:devops stars:>500`, sort: "stars", page: p }),                  // DevOps (broad)
  /* 40 */ (p: number) => ({ q: `topic:kubernetes stars:>500`, sort: "stars", page: p }),              // Kubernetes
  /* 41 */ (p: number) => ({ q: `topic:game-development stars:>300`, sort: "stars", page: p }),        // Game dev
  /* 42 */ (p: number) => ({ q: `topic:research stars:>200`, sort: "stars", page: p }),                // Academic / research code
];

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

// Maps an external_repos.source value to a human-readable badge for the swipe card.
// Null source / unrecognised value → just "via <source>" so we never silently lose attribution.
function labelForSource(source: string | null | undefined): string | null {
  if (!source) return null;
  if (source === "hn_show") return "via Show HN";
  if (source === "ossinsight") return "via OSSInsight trending";
  return `via ${source}`;
}

function synthesizeDescription(description: string | null, topics: string[]): string {
  const base = (description || "").trim();
  if (base.length >= 80) return base;

  const topicStr = topics.slice(0, 4).join(", ");
  if (!base && topicStr) return `An open-source project in the ${topicStr} space. Explore the code, contribute, and see what the community is building.`;
  if (base && topicStr) return `${base} Built around: ${topicStr}.`;
  return base || "An open-source project worth exploring. Check out the code and see if it sparks your next idea.";
}

type GHRepo = {
  id: number; full_name: string; name: string; description: string | null;
  language: string | null; topics: string[]; stargazers_count: number;
  forks_count: number; html_url: string; has_readme?: boolean;
  updated_at?: string; owner: { avatar_url: string; login: string };
};

function mapRepo(r: GHRepo) {
  return {
    id: r.id,
    full_name: r.full_name,
    name: r.name,
    description: synthesizeDescription(r.description, r.topics || []),
    language: r.language,
    topics: (r.topics || []).slice(0, 6),
    stargazers_count: r.stargazers_count,
    forks_count: r.forks_count,
    html_url: r.html_url,
    owner: { avatar_url: r.owner.avatar_url, login: r.owner.login },
  };
}

type MappedRepo = ReturnType<typeof mapRepo> & {
  contributed_by?: string | null;
  source_label?: string | null; // e.g. "via Show HN"
  source_url?: string | null;   // e.g. https://news.ycombinator.com/item?id=...
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));

  // Try to get logged-in user + community repos (optional — unauthenticated requests still work)
  let swipedSet = new Set<string>();
  let communityRepos: MappedRepo[] = [];
  let externalRepos: MappedRepo[] = [];
  let userInterests: string[] = [];
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const [{ data: swipes }, { data: interests }] = await Promise.all([
        supabase.from("swipes").select("repo_full_name").eq("user_id", user.id),
        supabase.from("user_interests").select("tag").eq("user_id", user.id),
      ]);
      swipedSet = new Set(swipes?.map((s: { repo_full_name: string }) => s.repo_full_name) || []);
      userInterests = (interests || []).map((i: { tag: string }) => i.tag);
    }
    // Fetch approved community submissions (public — RLS allows anon read of approved)
    const { data: submitted } = await supabase
      .from("submitted_repos")
      .select("repo_full_name, submitter_username, repo_data")
      .eq("status", "approved")
      .limit(20);
    if (submitted?.length) {
      communityRepos = submitted
        .filter(r => r.repo_data && !swipedSet.has(r.repo_full_name))
        .map(r => ({ ...mapRepo(r.repo_data as GHRepo), contributed_by: r.submitter_username }));
    }

    // Fetch externally-sourced repos (Show HN scraper, etc.). Highest source_score first
    // so the most-upvoted Show HN posts surface first. Falls back gracefully if the
    // table doesn't exist yet (migration not applied).
    const { data: external } = await supabase
      .from("external_repos")
      .select("repo_full_name, repo_data, source, source_url")
      .order("source_score", { ascending: false, nullsFirst: false })
      .limit(20);
    if (external?.length) {
      externalRepos = external
        .filter(r => r.repo_data && !swipedSet.has(r.repo_full_name))
        .map(r => ({
          ...mapRepo(r.repo_data as GHRepo),
          source_label: labelForSource(r.source),
          source_url: r.source_url ?? null,
        }));
    }
  } catch {
    // Non-fatal — proceed without swiped filtering, community repos, or external repos
  }

  // Build personalized strategy pool based on user interests.
  //
  // Each tag maps to a list of strategy indices that get front-loaded in the
  // rotation. Industries map to a CURATED MIX of direct + related strategies —
  // e.g. picking "Finance / Trading" doesn't only show trading repos, it also
  // boosts Python, Databases, Time-series, and Mid-tier movers (all things a
  // quant/finance person would actually pull into their stack). This is the
  // "tailored slightly, not 100%" knob the user asked for: industries bias the
  // feed without cornering it into one topic.
  const INTEREST_STRATEGY_MAP: Record<string, number[]> = {
    // Languages
    "Python": [5], "JavaScript": [4], "TypeScript": [4], "Rust": [8], "Go": [9],
    // Frameworks
    "React": [14], "Next.js": [15], "Vue": [16], "Svelte": [17], "Astro": [6],
    // Topics
    "AI / ML": [2, 10], "AI Agents": [13], "LLMs": [12, 10],
    "Frontend": [6], "Backend": [18], "Mobile": [11],
    "CLI Tools": [7], "Dev Tools": [3],
    "Robotics": [19], "Blockchain": [20], "Education": [21],
    "Databases": [22], "Security": [23],

    // ─── Industries (broad role / domain) — each picks a curated mix of direct
    // and adjacent strategies. The "Mid-tier breakouts" / "Mid-tier active"
    // strategies (28, 29) appear across many industries so users see proven-but-
    // not-yet-famous repos in their domain.
    "Software Engineering":  [3, 7, 4, 9, 18, 27, 28],                   // dev tools + CLI + TS + Go + Backend + classics + mid-tier
    "Data Science":          [35, 36, 2, 5, 33, 37, 28],                 // data-science + Jupyter + ML + Python + time-series + DL + mid-tier
    "AI Research":           [37, 2, 10, 12, 13, 5, 36],                 // deep-learning + ML + AI + LLMs + agents + Python + Jupyter
    "Finance / Trading":     [30, 31, 32, 33, 34, 5, 22, 28],            // quant + algo-trading + fintech + time-series + bots + Python + DBs + mid-tier
    "Web Development":       [6, 14, 15, 16, 17, 4, 25, 28],             // frontend + React + Next + Vue + Svelte + TS + sleeper + mid-tier
    "Mobile Development":    [11, 28, 29],                                // mobile + mid-tier breakouts + mid-tier active
    "DevOps / Cloud":        [39, 40, 3, 9, 22, 28],                     // devops + kubernetes + dev tools + Go + DBs + mid-tier
    "Game Dev":              [41, 28, 8, 26],                             // game-dev + mid-tier + Rust + hidden gems
    "Bioinformatics":        [38, 35, 5, 36, 33],                         // bioinformatics + data-science + Python + Jupyter + time-series
    "Cybersecurity":         [23, 7, 8, 28],                              // security + CLI + Rust + mid-tier
    "Research / Academia":   [42, 35, 2, 5, 36, 38],                      // research + data-science + ML + Python + Jupyter + bioinformatics
  };
  let activeStrategies = STRATEGIES;
  if (userInterests.length > 0) {
    const preferredIdxs = new Set<number>();
    userInterests.forEach(tag => {
      (INTEREST_STRATEGY_MAP[tag] || []).forEach(i => preferredIdxs.add(i));
    });
    if (preferredIdxs.size > 0) {
      const preferred = Array.from(preferredIdxs).map(i => STRATEGIES[i]);
      const rest = STRATEGIES.filter((_, i) => !preferredIdxs.has(i));
      activeStrategies = [...preferred, ...rest];
    }
  }

  // Pick strategy based on page (rotate through strategies)
  const strategyIdx = (page - 1) % activeStrategies.length;
  const ghPageNum = Math.ceil(page / activeStrategies.length);
  const { q, sort, page: ghPage } = activeStrategies[strategyIdx](ghPageNum);

  const ghUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=${sort}&order=desc&per_page=30&page=${ghPage}`;

  try {
    const ghRes = await fetch(ghUrl, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "Stella-App/1.0",
      },
      next: { revalidate: 300 },
    });

    let repos: ReturnType<typeof mapRepo>[] = [];

    if (ghRes.ok) {
      const data = await ghRes.json();
      repos = (data.items as GHRepo[] || [])
        // Star floor lowered to 25 so the "Hidden gems" strategy (stars:25..200) can surface.
        // Each strategy applies its own per-query floor, so the global floor only catches strays.
        .filter(r => !swipedSet.has(r.full_name) && r.stargazers_count >= 25)
        .map(mapRepo);
    }

    // If GitHub returned sparse results, supplement with fallback pool
    if (repos.length < 10) {
      const fallbackSlice = FALLBACK_REPOS
        .filter(r => !swipedSet.has(r.full_name))
        .filter(r => !repos.some(live => live.full_name === r.full_name))
        .slice(0, 30 - repos.length);
      repos = [...repos, ...fallbackSlice];
    }

    // Sprinkle community-submitted repos throughout (every ~5 cards)
    const merged: MappedRepo[] = [...repos];
    communityRepos
      .filter(cr => !merged.some(r => r.full_name === cr.full_name))
      .forEach((cr, i) => {
        const pos = Math.min((i + 1) * 5, merged.length);
        merged.splice(pos, 0, cr);
      });

    // Sprinkle externally-sourced repos (Show HN, etc.) every ~8 cards, offset by 3
    // from the community-submission cadence so cards from different sources don't bunch up.
    externalRepos
      .filter(er => !merged.some(r => r.full_name === er.full_name))
      .forEach((er, i) => {
        const pos = Math.min(3 + (i + 1) * 8, merged.length);
        merged.splice(pos, 0, er);
      });

    return NextResponse.json({ repos: merged });
  } catch (err) {
    console.error("Repos fetch error:", err);
    // Full fallback
    const repos: MappedRepo[] = FALLBACK_REPOS
      .filter(r => !swipedSet.has(r.full_name))
      .slice(0, 30);
    return NextResponse.json({ repos });
  }
}
