// 纯 TypeScript 类型定义（不再依赖 Drizzle ORM）

export interface Color {
  id: string;
  slug: string;
  name_zh: string;
  name_en: string | null;
  hex: string | null;
  summary: string | null;
  answer_count: number;
  consensus_score: number;
  created_at: string;
}

export interface Answer {
  id: string;
  color_id: string;
  author_name: string | null;
  touch: string | null;
  sound: string | null;
  temperature: string | null;
  smell: string | null;
  summary: string | null;
  vote_count: number;
  is_consensus: number; // SQLite boolean = 0|1
  vibe_pattern: string | null; // JSON
  soundscape_params: string | null; // JSON
  created_at: string;
}

export interface Vote {
  id: string;
  answer_id: string;
  voter_id: string;
  created_at: string;
}
