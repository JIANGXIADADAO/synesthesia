/**
 * 感官编译引擎 v2
 *
 * 输入：社区共识回答的文本描述
 * 输出：
 *   1. 振动模式 —— 周期性、4-6 秒
 *   2. 音景参数 —— 供 Tone.js 合成，含混响/延迟/LFO 调制
 */

// ============================================================
// 类型
// ============================================================

export interface SensoryInput {
  touch: string;
  sound: string;
  temperature: string;
  smell: string;
  summary: string;
}

export interface VibrationOutput {
  pattern: number[];   // 完整振动序列（已循环，4-6 秒）
  label: string;
}

export interface SoundscapeOutput {
  synthType: "AMSynth" | "FMSynth" | "Synth" | "PluckSynth";
  notes: string[];                    // 音名，如 ["C3","G3","E4"]
  duration: number;                   // 持续秒数 (4-8)
  reverbDecay: number;               // 混响衰减 (1-10)
  reverbWet: number;                 // 混响干湿比 (0-1)
  delayTime: number;                 // 延迟时间 ("4n" 的数值)
  delayFeedback: number;             // 延迟反馈 (0-1)
  lfoRate: number;                   // LFO 频率 Hz
  lfoDepth: number;                  // LFO 深度
  filterFreq: number;                // 滤波器起始频率
  filterType: BiquadFilterType;
  noiseMix: number;                  // 噪声混合 (0-1)
  envelope: { attack: number; decay: number; sustain: number; release: number };
}

export interface SensoryOutput {
  vibration: VibrationOutput;
  soundscape: SoundscapeOutput;
}

// ============================================================
// 关键词映射表（精简版，驱动参数而非硬编码）
// ============================================================

interface KeywordProfile {
  keywords: string[];
  // 振动特征
  vibeBase: number[];        // 一个周期的振动模式
  vibeCycles: number;        // 循环次数
  // 音景特征
  synthType: SoundscapeOutput["synthType"];
  baseFreq: number;          // 基础频率 Hz
  harmonics: number[];       // 泛音倍数 (如 [2,3] = 2倍频+3倍频)
  filterType: BiquadFilterType;
  filterFreq: number;
}

const TOUCH_PROFILES: KeywordProfile[] = [
  {
    keywords: ["粗糙", "颗粒", "沙子", "砂", "摩擦", "磨", "砾", "糙"],
    vibeBase: [30, 15, 25, 12, 20, 10],
    vibeCycles: 12,
    synthType: "AMSynth",
    baseFreq: 110,
    harmonics: [2, 3, 5],
    filterType: "lowpass",
    filterFreq: 600,
  },
  {
    keywords: ["光滑", "丝", "流水", "滑", "绸", "细腻"],
    vibeBase: [200, 100, 300, 100],
    vibeCycles: 6,
    synthType: "FMSynth",
    baseFreq: 220,
    harmonics: [1.5, 2, 4],
    filterType: "lowpass",
    filterFreq: 800,
  },
  {
    keywords: ["重", "压", "沉", "重量", "下坠", "沉甸甸"],
    vibeBase: [500, 150, 600, 200, 400],
    vibeCycles: 4,
    synthType: "Synth",
    baseFreq: 55,
    harmonics: [1, 2],
    filterType: "lowpass",
    filterFreq: 200,
  },
  {
    keywords: ["轻", "飘", "羽毛", "细绒", "绒", "轻盈", "细软"],
    vibeBase: [15, 40, 10, 30, 10],
    vibeCycles: 20,
    synthType: "FMSynth",
    baseFreq: 660,
    harmonics: [2, 3],
    filterType: "highpass",
    filterFreq: 400,
  },
  {
    keywords: ["刺", "尖", "扎", "针", "刺痛"],
    vibeBase: [40, 20, 40],
    vibeCycles: 15,
    synthType: "Synth",
    baseFreq: 1320,
    harmonics: [1, 5],
    filterType: "highpass",
    filterFreq: 1000,
  },
  {
    keywords: ["弹", "跳", "跃", "蹦", "脉动", "搏动"],
    vibeBase: [60, 80, 50, 150, 50, 250],
    vibeCycles: 8,
    synthType: "PluckSynth",
    baseFreq: 330,
    harmonics: [1, 2, 3],
    filterType: "bandpass",
    filterFreq: 500,
  },
  {
    keywords: ["软", "棉花", "绵", "糯", "柔", "柔软", "细粉", "粉末", "面粉"],
    vibeBase: [300, 60, 200],
    vibeCycles: 5,
    synthType: "Synth",
    baseFreq: 180,
    harmonics: [1, 1.5],
    filterType: "lowpass",
    filterFreq: 300,
  },
  {
    keywords: ["湿", "潮", "濡", "水", "湿润", "露水", "滑腻"],
    vibeBase: [80, 25, 120, 30, 150, 50],
    vibeCycles: 8,
    synthType: "FMSynth",
    baseFreq: 200,
    harmonics: [1, 2, 3.5],
    filterType: "lowpass",
    filterFreq: 500,
  },
];

