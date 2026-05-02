export const INTEREST_TAGS: Record<string, string[]> = {
  // Industries are intentionally first — they map to the broadest curated mix of
  // strategies (direct + related), so picking one shapes the feel of the feed
  // more than picking a single language or topic does. See INTEREST_STRATEGY_MAP
  // in /api/repos for the actual mappings.
  Industries: [
    "Software Engineering",
    "Data Science",
    "AI Research",
    "Finance / Trading",
    "Web Development",
    "Mobile Development",
    "DevOps / Cloud",
    "Game Dev",
    "Bioinformatics",
    "Cybersecurity",
    "Research / Academia",
  ],
  Languages: [
    "JavaScript",
    "TypeScript",
    "Python",
    "Rust",
    "Go",
    "Java",
    "C/C++",
    "Ruby",
    "Swift",
    "Kotlin",
    "Lua",
    "Elixir",
  ],
  Frameworks: ["React", "Vue", "Svelte", "Next.js", "Astro"],
  Topics: [
    "AI / ML",
    "AI Agents",
    "LLMs",
    "Frontend",
    "Backend",
    "Mobile",
    "CLI Tools",
    "DevOps",
    "Security",
    "Games",
    "Robotics",
    "Blockchain",
    "Data Science",
    "Databases",
    "Dev Tools",
    "Education",
    "Open Source",
  ],
};

export const ALL_INTERESTS: string[] = Object.values(INTEREST_TAGS).flat();
