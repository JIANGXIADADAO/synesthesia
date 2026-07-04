/**
 * 数据库层 — Node.js 内置 SQLite（node:sqlite，v22.5+）
 *
 * 本地：./synesthesia.db
 * Netlify：/tmp/synesthesia.db（唯一可写目录）
 */
import { DatabaseSync } from "node:sqlite";
import path from "path";
import * as fs from "fs";

const isNetlify = !!process.env.NETLIFY || !!process.env.NETLIFY_LOCAL;
const DB_PATH = process.env.DATABASE_URL
  || (isNetlify ? "/tmp/synesthesia.db" : path.join(process.cwd(), "synesthesia.db"));

let _db: DatabaseSync | null = null;
let _seeded = false;

export function getDb(): DatabaseSync {
  if (!_db) {
    _db = new DatabaseSync(DB_PATH);
    _db.exec("PRAGMA journal_mode = WAL");
    _db.exec("PRAGMA foreign_keys = ON");
    ensureTables(_db);
    if (!_seeded) {
      seedIfEmpty(_db);
      _seeded = true;
    }
  }
  return _db;
}

function ensureTables(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS colors (
      id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name_zh TEXT NOT NULL,
      name_en TEXT, hex TEXT, summary TEXT, answer_count INTEGER DEFAULT 0,
      consensus_score INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS answers (
      id TEXT PRIMARY KEY, color_id TEXT NOT NULL REFERENCES colors(id) ON DELETE CASCADE,
      author_name TEXT, touch TEXT, sound TEXT, temperature TEXT, smell TEXT,
      summary TEXT, vote_count INTEGER DEFAULT 0, is_consensus INTEGER DEFAULT 0,
      vibe_pattern TEXT, soundscape_params TEXT, created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY, answer_id TEXT NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
      voter_id TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS unique_vote ON votes(answer_id, voter_id)`);
}

function seedIfEmpty(db: DatabaseSync) {
  const count = db.prepare("SELECT COUNT(*) as c FROM colors").get() as { c: number };
  if (count.c > 0) return;

  console.log("🌱 自动播种...");
  try {
    // 动态加载 seed 逻辑（避免循环依赖）
    const { runSeed } = require("./seed");
    runSeed(db);
  } catch (e) {
    console.error("⚠️ 自动播种失败，数据库为空:", e);
  }
}
