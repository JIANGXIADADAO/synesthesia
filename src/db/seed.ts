/**
 * 种子数据：8 种基础色 + 社区共识示范回答
 *
 * 优先读取 synesthesia-presets-diy1.json 中的 DIY 参数
 * 回退到 compileConsensus() 自动编译
 *
 * 可作为模块导入：import { runSeed } from "./seed"
 * 也可 CLI 运行：npx tsx src/db/seed.ts
 */
import { DatabaseSync } from "node:sqlite";
import path from "path";
import * as fs from "fs";
import { compileConsensus, uuid } from "../lib/sensory-engine";

const BASE_COLORS = [
  { slug: "red", nameZh: "红色", nameEn: "Red", hex: "#E53935" },
  { slug: "orange", nameZh: "橙色", nameEn: "Orange", hex: "#FB8C00" },
  { slug: "yellow", nameZh: "黄色", nameEn: "Yellow", hex: "#FDD835" },
  { slug: "green", nameZh: "绿色", nameEn: "Green", hex: "#43A047" },
  { slug: "blue", nameZh: "蓝色", nameEn: "Blue", hex: "#1E88E5" },
  { slug: "purple", nameZh: "紫色", nameEn: "Purple", hex: "#8E24AA" },
  { slug: "black", nameZh: "黑色", nameEn: "Black", hex: "#212121" },
  { slug: "white", nameZh: "白色", nameEn: "White", hex: "#FAFAFA" },
];

// 故事文本（用于颜色卡片展示和感官引擎回退）
const SAMPLE_ANSWERS: Record<string, {
  author: string; touch: string; sound: string; temperature: string; smell: string; summary: string; votes: number;
}> = {
  red:    { author: "阿杰", touch: "粗糙颗粒感，像摸到被太阳晒了一天的红砖墙，有点扎手", sound: "密集的鼓点声，越来越快，像心跳加速", temperature: "微烫，掌心发热", smell: "干辣椒和铁锈的味道，微微呛人", summary: "红色是用力的、热热的、停不下来的感觉。像生气时脸发烫、心跳加速。", votes: 287 },
  orange: { author: "小林", touch: "温热光滑像被阳光晒暖的陶瓷杯，表面圆润不发涩", sound: "中音萨克斯风，圆润不刺耳，带一点沙哑的尾音", temperature: "温暖但不烫，像秋天下午的太阳照在手臂上", smell: "橘皮被剥开时溅出的油香，带一丝清甜", summary: "橙色是温暖而有弹性的。不激烈，但持续地暖着你。", votes: 198 },
  yellow: { author: "夏天", touch: "细软轻飘像蒲公英绒毛，又像被晒得微微发烫的丝绸", sound: "柔和的风铃声和木琴，短促轻快地跳跃", temperature: "暖洋洋的，像春天正午阳光透过薄窗帘照在皮肤上", smell: "柠檬皮和蜂蜜的清香，新鲜的，微微酸涩", summary: "黄色是轻快的、跳脱的。像被逗笑时身体绷不住的那一下。", votes: 231 },
  green:  { author: "阿树", touch: "柔软潮湿的苔藓，踩上去微微下陷，带着露水的滑腻感", sound: "树叶沙沙声和远处溪流，缓慢而不间断", temperature: "常温偏凉，像赤脚踩在草地上的清晨", smell: "松脂和泥土混合，雨后折断草叶的清香", summary: "绿色是生命从腐烂里长出新东西。安静地、不停歇地、向上。", votes: 315 },
  blue:   { author: "林言", touch: "光滑冰凉像被海水冲刷千年的鹅卵石，表面凉而细腻", sound: "远处潮汐声和海浪拍打，低沉有节奏，间或一声海鸥", temperature: "微凉清冷，像海风拂过刚出水的手臂", smell: "盐和海水微腥的味道，干净的，旷远的", summary: "蓝色是站在海边，浪从脚底抽走沙子的感觉。自由、没有形状但有力气。", votes: 276 },
  purple: { author: "林言", touch: "摸起来像粗糙橡胶加细沙流过指尖", sound: "听起来像低音提琴和远处雷声", temperature: "微凉和闷热交替", smell: "臭氧和湿泥土的味道", summary: "紫色是雷雨前空气里的重量感。闷闷的，带电的。", votes: 342 },
  black:  { author: "深夜", touch: "什么都没有的质感——像把手伸进一个装满静默的箱子", sound: "极低沉的嗡鸣，几乎听不到但能感觉到，像电梯井深处的共振", temperature: "微凉——不是冰冷，是没有温度的凉", smell: "干燥的木炭和旧书纸的味道，淡淡的", summary: "黑色不是空。是所有的声音和温度都被吸进去之后，剩下的那种沉静。", votes: 263 },
  white:  { author: "初雪", touch: "极细的粉末，像面粉从指缝漏下去，轻得几乎不存在", sound: "极短极轻的全方位点触，像雪花落在掌心里", temperature: "初雪的微凉——不是刺骨的冷，是一碰就化的凉", smell: "清新的冷空气，没有味道的味道，干净的", summary: "白色是所有的颜色都退到最远，剩下的一种干净的、轻飘飘的安静。", votes: 189 },
};

