import { NextResponse } from "next/server";

const MAX_CHARS = 4000;

function clean(text: string): string {
  return text
    // HTML comments
    .replace(/<!--[\s\S]*?-->/g, "")
    // Markdown badge images and image-links
    .replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    // Inline HTML tags (badges, divs, br, etc.)
    .replace(/<\/?[a-z][^>]*>/gi, "")
    // Code fences
    .replace(/```[\s\S]*?```/g, "")
    // Inline code
    .replace(/`([^`]+)`/g, "$1")
    // Markdown links: keep the text, drop the URL
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Heading hashes
    .replace(/^#{1,6}\s+/gm, "")
    // Bold/italic markers
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    // Horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, "")
    // Multiple blank lines → one
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fullName = searchParams.get("full_name");
  if (!fullName || !fullName.includes("/")) {
    return NextResponse.json({ error: "Missing or invalid full_name" }, { status: 400 });
  }

  const ghToken = process.env.GITHUB_API_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.raw",
    "User-Agent": "Stella-App/1.0",
  };
  if (ghToken) headers.Authorization = `token ${ghToken}`;

  try {
    const res = await fetch(`https://api.github.com/repos/${fullName}/readme`, {
      headers,
      // Cache READMEs for a day on Vercel's edge so we don't re-fetch on every tap.
      next: { revalidate: 86400 },
    });

    if (res.status === 404) {
      return NextResponse.json({ readme: "", missing: true });
    }
    if (!res.ok) {
      return NextResponse.json(
        { error: `GitHub returned ${res.status}` },
        { status: 502 }
      );
    }

    const raw = await res.text();
    const cleaned = clean(raw);
    const truncated = cleaned.slice(0, MAX_CHARS);
    return NextResponse.json({
      readme: truncated,
      length: cleaned.length,
      truncated: cleaned.length > MAX_CHARS,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "README fetch failed", details: message }, { status: 500 });
  }
}