const TEMP_PROFILES: { keywords: string[]; density: number; reverbDecay: number }[] = [
  { keywords: ["烫", "灼", "烧", "火", "炽", "滚烫", "微烫"], density: 2.5, reverbDecay: 1 },
  { keywords: ["热", "炎", "炙", "发热"], density: 2.0, reverbDecay: 2 },
  { keywords: ["暖", "温", "煦", "和暖", "暖洋洋", "温暖"], density: 1.3, reverbDecay: 3 },
  { keywords: ["常温", "不冷不热", "温和"], density: 1.0, reverbDecay: 5 },
  { keywords: ["凉", "清", "凉爽", "清凉", "清冷", "偏凉"], density: 0.7, reverbDecay: 6 },
  { keywords: ["冷", "冰", "寒", "冻", "冰冷"], density: 0.4, reverbDecay: 8 },
  { keywords: ["闷", "湿热", "潮热", "闷热", "燠"], density: 0.6, reverbDecay: 2 },
  { keywords: ["微凉", "比手心凉", "略凉"], density: 0.8, reverbDecay: 5 },
];

const SOUND_PROFILES: {
  keywords: string[];
  octaveShift: number;  // 音高偏移
  lfoRate: number;
  lfoDepth: number;
  noiseMix: number;
  delayTime: number;
  delayFeedback: number;
}[] = [
  { keywords: ["低音", "大提琴", "鼓", "雷", "沉重", "轰", "低沉", "贝斯", "嗡", "共振", "嗡鸣"], octaveShift: -1, lfoRate: 0.3, lfoDepth: 200, noiseMix: 0.05, delayTime: 0.5, delayFeedback: 0.4 },
  { keywords: ["高音", "铃", "清脆", "叮", "尖", "风铃", "三角铁", "短笛"], octaveShift: 1, lfoRate: 3, lfoDepth: 300, noiseMix: 0, delayTime: 0.15, delayFeedback: 0.2 },
  { keywords: ["沙沙", "树叶", "风", "细碎", "窸窣", "悉索", "溪流"], octaveShift: 0, lfoRate: 1.5, lfoDepth: 150, noiseMix: 0.4, delayTime: 0.25, delayFeedback: 0.3 },
  { keywords: ["远处", "远", "空旷", "回", "荡", "回荡", "旷远"], octaveShift: 0, lfoRate: 0.2, lfoDepth: 100, noiseMix: 0.05, delayTime: 0.75, delayFeedback: 0.6 },
  { keywords: ["近处", "近", "贴", "耳边", "贴近"], octaveShift: 0, lfoRate: 2, lfoDepth: 50, noiseMix: 0, delayTime: 0.01, delayFeedback: 0.1 },
  { keywords: ["水", "潮", "浪", "滴", "海", "浪", "雨", "潮汐", "海鸥", "海浪"], octaveShift: 0, lfoRate: 0.5, lfoDepth: 300, noiseMix: 0.3, delayTime: 0.6, delayFeedback: 0.5 },
  { keywords: ["静", "无声", "沉寂", "静谧", "沉静", "静默"], octaveShift: -2, lfoRate: 0.1, lfoDepth: 50, noiseMix: 0, delayTime: 0, delayFeedback: 0 },
  { keywords: ["咕咕", "鸽子", "鸟", "鸽"], octaveShift: 1, lfoRate: 3, lfoDepth: 200, noiseMix: 0, delayTime: 0.1, delayFeedback: 0.15 },
];

const SMELL_PROFILES: { keywords: string[]; distortion: number; harmonicGain: number }[] = [
  { keywords: ["腥", "刺激", "臭", "呛", "刺鼻", "辛辣", "铁锈", "辣"], distortion: 0.08, harmonicGain: 0 },
  { keywords: ["香", "甜", "花", "果", "芬芳", "馥郁", "香甜", "清香", "清甜", "蜂蜜"], distortion: 0, harmonicGain: 0.15 },
  { keywords: ["泥土", "木", "草", "湿", "苔", "藓", "腐", "朽木", "森林", "松脂", "腐叶"], distortion: 0, harmonicGain: 0 },
  { keywords: ["臭氧", "金属", "电", "干净", "清新", "空旷", "冷空气", "无味"], distortion: 0.03, harmonicGain: 0.05 },
];

// ============================================================
// 匹配引擎
// ============================================================

interface MatchResult<T> {
  entry: T;
  keyword: string;
}

