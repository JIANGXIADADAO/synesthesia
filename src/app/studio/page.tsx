"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ============================================================
// 常量
// ============================================================

const COLORS = [
  { slug: "red", name: "红色", hex: "#E53935" },
  { slug: "orange", name: "橙色", hex: "#FB8C00" },
  { slug: "yellow", name: "黄色", hex: "#FDD835" },
  { slug: "green", name: "绿色", hex: "#43A047" },
  { slug: "blue", name: "蓝色", hex: "#1E88E5" },
  { slug: "purple", name: "紫色", hex: "#8E24AA" },
  { slug: "black", name: "黑色", hex: "#212121" },
  { slug: "white", name: "白色", hex: "#FAFAFA" },
];

const NOTE_ROWS: { label: string; notes: string[] }[] = [
  { label: "低音", notes: ["C2","D2","E2","F2","G2","A2","B2"] },
  { label: "中音", notes: ["C3","D3","E3","F3","G3","A3","B3"] },
  { label: "高音", notes: ["C4","D4","E4","F4","G4","A4","B4"] },
  { label: "极高", notes: ["C5","D5","E5","F5","G5","A5","B5"] },
];

const TEXTURE_PRESETS: Record<string, { synthType: string; filterType: string; filterFreq: number; attack: number; decay: number; sustain: number; release: number; desc: string }> = {
  "温暖厚实": { synthType: "AMSynth", filterType: "lowpass", filterFreq: 400, attack: 0.4, decay: 0.3, sustain: 0.7, release: 2, desc: "圆润柔和的暖色调，像大提琴" },
  "清澈明亮": { synthType: "FMSynth", filterType: "highpass", filterFreq: 200, attack: 0.05, decay: 0.2, sustain: 0.3, release: 1, desc: "清脆透亮，像风铃或短笛" },
  "金属锋利": { synthType: "Synth", filterType: "bandpass", filterFreq: 1000, attack: 0.01, decay: 0.1, sustain: 0.4, release: 0.5, desc: "有攻击性的金属质感" },
  "柔软蓬松": { synthType: "Synth", filterType: "lowpass", filterFreq: 250, attack: 0.6, decay: 0.4, sustain: 0.5, release: 3, desc: "绵绵软软，像踩在云上" },
};

const GRAIN_PRESETS: Record<string, { noiseMix: number; desc: string }> = {
  "纯净": { noiseMix: 0, desc: "干干净净，只有音本身" },
  "沙沙的": { noiseMix: 0.2, desc: "像风吹过树叶的沙沙声" },
  "颗粒感": { noiseMix: 0.4, desc: "明显粗糙的颗粒质感" },
  "雾气感": { noiseMix: 0.12, desc: "朦朦胧胧，像隔了一层雾" },
};

const VIBE_PRESETS: Record<string, { pattern: number[]; desc: string }> = {
  "沉重": { pattern: [500,150,600,200,400,150], desc: "缓慢沉重的压力感" },
  "轻盈": { pattern: [15,40,10,30,10,40], desc: "若有若无的轻触" },
  "急速": { pattern: [30,15,25,10,20,15], desc: "急促密集的快速脉冲" },
  "舒缓": { pattern: [300,200,400,250,500], desc: "缓慢起伏的波动" },
  "摩擦感": { pattern: [40,10,30,10,35,15,25,10], desc: "粗糙表面的摩擦触感" },
  "弹跳感": { pattern: [60,80,50,150,50,250,50], desc: "活泼有弹性的跳跃" },
};

