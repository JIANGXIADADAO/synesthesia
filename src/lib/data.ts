/**
 * 静态数据层 — 替代 API 路由（静态导出模式）
 * 数据来自 seed，包含 DIY 感官预设
 */

export interface ColorData {
  id: string;
  slug: string;
  nameZh: string;
  nameEn: string | null;
  hex: string | null;
  summary: string | null;
  answerCount: number;
  consensusScore: number;
  createdAt: string;
  answers: AnswerData[];
  sensory?: {
    vibration: { pattern: number[]; label: string };
    soundscape: {
      synthType: string; notes: string[]; duration: number;
      reverbDecay: number; reverbWet: number; delayTime: number; delayFeedback: number;
      lfoRate: number; lfoDepth: number; filterFreq: number; filterType: string;
      noiseMix: number;
      envelope: { attack: number; decay: number; sustain: number; release: number };
    };
  };
}

export interface AnswerData {
  id: string;
  authorName: string | null;
  touch: string | null;
  sound: string | null;
  temperature: string | null;
  smell: string | null;
  summary: string | null;
  voteCount: number;
  isConsensus: boolean;
  createdAt: string;
}

import { compileConsensus } from "./sensory-engine";

// 种子数据文本
const SEED_TEXT: Record<string, { author: string; touch: string; sound: string; temperature: string; smell: string; summary: string; votes: number }> = {
  red:    { author: "阿杰", touch: "粗糙颗粒感，像摸到被太阳晒了一天的红砖墙，有点扎手", sound: "密集的鼓点声，越来越快，像心跳加速", temperature: "微烫，掌心发热", smell: "干辣椒和铁锈的味道，微微呛人", summary: "红色是用力的、热热的、停不下来的感觉。像生气时脸发烫、心跳加速。", votes: 287 },
  orange: { author: "小林", touch: "温热光滑像被阳光晒暖的陶瓷杯，表面圆润不发涩", sound: "中音萨克斯风，圆润不刺耳，带一点沙哑的尾音", temperature: "温暖但不烫，像秋天下午的太阳照在手臂上", smell: "橘皮被剥开时溅出的油香，带一丝清甜", summary: "橙色是温暖而有弹性的。不激烈，但持续地暖着你。", votes: 198 },
  yellow: { author: "夏天", touch: "细软轻飘像蒲公英绒毛，又像被晒得微微发烫的丝绸", sound: "柔和的风铃声和木琴，短促轻快地跳跃", temperature: "暖洋洋的，像春天正午阳光透过薄窗帘照在皮肤上", smell: "柠檬皮和蜂蜜的清香，新鲜的，微微酸涩", summary: "黄色是轻快的、跳脱的。像被逗笑时身体绷不住的那一下。", votes: 231 },
  green:  { author: "阿树", touch: "柔软潮湿的苔藓，踩上去微微下陷，带着露水的滑腻感", sound: "树叶沙沙声和远处溪流，缓慢而不间断", temperature: "常温偏凉，像赤脚踩在草地上的清晨", smell: "松脂和泥土混合，雨后折断草叶的清香", summary: "绿色是生命从腐烂里长出新东西。安静地、不停歇地、向上。", votes: 315 },
  blue:   { author: "林言", touch: "光滑冰凉像被海水冲刷千年的鹅卵石，表面凉而细腻", sound: "远处潮汐声和海浪拍打，低沉有节奏，间或一声海鸥", temperature: "微凉清冷，像海风拂过刚出水的手臂", smell: "盐和海水微腥的味道，干净的，旷远的", summary: "蓝色是站在海边，浪从脚底抽走沙子的感觉。自由、没有形状但有力气。", votes: 276 },
  purple: { author: "林言", touch: "摸起来像粗糙橡胶加细沙流过指尖", sound: "听起来像低音提琴和远处雷声", temperature: "微凉和闷热交替", smell: "臭氧和湿泥土的味道", summary: "紫色是雷雨前空气里的重量感。闷闷的，带电的。", votes: 342 },
  black:  { author: "深夜", touch: "什么都没有的质感——像把手伸进一个装满静默的箱子", sound: "极低沉的嗡鸣，几乎听不到但能感觉到，像电梯井深处的共振", temperature: "微凉——不是冰冷，是没有温度的凉", smell: "干燥的木炭和旧书纸的味道，淡淡的", summary: "黑色不是空。是所有的声音和温度都被吸进去之后，剩下的那种沉静。", votes: 263 },
  white:  { author: "初雪", touch: "极细的粉末，像面粉从指缝漏下去，轻得几乎不存在", sound: "极短极轻的全方位点触，像雪花落在掌心里", temperature: "初雪的微凉——不是刺骨的冷，是一碰就化的凉", smell: "清新的冷空气，没有味道的味道，干净的", summary: "白色是所有的颜色都退到最远，剩下的一种干净的、轻飘飘的安静。", votes: 189 },
};

// DIY 预设（从 JSON 预编译为参数）
const DIY_PRESETS: Record<string, {
  vibration: { pattern: number[]; label: string };
  soundscape: {
    synthType: string; notes: string[]; duration: number;
    reverbDecay: number; reverbWet: number; delayTime: number; delayFeedback: number;
    lfoRate: number; lfoDepth: number; filterFreq: number; filterType: string;
    noiseMix: number;
    envelope: { attack: number; decay: number; sustain: number; release: number };
  };
} | null> = {};