function matchBest<T extends { keywords: string[] }>(
  text: string,
  profiles: T[]
): MatchResult<T> | null {
  let best: MatchResult<T> | null = null;
  for (const profile of profiles) {
    for (const kw of profile.keywords) {
      if (text.includes(kw) && (!best || kw.length > best.keyword.length)) {
        best = { entry: profile, keyword: kw };
      }
    }
  }
  return best;
}

function matchAll<T extends { keywords: string[] }>(text: string, profiles: T[]): MatchResult<T>[] {
  const results: MatchResult<T>[] = [];
  for (const profile of profiles) {
    for (const kw of profile.keywords) {
      if (text.includes(kw) && !results.find((r) => r.entry === profile)) {
        results.push({ entry: profile, keyword: kw });
        break;
      }
    }
  }
  return results;
}

/** uuid */
export function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================================
// 频率 → 音名
// ============================================================

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function freqToNote(freq: number): string {
  if (freq <= 0) return "C3";
  const midi = Math.round(12 * Math.log2(freq / 440)) + 69;
  const octave = Math.floor(midi / 12) - 1;
  const name = NOTE_NAMES[((midi % 12) + 12) % 12];
  return `${name}${Math.max(1, Math.min(7, octave))}`;
}

// ============================================================
// 公开 API：编译共识 → 感官输出
// ============================================================

export function compileConsensus(input: SensoryInput): SensoryOutput {
  const fullText = [input.touch, input.sound, input.temperature, input.smell, input.summary].join(" ");

  // 1. 触觉 Profile
  const touchMatch = matchBest(fullText, TOUCH_PROFILES);
  const tp = touchMatch?.entry ?? TOUCH_PROFILES[0];
  const vibeCycles = tp.vibeCycles;
  const vibePattern: number[] = [];
  for (let i = 0; i < vibeCycles; i++) {
    vibePattern.push(...tp.vibeBase);
  }

  // 2. 温度 → 节奏密度调整
  const tempMatch = matchBest(fullText, TEMP_PROFILES);
  const density = tempMatch?.entry.density ?? 1.0;
  const reverbDecay = tempMatch?.entry.reverbDecay ?? 4;

  // 应用密度到振动间隔
  const adjustedVibe = vibePattern.map((v, i) => {
    if (i % 2 === 1) return Math.max(5, Math.round(v / density));
    if (density > 1.5) return Math.max(5, Math.round(v * 0.7));
    if (density < 0.6) return Math.round(v * 1.4);
    return v;
  });

  // 3. 听觉 Profile
  const soundMatches = matchAll(fullText, SOUND_PROFILES);
  const sp = soundMatches[0]?.entry ?? { octaveShift: 0, lfoRate: 0.5, lfoDepth: 150, noiseMix: 0.1, delayTime: 0.3, delayFeedback: 0.3 };

  // 合并所有听力匹配的延迟和噪声
  const maxDelay = Math.max(sp.delayTime, ...soundMatches.slice(1).map((s) => s.entry.delayTime));
  const maxFeedback = Math.max(sp.delayFeedback, ...soundMatches.slice(1).map((s) => s.entry.delayFeedback));
  const maxNoise = Math.max(sp.noiseMix, ...soundMatches.slice(1).map((s) => s.entry.noiseMix));

  // 4. 基础频率 + 泛音
  const baseFreq = tp.baseFreq * Math.pow(2, sp.octaveShift);
  const notes: string[] = [freqToNote(baseFreq)];
  for (const h of tp.harmonics) {
    notes.push(freqToNote(baseFreq * h));
  }

  // 5. 嗅觉 → 失真/泛音
  const smellMatches = matchAll(fullText, SMELL_PROFILES);
  const distortion = Math.max(0, ...smellMatches.map((s) => s.entry.distortion));
  const harmonicGain = Math.max(0, ...smellMatches.map((s) => s.entry.harmonicGain));

  // 6. 持续时长（根据振动周期数）
  const totalVibeMs = adjustedVibe.reduce((a, b) => a + b, 0);
  const duration = Math.max(4, Math.min(10, Math.round(totalVibeMs / 1000) + 2));

  // 7. 组装
  return {
    vibration: {
      pattern: adjustedVibe,
      label: [tempMatch?.keyword, touchMatch?.keyword].filter(Boolean).join("的") || "默认",
    },
    soundscape: {
      synthType: tp.synthType,
      notes,
      duration,
      reverbDecay,
      reverbWet: 0.4 + (harmonicGain * 2),
      delayTime: maxDelay,
      delayFeedback: maxFeedback,
      lfoRate: sp.lfoRate,
      lfoDepth: sp.lfoDepth,
      filterFreq: tp.filterFreq,
      filterType: tp.filterType,
      noiseMix: maxNoise,
      envelope: {
        attack: 0.3 + (duration * 0.05),
        decay: 0.5,
        sustain: 0.6,
        release: duration * 0.4,
      },
    },
  };
}