interface SoundParams {
  synthType: string;
  notes: string[];
  duration: number;
  // 直觉控件
  texture: string;     // 质感预设名
  space: number;       // 0-100
  breath: number;      // 0-100
  grain: string;       // 纹理预设名
  // 高级参数（由直觉控件自动计算）
  filterType: string;
  filterFreq: number;
  reverbDecay: number;
  reverbWet: number;
  delayTime: number;
  delayFeedback: number;
  lfoRate: number;
  lfoDepth: number;
  noiseMix: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

interface VibeParams {
  pattern: number[];
  label: string;
  preset: string;
}

// ============================================================
// 工具
// ============================================================

function makeDefaultSound(): SoundParams { return applyIntuition({ ...baseSound() }); }
function baseSound(): SoundParams {
  return {
    synthType: "AMSynth", notes: ["A2","E3"], duration: 4,
    texture: "温暖厚实", space: 50, breath: 30, grain: "纯净",
    filterType: "lowpass", filterFreq: 400, reverbDecay: 4, reverbWet: 0.4,
    delayTime: 0.3, delayFeedback: 0.3, lfoRate: 0.5, lfoDepth: 200, noiseMix: 0,
    attack: 0.4, decay: 0.3, sustain: 0.7, release: 2,
  };
}

function applyIntuition(s: SoundParams): SoundParams {
  // 质感 → synth + filter + ADSR
  const tex = TEXTURE_PRESETS[s.texture] || TEXTURE_PRESETS["温暖厚实"];
  s.synthType = tex.synthType;
  s.filterType = tex.filterType;
  s.filterFreq = tex.filterFreq;
  s.attack = tex.attack;
  s.decay = tex.decay;
  s.sustain = tex.sustain;
  s.release = tex.release;

  // 空间 0-100
  s.reverbDecay = 0.5 + (s.space / 100) * 9.5;
  s.reverbWet = 0.1 + (s.space / 100) * 0.6;
  s.delayTime = (s.space / 100) * 0.8;
  s.delayFeedback = (s.space / 100) * 0.5;

  // 呼吸 0-100
  s.lfoRate = (s.breath / 100) * 4;
  s.lfoDepth = (s.breath / 100) * 500;

  // 纹理
  const gr = GRAIN_PRESETS[s.grain] || GRAIN_PRESETS["纯净"];
  s.noiseMix = gr.noiseMix;

  return s;
}

function loadPreset(color: string): { sound: SoundParams; vibe: VibeParams } | null {
  if (typeof window === "undefined") return null;
  try { const raw = localStorage.getItem(`syn-studio-${color}`); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function savePreset(color: string, sound: SoundParams, vibe: VibeParams) {
  localStorage.setItem(`syn-studio-${color}`, JSON.stringify({ sound: applyIntuition(sound), vibe }));
}
function exportAll() {
  const all: Record<string, { sound: SoundParams; vibe: VibeParams }> = {};
  for (const c of COLORS) {
    const p = loadPreset(c.slug);
    if (p) all[c.slug] = { sound: applyIntuition(p.sound), vibe: p.vibe };
  }
  return JSON.stringify(all, null, 2);
}

// ============================================================
// 音符预览
// ============================================================

let _noteTone: any = null;
async function previewNote(note: string) {
  if (!_noteTone) { _noteTone = await import("tone"); }
  const Tone = _noteTone;
  await Tone.start();
  const synth = new Tone.Synth({ envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.8 }, volume: -8 }).toDestination();
  synth.triggerAttackRelease(note, "8n");
  setTimeout(() => synth.dispose(), 1500);
}

// ============================================================
// 组件：音符选择器
// ============================================================

function NotePicker({ notes, onChange }: { notes: string[]; onChange: (n: string[]) => void }) {
  const add = (n: string) => { if (!notes.includes(n)) onChange([...notes, n]); };
  const remove = (n: string) => onChange(notes.filter((x) => x !== n));

  return (
    <div className="mb-4">
      <label className="text-xs text-gray-400 mb-1 block">和弦 ({notes.length} 个音)</label>
      {/* 已选音符 */}
      <div className="flex flex-wrap gap-1 mb-2">
        {notes.length === 0 && <span className="text-xs text-gray-600">点击下方音符添加</span>}
        {notes.map((n) => (
          <span key={n} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            {n}
            <button onClick={() => remove(n)} className="text-gray-500 hover:text-red-400 leading-none">×</button>
          </span>
        ))}
      </div>

      {/* 音符网格（带试听按钮） */}
      <div className="space-y-1">
        {NOTE_ROWS.map((row) => (
          <div key={row.label} className="flex items-center gap-1">
            <span className="text-[10px] text-gray-600 w-8 shrink-0">{row.label}</span>
            {row.notes.map((n) => {
              const selected = notes.includes(n);
              return (
                <button
                  key={n}
                  onClick={() => selected ? remove(n) : add(n)}
                  onContextMenu={(e) => { e.preventDefault(); previewNote(n); }}
                  title={`点击: ${selected ? "移除" : "添加"} / 长按: 试听`}
                  className={`w-8 h-8 md:w-9 md:h-7 text-[10px] rounded font-mono transition-all ${
                    selected
                      ? "bg-cyan-500 text-white ring-1 ring-cyan-400"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
                  }`}
                >{n.replace(/\d/,"")}</button>
              );
            })}
          </div>
        ))}
      </div>
      <p className="text-[10px] text-gray-600 mt-1">点击添加/移除 · 长按试听</p>
    </div>
  );
}

// ============================================================
// 组件：直觉式参数面板
// ============================================================

function IntuitionPanel({ sound, onChange }: { sound: SoundParams; onChange: (s: SoundParams) => void }) {
  const [advanced, setAdvanced] = useState(false);

  const update = (partial: Partial<SoundParams>) => {
    onChange(applyIntuition({ ...sound, ...partial }));
  };

  const texNames = Object.keys(TEXTURE_PRESETS);
  const grainNames = Object.keys(GRAIN_PRESETS);

  return (
    <div className="space-y-5">
      {/* 质感 */}
      <div>
        <label className="text-xs text-gray-400 block mb-1.5">🎵 质感 — 声音的性格</label>
        <div className="grid grid-cols-2 gap-1.5">
          {texNames.map((t) => (
            <button key={t} onClick={() => update({ texture: t })}
              className={`text-left px-3 py-2 rounded-lg text-xs border transition-all ${
                sound.texture === t
                  ? "bg-cyan-500/10 border-cyan-400/40 text-cyan-200"
                  : "bg-gray-800/50 border-gray-700/30 text-gray-400 hover:border-gray-500"
              }`}>
              <div className="font-medium">{t}</div>
              <div className="text-[10px] opacity-60 mt-0.5">{TEXTURE_PRESETS[t].desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 空间 */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">🌌 空间 — 声音在哪里</span>
          <span className="text-cyan-400">{sound.space <= 20 ? "近在耳边" : sound.space <= 50 ? "房间内" : sound.space <= 80 ? "大厅里" : "空旷深远"}</span>
        </div>
        <input type="range" min={0} max={100} value={sound.space}
          onChange={(e) => update({ space: parseInt(e.target.value) })}
          className="w-full h-1.5 rounded-full bg-gray-700 accent-cyan-400 cursor-pointer" />
        <div className="flex justify-between text-[10px] text-gray-600 mt-0.5"><span>耳边</span><span>深远</span></div>
      </div>

      {/* 呼吸 */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">🫁 呼吸 — 声音的波动</span>
          <span className="text-cyan-400">{sound.breath <= 15 ? "静止" : sound.breath <= 40 ? "微微起伏" : sound.breath <= 70 ? "明显波动" : "剧烈振荡"}</span>
        </div>
        <input type="range" min={0} max={100} value={sound.breath}
          onChange={(e) => update({ breath: parseInt(e.target.value) })}
          className="w-full h-1.5 rounded-full bg-gray-700 accent-cyan-400 cursor-pointer" />
        <div className="flex justify-between text-[10px] text-gray-600 mt-0.5"><span>静止</span><span>波动</span></div>
      </div>

      {/* 纹理 */}
      <div>
        <label className="text-xs text-gray-400 block mb-1.5">🪨 纹理 — 声音的表面质感</label>
        <div className="grid grid-cols-2 gap-1.5">
          {grainNames.map((g) => (
            <button key={g} onClick={() => update({ grain: g })}
              className={`text-left px-3 py-2 rounded-lg text-xs border transition-all ${
                sound.grain === g
                  ? "bg-purple-500/10 border-purple-400/40 text-purple-200"
                  : "bg-gray-800/50 border-gray-700/30 text-gray-400 hover:border-gray-500"
              }`}>
              <div className="font-medium">{g}</div>
              <div className="text-[10px] opacity-60 mt-0.5">{GRAIN_PRESETS[g].desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 时长 */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">⏱ 持续时长</span>
          <span className="text-cyan-400">{sound.duration.toFixed(1)} 秒</span>
        </div>
        <input type="range" min={1} max={15} step={0.5} value={sound.duration}
          onChange={(e) => update({ duration: parseFloat(e.target.value) })}
          className="w-full h-1.5 rounded-full bg-gray-700 accent-cyan-400 cursor-pointer" />
      </div>

      {/* 高级折叠 */}
      <div className="border-t border-gray-800 pt-3">
        <button onClick={() => setAdvanced(!advanced)}
          className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1">
          {advanced ? "▼" : "▶"} 高级参数
        </button>
        {advanced && (
          <div className="mt-2 space-y-2 p-3 rounded-lg bg-gray-900/50">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-500">合成器</label>
                <select value={sound.synthType} onChange={(e) => update({ synthType: e.target.value })}
                  className="w-full mt-0.5 px-2 py-1 text-xs rounded bg-gray-800 border border-gray-700 text-gray-300">
                  {["AMSynth","FMSynth","Synth","PluckSynth"].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-500">滤波器</label>
                <select value={sound.filterType} onChange={(e) => update({ filterType: e.target.value })}
                  className="w-full mt-0.5 px-2 py-1 text-xs rounded bg-gray-800 border border-gray-700 text-gray-300">
                  {["lowpass","highpass","bandpass","notch"].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <Slider label="滤波频率" value={sound.filterFreq} min={50} max={4000} step={10} unit="Hz" onChange={(v) => update({ filterFreq: v })} />
            <div className="grid grid-cols-4 gap-1">
              <MiniSlider label="Attack" value={sound.attack} min={0.01} max={3} step={0.01} onChange={(v) => update({ attack: v })} />
              <MiniSlider label="Decay" value={sound.decay} min={0.01} max={2} step={0.01} onChange={(v) => update({ decay: v })} />
              <MiniSlider label="Sustain" value={sound.sustain} min={0} max={1} step={0.01} onChange={(v) => update({ sustain: v })} />
              <MiniSlider label="Release" value={sound.release} min={0.1} max={10} step={0.1} onChange={(v) => update({ release: v })} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Slider({ label, value, min, max, step = 0.01, unit = "", onChange }: { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void }) {
  return (
    <div className="mb-1">
      <div className="flex justify-between text-[10px] text-gray-500"><span>{label}</span><span className="text-gray-400">{value}{unit}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 rounded bg-gray-700 accent-cyan-400 cursor-pointer" />
    </div>
  );
}

function MiniSlider({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="text-[9px] text-gray-600">{label}</div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 rounded bg-gray-700 accent-cyan-400 cursor-pointer" />
      <div className="text-[9px] text-gray-500 text-right">{value}</div>
    </div>
  );
}

// ============================================================
// 振动编辑器
// ============================================================

function VibeEditor({ vibe, onChange }: { vibe: VibeParams; onChange: (v: VibeParams) => void }) {
  const totalMs = vibe.pattern.reduce((a, b) => a + b, 0);

  const setPreset = (name: string) => {
    const p = VIBE_PRESETS[name];
    if (p) onChange({ ...vibe, pattern: [...p.pattern], preset: name, label: name + "的触感" });
  };

  const cyclePreset = (name: string, cycles: number) => {
    const p = VIBE_PRESETS[name];
    if (!p) return;
    const pat: number[] = [];
    for (let i = 0; i < cycles; i++) pat.push(...p.pattern);
    onChange({ ...vibe, pattern: pat, preset: name, label: `${name}的触感 ×${cycles}` });
  };

  return (
    <div>
      {/* 触感预设 */}
      <div className="mb-3">
        <label className="text-xs text-gray-400 block mb-1">📳 触感预设</label>
        <div className="grid grid-cols-2 gap-1">
          {Object.entries(VIBE_PRESETS).map(([name, preset]) => (
            <button key={name} onClick={() => cyclePreset(name, 4)}
              className={`text-left px-2 py-1.5 rounded text-xs border transition-all ${
                vibe.preset === name
                  ? "bg-cyan-500/10 border-cyan-400/40 text-cyan-200"
                  : "bg-gray-800/50 border-gray-700/30 text-gray-400 hover:border-gray-500"
              }`}>
              <div className="font-medium">{name}</div>
              <div className="text-[10px] opacity-60">{preset.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 可视化条形图 */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-gray-500">总长 {(totalMs / 1000).toFixed(1)}s</span>
      </div>
      <div className="flex items-end gap-px h-10 mb-2 overflow-x-auto rounded bg-gray-900/50 p-1">
        {vibe.pattern.map((v, i) => {
          const isOn = i % 2 === 0;
          const height = Math.max(3, (v / Math.max(...vibe.pattern, 1)) * 100);
          return (
            <div key={i} title={`${isOn?"振":"停"} ${v}ms`}
              style={{ height: `${height}%`, width: `${Math.max(3, v / 15)}px` }}
              className={`rounded-sm flex-shrink-0 ${isOn ? "bg-cyan-400" : "bg-gray-700"}`} />
          );
        })}
      </div>

      {/* 手动微调 */}
      <details className="mt-2">
        <summary className="text-[10px] text-gray-500 cursor-pointer hover:text-gray-300">手动微调</summary>
        <div className="mt-1 flex flex-wrap gap-1">
          {vibe.pattern.map((v, i) => (
            <div key={i} className="flex items-center gap-0.5">
              <span className="text-[9px] text-gray-600">{i % 2 === 0 ? "振" : "停"}</span>
              <input type="number" min={5} max={2000} value={v}
                onChange={(e) => { const p = [...vibe.pattern]; p[i] = Math.max(5, parseInt(e.target.value) || 50); onChange({ ...vibe, pattern: p, preset: "自定义" }); }}
                className="w-11 px-1 py-0.5 text-[10px] rounded bg-gray-800 border border-gray-700 text-gray-200 text-center" />
            </div>
          ))}
        </div>
      </details>

      {/* 标签 */}
      <div className="mt-2">
        <input type="text" value={vibe.label}
          onChange={(e) => onChange({ ...vibe, label: e.target.value })}
          className="w-full px-2 py-1 text-xs rounded bg-gray-800 border border-gray-700 text-gray-200"
          placeholder="触感标签" />
      </div>
    </div>
  );
}

// ============================================================
// 主页面
// ============================================================

export default function StudioPage() {
  const [activeColor, setActiveColor] = useState(COLORS[0].slug);
  const [sound, setSound] = useState<SoundParams>(makeDefaultSound);
  const [vibe, setVibe] = useState<VibeParams>({ pattern: [100,50,100,50,200,100,300], label: "", preset: "" });
  const [playing, setPlaying] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [mounted, setMounted] = useState(false);
  const [mobileTab, setMobileTab] = useState<"sound" | "vibe">("sound");
  const toneRef = useRef<any>(null);

  useEffect(() => { setMounted(true); }, []);

  const colorInfo = COLORS.find((c) => c.slug === activeColor)!;

  // 加载预设
  useEffect(() => {
    const preset = loadPreset(activeColor);
    if (preset) {
      setSound(applyIntuition(preset.sound));
      setVibe(preset.vibe);
    } else {
      fetch(`/api/colors/${activeColor}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.data?.sensory) {
            const s = d.data.sensory;
            const ns = baseSound();
            if (s.soundscape) {
              const sc = s.soundscape;
              ns.synthType = sc.synthType || "AMSynth";
              ns.notes = sc.notes || ["A2","E3"];
              ns.duration = sc.duration || 4;
              ns.reverbDecay = sc.reverbDecay || 4;
              ns.reverbWet = sc.reverbWet || 0.4;
              ns.delayTime = sc.delayTime || 0.3;
              ns.delayFeedback = sc.delayFeedback || 0.3;
              ns.lfoRate = sc.lfoRate || 0.5;
              ns.lfoDepth = sc.lfoDepth || 200;
              ns.filterFreq = sc.filterFreq || 400;
              ns.filterType = sc.filterType || "lowpass";
              ns.noiseMix = sc.noiseMix || 0;
              ns.attack = sc.envelope?.attack || 0.4;
              ns.decay = sc.envelope?.decay || 0.3;
              ns.sustain = sc.envelope?.sustain || 0.7;
              ns.release = sc.envelope?.release || 2;
              // 反推直觉值
              ns.space = Math.round((ns.reverbWet - 0.1) / 0.6 * 100);
              ns.breath = Math.round((ns.lfoRate / 4) * 100);
              ns.texture = "温暖厚实";
              ns.grain = ns.noiseMix > 0.3 ? "颗粒感" : ns.noiseMix > 0.1 ? "沙沙的" : ns.noiseMix > 0 ? "雾气感" : "纯净";
            }
            if (s.vibration) { setVibe({ ...s.vibration, preset: "" }); }
            setSound(applyIntuition(ns));
          }
        }).catch(() => {});
    }
  }, [activeColor]);

  // 播放预览
  const play = useCallback(async () => {
    if (playing) return;
    setPlaying(true);
    try {
      if (!toneRef.current) toneRef.current = await import("tone");
      const Tone = toneRef.current;
      await Tone.start();

      const final = applyIntuition({ ...sound });
      const vol = new Tone.Volume(-6).toDestination();
      const reverb = new Tone.Reverb({ decay: final.reverbDecay, wet: final.reverbWet }).connect(vol);
      const delay = new Tone.FeedbackDelay({ delayTime: final.delayTime, feedback: final.delayFeedback, wet: final.delayTime > 0.1 ? 0.25 : 0 }).connect(reverb);
      const filter = new Tone.Filter({ frequency: final.filterFreq, type: final.filterType as any, rolloff: -12 }).connect(delay);
      if (final.lfoRate > 0) {
        const lfo = new Tone.LFO({ frequency: final.lfoRate, min: Math.max(50, final.filterFreq - final.lfoDepth), max: Math.min(4000, final.filterFreq + final.lfoDepth) }).connect(filter.frequency);
        lfo.start();
      }
      const SynthClass = final.synthType === "AMSynth" ? Tone.AMSynth : final.synthType === "FMSynth" ? Tone.FMSynth : final.synthType === "PluckSynth" ? Tone.PluckSynth : Tone.Synth;
      const synth = new Tone.PolySynth(SynthClass, { maxPolyphony: 6, envelope: { attack: final.attack, decay: final.decay, sustain: final.sustain, release: final.release }, volume: -4 }).connect(filter);
      if (final.noiseMix > 0) { const n = new Tone.Noise("pink").start(); n.connect(new Tone.Gain(final.noiseMix * 0.15).connect(delay)); }
      if (navigator.vibrate) navigator.vibrate(vibe.pattern);
      const now = Tone.now();
      final.notes.forEach((n, i) => synth.triggerAttackRelease(n, final.duration, now + i * 0.08));
      setTimeout(() => { synth.dispose(); filter.dispose(); delay.dispose(); reverb.dispose(); vol.dispose(); setPlaying(false); }, (final.duration + 2) * 1000);
    } catch (e) { console.error(e); setPlaying(false); }
  }, [sound, vibe, playing]);

  const save = () => { savePreset(activeColor, applyIntuition(sound), vibe); setSavedMsg("已保存"); setTimeout(() => setSavedMsg(""), 1500); };
  const exportJson = () => { const json = exportAll(); const blob = new Blob([json], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "synesthesia-presets.json"; a.click(); URL.revokeObjectURL(a.href); setSavedMsg("JSON 已下载"); setTimeout(() => setSavedMsg(""), 1500); };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200">
      <header className="border-b border-gray-800 px-2 md:px-4 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 shrink-0">
          <h1 className="text-sm md:text-base font-bold text-cyan-400">🎛 Studio</h1>
          {savedMsg && <span className="text-xs text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded hidden md:inline">{savedMsg}</span>}
        </div>
        <div className="flex items-center gap-1">
          {savedMsg && <span className="text-[10px] text-green-400 md:hidden">{savedMsg}</span>}
          <button onClick={save} className="px-2 md:px-3 py-1 text-[11px] md:text-xs rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium whitespace-nowrap">💾</button>
          <button onClick={exportJson} className="px-2 md:px-3 py-1 text-[11px] md:text-xs rounded bg-purple-600 hover:bg-purple-500 text-white font-medium whitespace-nowrap">📥</button>
          <a href="/" className="px-2 py-1 text-[11px] md:text-xs rounded bg-gray-800 hover:bg-gray-700 text-gray-400 whitespace-nowrap">←</a>
        </div>
      </header>

      {/* 颜色选择器：手机横向滚动，桌面左侧竖排 */}
      <div className="md:flex">
        <aside className="
          flex flex-row md:flex-col items-center gap-1.5 py-2 px-2
          border-b md:border-b-0 md:border-r border-gray-800 bg-gray-900
          overflow-x-auto md:overflow-y-auto shrink-0
          md:w-14
        ">
          {COLORS.map((c) => (
            <button key={c.slug} onClick={() => setActiveColor(c.slug)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all relative shrink-0"
              style={{ backgroundColor: c.hex, boxShadow: activeColor === c.slug ? `0 0 10px ${c.hex}80` : "none", opacity: activeColor === c.slug ? 1 : 0.6 }}>
              <span className="mix-blend-difference text-white">{c.name[0]}</span>
              {mounted && loadPreset(c.slug) && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-green-400" />}
            </button>
          ))}
        </aside>

        {/* 手机端：音景/振动 Tab 切换 */}
        <div className="md:hidden flex border-b border-gray-800 bg-gray-900/80">
          <button onClick={() => setMobileTab("sound")}
            className={`flex-1 py-2 text-xs font-medium text-center transition-colors ${mobileTab === "sound" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-gray-500"}`}>
            🎵 音景
          </button>
          <button onClick={() => setMobileTab("vibe")}
            className={`flex-1 py-2 text-xs font-medium text-center transition-colors ${mobileTab === "vibe" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-gray-500"}`}>
            📳 振动
          </button>
        </div>

        {/* 编辑区：桌面并排，手机按 Tab 切换 */}
        <div className="flex-1 flex flex-col md:flex-row md:h-[calc(100vh-97px)] overflow-hidden">
          <main className={`flex-1 overflow-y-auto p-3 md:p-4 ${mobileTab === "vibe" ? "hidden md:block" : ""}`}>
            <div className="max-w-md mx-auto">
              <h2 className="text-lg font-bold mb-3" style={{ color: colorInfo.hex }}>{colorInfo.name}</h2>
              <NotePicker notes={sound.notes} onChange={(notes) => setSound(applyIntuition({ ...sound, notes }))} />
              <IntuitionPanel sound={sound} onChange={setSound} />
              <div className="h-16 md:h-4" />
            </div>
          </main>

          <aside className={`w-full md:w-72 border-t md:border-t-0 md:border-l border-gray-800 overflow-y-auto p-3 bg-gray-900/50 shrink-0 ${mobileTab === "sound" ? "hidden md:block" : ""}`}>
            <VibeEditor vibe={vibe} onChange={setVibe} />
            <div className="h-16 md:h-4" />
          </aside>
        </div>
      </div>

      {/* 底部播放：桌面跟在颜色栏后，手机全宽 + safe-area */}
      <div className="fixed bottom-0 left-0 md:left-14 right-0 border-t border-gray-800 bg-gray-900/95 backdrop-blur px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-center gap-3">
        <button onClick={play} disabled={playing}
          className={`px-10 py-2.5 rounded-full text-base font-bold transition-all flex-1 md:flex-none ${
            playing ? "bg-gray-700 text-gray-400 animate-pulse cursor-wait" : "text-white hover:scale-105 active:scale-95 shadow-lg"
          }`}
          style={{ backgroundColor: playing ? undefined : colorInfo.hex }}>
          {playing ? "🔊 播放中..." : "▶ 预览"}
        </button>
      </div>
    </div>
  );
}