// ============================================================
// 加载 DIY 预设
// ============================================================

let diyPresets: Record<string, any> | null = null;
const diyPath = path.join(process.cwd(), "synesthesia-presets-diy1.json");
if (fs.existsSync(diyPath)) {
  try {
    diyPresets = JSON.parse(fs.readFileSync(diyPath, "utf-8"));
    console.log("📂 加载 DIY 预设:", diyPath, "\n");
  } catch (e) {
    console.warn("⚠️ DIY 预设读取失败，回退到自动编译\n");
  }
}

function buildSensory(slug: string, answerText: any): { vibe: string; soundscape: string } {
  // 有 DIY 预设就用预设，否则自动编译
  if (diyPresets?.[slug]) {
    const d = diyPresets[slug];
    const s = d.sound;
    const v = d.vibe;
    return {
      vibe: JSON.stringify(v),
      soundscape: JSON.stringify({
        synthType: s.synthType,
        notes: s.notes,
        duration: s.duration,
        reverbDecay: s.reverbDecay,
        reverbWet: s.reverbWet,
        delayTime: s.delayTime,
        delayFeedback: s.delayFeedback,
        lfoRate: s.lfoRate,
        lfoDepth: s.lfoDepth,
        filterFreq: s.filterFreq,
        filterType: s.filterType,
        noiseMix: s.noiseMix,
        envelope: {
          attack: s.attack,
          decay: s.decay,
          sustain: s.sustain,
          release: s.release,
        },
      }),
    };
  }
  // 回退：自动编译
  const sensory = compileConsensus(answerText);
  return {
    vibe: JSON.stringify(sensory.vibration),
    soundscape: JSON.stringify(sensory.soundscape),
  };
}

// ============================================================
// 播种函数（可被 db/index.ts 调用，也可 CLI 直接运行）
// ============================================================

export function runSeed(db: DatabaseSync) {
  const insertColor = db.prepare(
    `INSERT OR REPLACE INTO colors (id, slug, name_zh, name_en, hex) VALUES (?, ?, ?, ?, ?)`
  );
  const insertAnswer = db.prepare(
    `INSERT INTO answers (id, color_id, author_name, touch, sound, temperature, smell, summary, vote_count, is_consensus, vibe_pattern, soundscape_params)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const updateColorStats = db.prepare(
    `UPDATE colors SET answer_count=1, consensus_score=?, summary=? WHERE slug=?`
  );

  console.log("🌱 播种 Synesthesia 演示数据\n");

  const colorIds: Record<string, string> = {};
  for (const c of BASE_COLORS) {
    colorIds[c.slug] = uuid();
    insertColor.run(colorIds[c.slug], c.slug, c.nameZh, c.nameEn, c.hex);
  }
  console.log(`📦 ${BASE_COLORS.length} 种基础颜色\n`);

  console.log("🔊 编译感官参数 + 插入社区共识回答:\n");

  for (const [slug, sample] of Object.entries(SAMPLE_ANSWERS)) {
    const colorName = BASE_COLORS.find((c) => c.slug === slug)?.nameZh || slug;
    const sensory = buildSensory(slug, sample);
    const vibeObj = JSON.parse(sensory.vibe);
    const scObj = JSON.parse(sensory.soundscape);
    const source = diyPresets?.[slug] ? "DIY" : "引擎编译";

    insertAnswer.run(
      uuid(), colorIds[slug], sample.author,
      sample.touch, sample.sound, sample.temperature, sample.smell,
      sample.summary, sample.votes, 1,
      sensory.vibe, sensory.soundscape
    );
    updateColorStats.run(sample.votes, sample.summary, slug);

    console.log(`  ${colorName} ← ${sample.author}  💜${sample.votes}  [${source}]`);
    console.log(`    振动: ${vibeObj.label || "自定义"} (${vibeObj.pattern?.length || "?"} 步)`);
    console.log(`    音景: ${scObj.synthType} ${scObj.notes?.join("+")} ${scObj.duration}s`);
  }

  console.log(`\n🎉 完成！${BASE_COLORS.length} 色 × 社区共识回答`);
  if (diyPresets) console.log("  ✨ 感官参数来自 DIY 预设\n");
  else console.log("  ⚙️ 感官参数来自引擎自动编译\n");
}

// ============================================================
// CLI 入口
// ============================================================

// 直接运行时执行播种（非 import）
const isMainModule = process.argv[1]?.includes("seed") || process.argv[1]?.includes("tsx");
if (isMainModule) {
  const DB_PATH = process.env.DATABASE_URL || path.join(process.cwd(), "synesthesia.db");
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");

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

  runSeed(db);
  db.close();
}