// 尝试加载 DIY JSON
try {
  const diy = require("../../synesthesia-presets-diy1.json");
  for (const [slug, preset] of Object.entries(diy) as any) {
    DIY_PRESETS[slug] = {
      vibration: preset.vibe,
      soundscape: {
        synthType: preset.sound.synthType,
        notes: preset.sound.notes,
        duration: preset.sound.duration,
        reverbDecay: preset.sound.reverbDecay,
        reverbWet: preset.sound.reverbWet,
        delayTime: preset.sound.delayTime,
        delayFeedback: preset.sound.delayFeedback,
        lfoRate: preset.sound.lfoRate,
        lfoDepth: preset.sound.lfoDepth,
        filterFreq: preset.sound.filterFreq,
        filterType: preset.sound.filterType,
        noiseMix: preset.sound.noiseMix,
        envelope: {
          attack: preset.sound.attack,
          decay: preset.sound.decay,
          sustain: preset.sound.sustain,
          release: preset.sound.release,
        },
      },
    };
  }
} catch {}

function getSensory(slug: string, text: any) {
  if (DIY_PRESETS[slug]) return DIY_PRESETS[slug]!;
  const compiled = compileConsensus(text);
  return {
    vibration: compiled.vibration,
    soundscape: {
      ...compiled.soundscape,
      envelope: compiled.soundscape.envelope,
    },
  };
}

const COLORS_BASE = [
  { slug: "red", nameZh: "红色", nameEn: "Red", hex: "#E53935" },
  { slug: "orange", nameZh: "橙色", nameEn: "Orange", hex: "#FB8C00" },
  { slug: "yellow", nameZh: "黄色", nameEn: "Yellow", hex: "#FDD835" },
  { slug: "green", nameZh: "绿色", nameEn: "Green", hex: "#43A047" },
  { slug: "blue", nameZh: "蓝色", nameEn: "Blue", hex: "#1E88E5" },
  { slug: "purple", nameZh: "紫色", nameEn: "Purple", hex: "#8E24AA" },
  { slug: "black", nameZh: "黑色", nameEn: "Black", hex: "#212121" },
  { slug: "white", nameZh: "白色", nameEn: "White", hex: "#FAFAFA" },
];

// 预生成所有数据
function buildAllData(): { colors: ColorData[]; bySlug: Record<string, ColorData> } {
  const colors: ColorData[] = [];
  const bySlug: Record<string, ColorData> = {};

  for (const c of COLORS_BASE) {
    const text = SEED_TEXT[c.slug];
    const sensory = getSensory(c.slug, text);
    const answer: AnswerData = {
      id: c.slug + "-0000",
      authorName: text.author,
      touch: text.touch,
      sound: text.sound,
      temperature: text.temperature,
      smell: text.smell,
      summary: text.summary,
      voteCount: text.votes,
      isConsensus: true,
      createdAt: "2026-07-04",
    };

    const data: ColorData = {
      id: c.slug + "-id",
      slug: c.slug,
      nameZh: c.nameZh,
      nameEn: c.nameEn,
      hex: c.hex,
      summary: text.summary,
      answerCount: 1,
      consensusScore: text.votes,
      createdAt: "2026-07-04",
      answers: [answer],
      sensory: sensory as any,
    };

    colors.push(data);
    bySlug[c.slug] = data;
  }

  // 按共识分排序
  colors.sort((a, b) => b.consensusScore - a.consensusScore);
  return { colors, bySlug };
}

export const STATIC_DATA = buildAllData();

// localStorage 辅助
const STORAGE_KEY = "synesthesia-user-data";

interface UserData {
  answers: Record<string, AnswerData[]>; // slug → extra answers
  votes: Record<string, number>;         // answerId → vote delta
}

function loadUserData(): UserData {
  if (typeof window === "undefined") return { answers: {}, votes: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { answers: {}, votes: {} };
  } catch { return { answers: {}, votes: {} }; }
}

function saveUserData(data: UserData) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let uidCounter = 0;
export function addLocalAnswer(slug: string, authorName: string, touch: string, sound: string, temperature: string, smell: string, summary: string): AnswerData {
  const user = loadUserData();
  if (!user.answers[slug]) user.answers[slug] = [];
  const answer: AnswerData = {
    id: "local-" + (++uidCounter),
    authorName, touch, sound, temperature, smell, summary,
    voteCount: 0, isConsensus: false,
    createdAt: new Date().toISOString().slice(0, 10),
  };
  user.answers[slug].push(answer);
  saveUserData(user);
  return answer;
}

export function getLocalAnswers(slug: string): AnswerData[] {
  return loadUserData().answers[slug] || [];
}

export function toggleLocalVote(answerId: string): { voted: boolean; delta: number } {
  const user = loadUserData();
  const current = user.votes[answerId] || 0;
  if (current > 0) {
    user.votes[answerId] = 0;
    saveUserData(user);
    return { voted: false, delta: -1 };
  } else {
    user.votes[answerId] = 1;
    saveUserData(user);
    return { voted: true, delta: 1 };
  }
}

export function getLocalVoteDelta(answerId: string): number {
  return loadUserData().votes[answerId] || 0;
}
