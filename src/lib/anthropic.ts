import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export interface EnhancedDescription {
  description: string;
  highlights: string[];
  source: "llm" | "fallback";
}

const SYSTEM_PROMPT = `You write punchy, helpful summaries of GitHub repositories for a Tinder-style swipe feed called Stella. Users see one repo at a time on a card and decide in 5 seconds whether to star or skip it.

Your job: turn a repo's name, description, topics, and README into a tight 2-sentence summary plus 3 highlight bullets. Lead with what the project DOES and why it's interesting — not how to install it. Skip badges, license boilerplate, sponsor pitches, and contribution sections. Each highlight is 4-8 words, concrete (e.g. "Runs locally on Mac/Linux/Windows" beats "Cross-platform support"). No emojis, no markdown formatting.`;

const MAX_README_CHARS = 4000;

function clean(text: string): string {
  return text
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/<img[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchReadme(fullName: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${fullName}/readme`, {
      headers: {
        Accept: "application/vnd.github.raw",
        "User-Agent": "Stella-App/1.0",
      },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const raw = await res.text();
    return clean(raw).slice(0, MAX_README_CHARS);
  } catch {
    return null;
  }
}

interface SynthesisInput {
  full_name: string;
  github_description: string | null;
  topics: string[];
  language: string | null;
}

export async function synthesizeDescription(
  input: SynthesisInput
): Promise<EnhancedDescription> {
  const supabase = await createClient();

  const { data: cached } = await supabase
    .from("repo_descriptions")
    .select("description, highlights, source, expires_at")
    .eq("repo_full_name", input.full_name)
    .single();

  if (cached && new Date(cached.expires_at) > new Date()) {
    return {
      description: cached.description,
      highlights: (cached.highlights as string[]) || [],
      source: cached.source as "llm" | "fallback",
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const fallback: EnhancedDescription = {
    description: input.github_description || `${input.full_name} — explore the code.`,
    highlights: input.topics.slice(0, 3),
    source: "fallback",
  };

  if (!apiKey) {
    await persistCache(input.full_name, fallback);
    return fallback;
  }

  const readme = await fetchReadme(input.full_name);

  try {
    const client = new Anthropic({ apiKey });
    const userContent = [
      `Repo: ${input.full_name}`,
      input.language ? `Language: ${input.language}` : null,
      input.topics.length ? `Topics: ${input.topics.join(", ")}` : null,
      input.github_description ? `GitHub description: ${input.github_description}` : null,
      readme ? `\nREADME (excerpt):\n${readme}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              description: {
                type: "string",
                description: "2 punchy sentences explaining what the repo does and why it's interesting.",
              },
              highlights: {
                type: "array",
                items: { type: "string" },
                description: "Exactly 3 short concrete highlights, 4-8 words each.",
              },
            },
            required: ["description", "highlights"],
            additionalProperties: false,
          },
        },
      },
      messages: [{ role: "user", content: userContent }],
    });

    const textBlock = response.content.find(b => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text block in LLM response");
    }
    const parsed = JSON.parse(textBlock.text) as {
      description?: string;
      highlights?: string[];
    };
    if (!parsed.description || !Array.isArray(parsed.highlights)) {
      throw new Error("Invalid LLM output shape");
    }

    const result: EnhancedDescription = {
      description: parsed.description.trim(),
      highlights: parsed.highlights.slice(0, 3).map(h => h.trim()).filter(Boolean),
      source: "llm",
    };
    await persistCache(input.full_name, result);
    return result;
  } catch (err) {
    console.error(`[anthropic] synthesis failed for ${input.full_name}:`, err);
    await persistCache(input.full_name, fallback);
    return fallback;
  }
}

async function persistCache(full_name: string, value: EnhancedDescription) {
  try {
    const supabase = await createClient();
    await supabase.from("repo_descriptions").upsert(
      {
        repo_full_name: full_name,
        description: value.description,
        highlights: value.highlights,
        source: value.source,
        updated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: "repo_full_name" }
    );
  } catch (err) {
    console.error(`[anthropic] cache write failed for ${full_name}:`, err);
  }
}
