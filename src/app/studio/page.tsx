"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ============================================================
// Tone.js preload
// ============================================================
let toneModule: any = null;
let toneLoadPromise: Promise<any> | null = null;
let toneReady = false;

function preloadTone() {
  if (!toneLoadPromise) {
    toneLoadPromise = import("tone").then((m) => {
      toneModule = m;
      return m;
    });
  }
  return toneLoadPromise;
}

// ============================================================
// Constants
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
  texture: string;
  space: number;
  breath: number;
  grain: string;
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
// Utilities
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
  const tex = TEXTURE_PRESETS[s.texture] || TEXTURE_PRESETS["温暖厚实"];
  s.synthType = tex.synthType;
  s.filterType = tex.filterType;
  s.filterFreq = tex.filterFreq;
  s.attack = tex.attack;
  s.decay = tex.decay;
  s.sustain = tex.sustain;
  s.release = tex.release;

  s.reverbDecay = 0.5 + (s.space / 100) * 9.5;
  s.reverbWet = 0.1 + (s.space / 100) * 0.6;
  s.delayTime = (s.space / 100) * 0.8;
  s.delayFeedback = (s.space / 100) * 0.5;

  s.lfoRate = (s.breath / 100) * 4;
  s.lfoDepth = (s.breath / 100) * 500;

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
// Note preview
// ============================================================

async function previewNote(note: string) {
  if (!toneModule) await preloadTone();
  const Tone = toneModule;
  if (!toneReady) { await Tone.start(); toneReady = true; }
  const synth = new Tone.Synth({ envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.8 }, volume: -8 }).toDestination();
  synth.triggerAttackRelease(note, "8n");
  setTimeout(() => synth.dispose(), 1500);
}

// ============================================================
// Note Picker
// ============================================================

function NotePicker({ notes, onChange }: { notes: string[]; onChange: (n: string[]) => void }) {
  const add = (n: string) => { if (!notes.includes(n)) onChange([...notes, n]); };
  const remove = (n: string) => onChange(notes.filter((x) => x !== n));

  return (
    <div className="mb-5">
      <label className="text-xs text-warm-secondary mb-1.5 block font-sans">和弦 ({notes.length} 个音)</label>
      <div className="flex flex-wrap gap-1 mb-2">
        {notes.length === 0 && <span className="text-xs text-warm-secondary/40">点击下方音符添加</span>}
        {notes.map((n) => (
          <span key={n} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-md bg-coral/10 text-coral border border-coral/20 font-mono">
            {n}
            <button onClick={() => remove(n)} className="text-warm-secondary/50 hover:text-coral leading-none">&times;</button>
          </span>
        ))}
      </div>

      <div className="space-y-1">
        {NOTE_ROWS.map((row) => (
          <div key={row.label} className="flex items-center gap-1">
            <span className="text-[10px] text-warm-secondary/40 w-8 shrink-0 font-sans">{row.label}</span>
            {row.notes.map((n) => {
              const selected = notes.includes(n);
              return (
                <button
                  key={n}
                  onClick={() => selected ? remove(n) : add(n)}
                  onContextMenu={(e) => { e.preventDefault(); previewNote(n); }}
                  title={`点击: ${selected ? "移除" : "添加"} / 右键: 试听`}
                  className={`w-8 h-8 md:w-9 md:h-7 text-[10px] rounded font-mono transition-all duration-200 ${
                    selected
                      ? "bg-warm-text text-warm-bg"
                      : "bg-warm-surface text-warm-secondary/60 hover:bg-warm-border hover:text-warm-text"
                  }`}
                >{n.replace(/\d/,"")}</button>
              );
            })}
          </div>
        ))}
      </div>
      <p className="text-[10px] text-warm-secondary/40 mt-1.5 font-sans">点击添加/移除 · 右键试听</p>
    </div>
  );
}

// ============================================================
// Intuition Panel
// ============================================================

