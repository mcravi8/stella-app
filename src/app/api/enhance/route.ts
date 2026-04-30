import { NextResponse } from "next/server";
import { synthesizeDescription } from "@/lib/anthropic";

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { full_name, github_description, topics, language } = body as {
      full_name?: string;
      github_description?: string | null;
      topics?: string[];
      language?: string | null;
    };

    if (!full_name || typeof full_name !== "string" || !full_name.includes("/")) {
      return NextResponse.json({ error: "Invalid full_name" }, { status: 400 });
    }

    const result = await synthesizeDescription({
      full_name,
      github_description: github_description ?? null,
      topics: Array.isArray(topics) ? topics.slice(0, 10) : [],
      language: language ?? null,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/enhance] failed:", err);
    return NextResponse.json({ error: "Synthesis failed" }, { status: 500 });
  }
}
