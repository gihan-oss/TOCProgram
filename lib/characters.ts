// Cute character avatars — a friendly, game-like stand-in when someone hasn't
// uploaded a photo. Each person always gets the SAME character (picked from a
// stable hash of their email), so they're recognisable across the portal.

const CHARACTERS = [
  "🦊", "🐼", "🦁", "🐨", "🐯", "🦉", "🐸", "🐧", "🦄", "🐢",
  "🐵", "🐰", "🐳", "🦋", "🐝", "🦖", "🐙", "🦩", "🐬", "🦔",
];

// Soft background tints paired with the characters — all in the portal's
// purple family, so the directory stays on-brand (no clashing rainbow colours).
const TINTS = [
  "bg-[hsl(271_56%_45%/0.12)]", "bg-[hsl(275_72%_60%/0.14)]", "bg-[hsl(285_55%_58%/0.13)]",
  "bg-[hsl(266_60%_52%/0.13)]", "bg-[hsl(276_40%_50%/0.12)]", "bg-[hsl(258_62%_60%/0.13)]",
];

function hash(seed: string): number {
  let h = 0;
  const s = seed.toLowerCase();
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function characterFor(seed: string): string {
  return CHARACTERS[hash(seed) % CHARACTERS.length];
}

export function characterTint(seed: string): string {
  return TINTS[hash(seed) % TINTS.length];
}

// A playful rank from a completion percentage — the "level" of their journey.
export function journeyRank(pct: number): { label: string; emoji: string } {
  if (pct >= 100) return { label: "Champion", emoji: "🏆" };
  if (pct >= 75) return { label: "Blooming", emoji: "🌸" };
  if (pct >= 40) return { label: "Growing", emoji: "🌿" };
  if (pct > 0) return { label: "Sprouting", emoji: "🌱" };
  return { label: "Just joined", emoji: "👋" };
}