function IntuitionPanel({ sound, onChange }: { sound: SoundParams; onChange: (s: SoundParams) => void }) {
  const [advanced, setAdvanced] = useState(false);

  const update = (partial: Partial<SoundParams>) => {
    onChange(applyIntuition({ ...sound, ...partial }));
  };

  const texNames = Object.keys(TEXTURE_PRESETS);
  const grainNames = Object.keys(GRAIN_PRESETS);

  return (
    <div className="space-y-6">
      {/* Texture */}
      <div>
        <label className="text-xs text-warm-secondary block mb-2 font-sans">质感 — 声音的性格</label>
        <div className="grid grid-cols-2 gap-1.5">
          {texNames.map((t) => (
            <button key={t} onClick={() => update({ texture: t })}
              className={`text-left px-3 py-2.5 rounded-lg text-xs border transition-all duration-200 ${
                sound.texture === t
                  ? "bg-coral/5 border-coral/30 text-coral"
                  : "bg-warm-surface/50 border-warm-border text-warm-secondary hover:border-warm-border-strong"
              }`}>
              <div className="font-medium font-serif text-sm">{t}</div>
              <div className="text-[10px] opacity-60 mt-0.5 font-sans">{TEXTURE_PRESETS[t].desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Space */}
      <div>
        <div className="flex justify-between text-xs mb-1.5 font-sans">
          <span className="text-warm-secondary">空间 — 声音在哪里</span>
          <span className="text-coral">{sound.space <= 20 ? "近在耳边" : sound.space <= 50 ? "房间内" : sound.space <= 80 ? "大厅里" : "空旷深远"}</span>
        </div>
        <input type="range" min={0} max={100} value={sound.space}
          onChange={(e) => update({ space: parseInt(e.target.value) })}
          className="w-full h-1.5 rounded-full bg-warm-border accent-coral cursor-pointer" />
        <div className="flex justify-between text-[10px] text-warm-secondary/40 mt-0.5 font-sans"><span>耳边</span><span>深远</span></div>
      </div>

      {/* Breath */}
      <div>
        <div className="flex justify-between text-xs mb-1.5 font-sans">
          <span className="text-warm-secondary">呼吸 — 声音的波动</span>
          <span className="text-coral">{sound.breath <= 15 ? "静止" : sound.breath <= 40 ? "微微起伏" : sound.breath <= 70 ? "明显波动" : "剧烈振荡"}</span>
        </div>
        <input type="range" min={0} max={100} value={sound.breath}
          onChange={(e) => update({ breath: parseInt(e.target.value) })}
          className="w-full h-1.5 rounded-full bg-warm-border accent-coral cursor-pointer" />
        <div className="flex justify-between text-[10px] text-warm-secondary/40 mt-0.5 font-sans"><span>静止</span><span>波动</span></div>
      </div>

      {/* Grain */}
      <div>
        <label className="text-xs text-warm-secondary block mb-2 font-sans">纹理 — 声音的表面质感</label>
        <div className="grid grid-cols-2 gap-1.5">
          {grainNames.map((g) => (
            <button key={g} onClick={() => update({ grain: g })}
              className={`text-left px-3 py-2.5 rounded-lg text-xs border transition-all duration-200 ${
                sound.grain === g
                  ? "bg-coral/5 border-coral/30 text-coral"
                  : "bg-warm-surface/50 border-warm-border text-warm-secondary hover:border-warm-border-strong"
              }`}>
              <div className="font-medium font-serif text-sm">{g}</div>
              <div className="text-[10px] opacity-60 mt-0.5 font-sans">{GRAIN_PRESETS[g].desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Duration */}
      <div>
        <div className="flex justify-between text-xs mb-1.5 font-sans">
          <span className="text-warm-secondary">持续时长</span>
          <span className="text-coral">{sound.duration.toFixed(1)} 秒</span>
        </div>
        <input type="range" min={1} max={15} step={0.5} value={sound.duration}
          onChange={(e) => update({ duration: parseFloat(e.target.value) })}
          className="w-full h-1.5 rounded-full bg-warm-border accent-coral cursor-pointer" />
      </div>

      {/* Advanced */}
      <div className="border-t border-warm-border pt-4">
        <button onClick={() => setAdvanced(!advanced)}
          className="text-xs text-warm-secondary/50 hover:text-warm-secondary font-sans flex items-center gap-1 transition-colors duration-200">
          {advanced ? "收起" : "展开"} 高级参数
        </button>
        {advanced && (
          <div className="mt-3 space-y-3 p-4 rounded-lg bg-warm-surface/50">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-warm-secondary/50 font-sans">合成器</label>
                <select value={sound.synthType} onChange={(e) => update({ synthType: e.target.value })}
                  className="w-full mt-0.5 px-2 py-1.5 text-xs rounded-md bg-warm-bg border border-warm-border text-warm-text font-sans focus:outline-none focus:border-coral/30">
                  {["AMSynth","FMSynth","Synth","PluckSynth"].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-warm-secondary/50 font-sans">滤波器</label>
                <select value={sound.filterType} onChange={(e) => update({ filterType: e.target.value })}
                  className="w-full mt-0.5 px-2 py-1.5 text-xs rounded-md bg-warm-bg border border-warm-border text-warm-text font-sans focus:outline-none focus:border-coral/30">
                  {["lowpass","highpass","bandpass","notch"].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <Slider label="滤波频率" value={sound.filterFreq} min={50} max={4000} step={10} unit="Hz" onChange={(v) => update({ filterFreq: v })} />
            <div className="grid grid-cols-4 gap-2">
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
    <div>
      <div className="flex justify-between text-[10px] text-warm-secondary/50 font-sans"><span>{label}</span><span className="text-warm-secondary">{value}{unit}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 rounded bg-warm-border accent-coral cursor-pointer" />
    </div>
  );
}

function MiniSlider({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="text-[9px] text-warm-secondary/40 font-sans">{label}</div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 rounded bg-warm-border accent-coral cursor-pointer" />
      <div className="text-[9px] text-warm-secondary/50 text-right font-mono">{value}</div>
    </div>
  );
}

// ============================================================
// Vibe Editor
// ============================================================

function VibeEditor({ vibe, onChange }: { vibe: VibeParams; onChange: (v: VibeParams) => void }) {
  const totalMs = vibe.pattern.reduce((a, b) => a + b, 0);

  const cyclePreset = (name: string, cycles: number) => {
    const p = VIBE_PRESETS[name];
    if (!p) return;
    const pat: number[] = [];
    for (let i = 0; i < cycles; i++) pat.push(...p.pattern);
    onChange({ ...vibe, pattern: pat, preset: name, label: `${name}的触感 x${cycles}` });
  };

  return (
    <div>
      {/* Vibe presets */}
      <div className="mb-4">
        <label className="text-xs text-warm-secondary block mb-2 font-sans">触感预设</label>
        <div className="grid grid-cols-2 gap-1">
          {Object.entries(VIBE_PRESETS).map(([name, preset]) => (
            <button key={name} onClick={() => cyclePreset(name, 4)}
              className={`text-left px-3 py-2 rounded-lg text-xs border transition-all duration-200 ${
                vibe.preset === name
                  ? "bg-coral/5 border-coral/30 text-coral"
                  : "bg-warm-surface/50 border-warm-border text-warm-secondary hover:border-warm-border-strong"
              }`}>
              <div className="font-medium font-serif text-sm">{name}</div>
              <div className="text-[10px] opacity-60 mt-0.5 font-sans">{preset.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Visualizer */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-warm-secondary/50 font-sans">总长 {(totalMs / 1000).toFixed(1)}s</span>
      </div>
      <div className="flex items-end gap-px h-10 mb-3 overflow-x-auto rounded bg-warm-surface/50 p-1">
        {vibe.pattern.map((v, i) => {
          const isOn = i % 2 === 0;
          const height = Math.max(3, (v / Math.max(...vibe.pattern, 1)) * 100);
          return (
            <div key={i} title={`${isOn?"振":"停"} ${v}ms`}
              style={{ height: `${height}%`, width: `${Math.max(3, v / 15)}px` }}
              className={`rounded-sm flex-shrink-0 ${isOn ? "bg-coral" : "bg-warm-border"}`} />
          );
        })}
      </div>

      {/* Manual edit */}
      <details className="mt-3">
        <summary className="text-[10px] text-warm-secondary/40 cursor-pointer hover:text-warm-secondary font-sans transition-colors duration-200">手动微调</summary>
        <div className="mt-2 flex flex-wrap gap-1">
          {vibe.pattern.map((v, i) => (
            <div key={i} className="flex items-center gap-0.5">
              <span className="text-[9px] text-warm-secondary/40 font-sans">{i % 2 === 0 ? "振" : "停"}</span>
              <input type="number" min={5} max={2000} value={v}
                onChange={(e) => { const p = [...vibe.pattern]; p[i] = Math.max(5, parseInt(e.target.value) || 50); onChange({ ...vibe, pattern: p, preset: "自定义" }); }}
                className="w-12 px-1 py-0.5 text-[10px] rounded bg-warm-bg border border-warm-border text-warm-text text-center font-mono focus:outline-none focus:border-coral/30" />
            </div>
          ))}
        </div>
      </details>

      {/* Label */}
      <div className="mt-3">
        <input type="text" value={vibe.label}
          onChange={(e) => onChange({ ...vibe, label: e.target.value })}
          className="w-full px-3 py-1.5 text-xs rounded-md bg-warm-bg border border-warm-border text-warm-text font-sans focus:outline-none focus:border-coral/30 transition-colors duration-200"
          placeholder="触感标签" />
      </div>
    </div>
  );
}

// ============================================================
// Audio Gate overlay
// ============================================================

function AudioGate({ onReady }: { onReady: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleTap = async () => {
    setLoading(true);
    try {
      if (!toneModule) await preloadTone();
      await toneModule.start();
      toneReady = true;
      onReady();
    } catch (e) {
      console.error("AudioGate init failed:", e);
      onReady();
    }
    setLoading(false);
  };

  return (
    <div
      onClick={handleTap}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-warm-bg/95 backdrop-blur-sm cursor-pointer"
    >
      <div className="text-center px-6 max-w-sm">
        <div className="text-8xl mb-8 text-warm-text/10 select-none">&#9835;</div>
        <h2 className="font-serif text-2xl text-warm-text mb-4">
          点击任意位置开始
        </h2>
        <p className="text-warm-secondary leading-relaxed mb-8 max-w-xs mx-auto font-sans">
          浏览器需要一次点击来激活声音。
          点一下就好，之后就能试听和预览了。
        </p>
        <span
          className={`inline-block px-8 py-3 rounded-lg font-serif text-lg transition-all duration-200 ${
            loading
              ? "bg-warm-surface text-warm-secondary"
              : "bg-warm-text text-warm-bg hover:opacity-85"
          }`}
        >
          {loading ? "正在初始化..." : "点我开始"}
        </span>
      </div>
    </div>
  );
}

// ============================================================
// Main Studio Page
// ============================================================

export default function StudioPage() {
  const [activeColor, setActiveColor] = useState(COLORS[0].slug);
  const [sound, setSound] = useState<SoundParams>(makeDefaultSound);
  const [vibe, setVibe] = useState<VibeParams>({ pattern: [100,50,100,50,200,100,300], label: "", preset: "" });
  const [playing, setPlaying] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [mounted, setMounted] = useState(false);
  const [mobileTab, setMobileTab] = useState<"sound" | "vibe">("sound");
  const [audioReady, setAudioReady] = useState(false);

  useEffect(() => { setMounted(true); preloadTone(); }, []);

  const colorInfo = COLORS.find((c) => c.slug === activeColor)!;

  // Load preset
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

  // Play preview
  const play = useCallback(async () => {
    if (playing) return;
    setPlaying(true);
    try {
      if (!toneModule) await preloadTone();
      const Tone = toneModule;
      if (!toneReady) { await Tone.start(); toneReady = true; }

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
    <>
      {!audioReady && <AudioGate onReady={() => setAudioReady(true)} />}

      <div className="min-h-screen bg-warm-bg text-warm-text">
        {/* Header */}
        <header className="border-b border-warm-border px-3 md:px-5 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 shrink-0">
            <h1 className="font-serif text-base md:text-lg text-warm-text">
              Studio
            </h1>
            {savedMsg && <span className="text-xs text-coral font-sans hidden md:inline">{savedMsg}</span>}
          </div>
          <div className="flex items-center gap-1.5">
            {savedMsg && <span className="text-[10px] text-coral md:hidden font-sans">{savedMsg}</span>}
            <button onClick={save} className="px-3 py-1.5 text-xs rounded-md bg-warm-text text-warm-bg hover:opacity-85 font-serif whitespace-nowrap transition-opacity duration-200">保存</button>
            <button onClick={exportJson} className="px-3 py-1.5 text-xs rounded-md border border-warm-border text-warm-text hover:bg-warm-surface font-serif whitespace-nowrap transition-colors duration-200">导出</button>
            <a href="/" className="px-3 py-1.5 text-xs rounded-md text-warm-secondary hover:text-warm-text font-serif whitespace-nowrap transition-colors duration-200">&larr;</a>
          </div>
        </header>

        {/* Color selector */}
        <div className="md:flex">
          <aside className="
            flex flex-row md:flex-col items-center gap-1.5 py-2.5 px-2
            border-b md:border-b-0 md:border-r border-warm-border bg-warm-surface/30
            overflow-x-auto md:overflow-y-auto shrink-0 md:w-14
          ">
            {COLORS.map((c) => (
              <button key={c.slug} onClick={() => setActiveColor(c.slug)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-200 relative shrink-0"
                style={{
                  backgroundColor: c.hex,
                  boxShadow: activeColor === c.slug ? `0 0 12px ${c.hex}60` : "none",
                  opacity: activeColor === c.slug ? 1 : 0.55,
                }}>
                <span className="mix-blend-difference text-white font-serif">{c.name[0]}</span>
                {mounted && loadPreset(c.slug) && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-coral" />}
              </button>
            ))}
          </aside>

          {/* Mobile tabs */}
          <div className="md:hidden flex border-b border-warm-border">
            <button onClick={() => setMobileTab("sound")}
              className={`flex-1 py-2.5 text-xs font-serif text-center transition-colors duration-200 ${mobileTab === "sound" ? "text-warm-text border-b-2 border-coral" : "text-warm-secondary"}`}>
              音景
            </button>
            <button onClick={() => setMobileTab("vibe")}
              className={`flex-1 py-2.5 text-xs font-serif text-center transition-colors duration-200 ${mobileTab === "vibe" ? "text-warm-text border-b-2 border-coral" : "text-warm-secondary"}`}>
              振动
            </button>
          </div>

          {/* Editor area */}
          <div className="flex-1 flex flex-col md:flex-row md:h-[calc(100vh-97px)] overflow-hidden">
            <main className={`flex-1 overflow-y-auto p-4 md:p-5 ${mobileTab === "vibe" ? "hidden md:block" : ""}`}>
              <div className="max-w-lg mx-auto">
                <h2 className="font-serif text-xl mb-4" style={{ color: colorInfo.hex }}>{colorInfo.name}</h2>
                <NotePicker notes={sound.notes} onChange={(notes) => setSound(applyIntuition({ ...sound, notes }))} />
                <IntuitionPanel sound={sound} onChange={setSound} />
                <div className="h-16 md:h-4" />
              </div>
            </main>

            <aside className={`w-full md:w-80 border-t md:border-t-0 md:border-l border-warm-border overflow-y-auto p-4 bg-warm-surface/20 shrink-0 ${mobileTab === "sound" ? "hidden md:block" : ""}`}>
              <VibeEditor vibe={vibe} onChange={setVibe} />
              <div className="h-16 md:h-4" />
            </aside>
          </div>
        </div>

        {/* Play bar */}
        <div className="fixed bottom-0 left-0 md:left-14 right-0 border-t border-warm-border bg-warm-bg/95 backdrop-blur px-4 py-2.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-center gap-3">
          <button onClick={play} disabled={playing}
            className={`px-12 py-3 rounded-lg font-serif text-base transition-all duration-200 flex-1 md:flex-none ${
              playing ? "bg-warm-surface text-warm-secondary cursor-wait" : "text-white hover:opacity-90 active:scale-[0.98]"
            }`}
            style={{ backgroundColor: playing ? undefined : colorInfo.hex }}>
            {playing ? "播放中..." : "预览"}
          </button>
        </div>
      </div>
    </>
  );
}
