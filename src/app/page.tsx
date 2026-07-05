"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ColorWithAnswers, AnswerWithSensory } from "@/types";
import { STATIC_DATA, addLocalAnswer, getLocalAnswers, toggleLocalVote, getLocalVoteDelta, type ColorData, type AnswerData } from "@/lib/data";
import type * as ToneType from "tone";

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
// Types
// ============================================================

interface ColorListItem {
  id: string;
  slug: string;
  nameZh: string;
  nameEn: string | null;
  hex: string | null;
  summary: string | null;
  answerCount: number;
  consensusScore: number;
}

interface SensoryData {
  vibration: { pattern: number[]; label: string };
  soundscape: {
    synthType: string;
    notes: string[];
    duration: number;
    reverbDecay: number;
    reverbWet: number;
    delayTime: number;
    delayFeedback: number;
    lfoRate: number;
    lfoDepth: number;
    filterFreq: number;
    filterType: string;
    noiseMix: number;
    envelope: { attack: number; decay: number; sustain: number; release: number };
  };
}

// ============================================================
// Utilities
// ============================================================

function getVoterId(): string {
  if (typeof window === "undefined") return "anonymous";
  let id = localStorage.getItem("synesthesia-voter-id");
  if (!id) {
    id = "voter-" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem("synesthesia-voter-id", id);
  }
  return id;
}

// ============================================================
// Soundscape hook
// ============================================================

function useSoundscape() {
  const playingRef = useRef(false);

  const play = useCallback(async (params: SensoryData["soundscape"]) => {
    if (playingRef.current) return;
    playingRef.current = true;

    try {
      if (!toneModule) await preloadTone();
      const Tone = toneModule;

      if (!toneReady) {
        await Tone.start();
        toneReady = true;
      }

      const vol = new Tone.Volume(-6).toDestination();
      const reverb = new Tone.Reverb({
        decay: params.reverbDecay,
        wet: params.reverbWet,
      }).connect(vol);
      const delay = new Tone.FeedbackDelay({
        delayTime: params.delayTime,
        feedback: params.delayFeedback,
        wet: params.delayTime > 0.1 ? 0.25 : 0,
      }).connect(reverb);
      const filter = new Tone.Filter({
        frequency: params.filterFreq,
        type: params.filterType,
        rolloff: -12,
      }).connect(delay);

      if (params.lfoRate > 0) {
        const lfo = new Tone.LFO({
          frequency: params.lfoRate,
          min: Math.max(100, params.filterFreq - params.lfoDepth),
          max: Math.min(4000, params.filterFreq + params.lfoDepth),
        }).connect(filter.frequency);
        lfo.start();
      }

      const SynthClass =
        params.synthType === "AMSynth" ? Tone.AMSynth :
        params.synthType === "FMSynth" ? Tone.FMSynth :
        params.synthType === "PluckSynth" ? Tone.PluckSynth :
        Tone.Synth;

      const synth = new Tone.PolySynth(SynthClass, {
        maxPolyphony: 6,
        envelope: {
          attack: Math.min(0.3, params.duration * 0.1),
          decay: 0.2,
          sustain: 0.7,
          release: params.duration * 0.5,
        },
        volume: -4,
      }).connect(filter);

      if (params.noiseMix > 0) {
        const noise = new Tone.Noise("pink").start();
        const noiseGain = new Tone.Gain(params.noiseMix * 0.15).connect(delay);
        noise.connect(noiseGain);
      }

      const now = Tone.now();
      params.notes.forEach((note, i) => {
        synth.triggerAttackRelease(note, params.duration, now + i * 0.08);
      });

      setTimeout(() => {
        synth.dispose();
        filter.dispose();
        delay.dispose();
        reverb.dispose();
        vol.dispose();
        playingRef.current = false;
      }, (params.duration + 2) * 1000);
    } catch (e) {
      console.error("Soundscape error:", e);
      playingRef.current = false;
    }
  }, []);

  return { play };
}

// ============================================================
// Color Card
// ============================================================

function ColorCard({
  color,
  onClick,
}: {
  color: ColorListItem;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-lg text-left transition-all duration-300 hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-coral"
      style={{
        backgroundColor: color.hex || "#333",
        minHeight: "180px",
      }}
      aria-label={`${color.nameZh}，${color.answerCount}个回答`}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent transition-opacity duration-300 group-hover:from-black/50" />
      <div className="relative z-10 flex flex-col justify-end h-full min-h-[140px] p-5">
        <span className="font-serif text-3xl text-white drop-shadow-sm">
          {color.nameZh}
        </span>
        <span className="text-sm text-white/60 mt-0.5">{color.nameEn}</span>
        {color.summary && (
          <p className="mt-3 text-sm text-white/85 leading-relaxed line-clamp-2 italic">
            &ldquo;{color.summary}&rdquo;
          </p>
        )}
        <div className="mt-3 flex gap-4 text-xs text-white/50 font-sans">
          <span>{color.answerCount} 个回答</span>
          <span>{color.consensusScore} 人共鸣</span>
        </div>
      </div>
    </button>
  );
}

// ============================================================
// Audio Gate overlay
// ============================================================

function AudioGate({
  onReady,
  hasVibration,
}: {
  onReady: () => void;
  hasVibration: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
  }, []);

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
        <div className="text-8xl mb-8 text-warm-text/15 select-none">&#9883;</div>
        <h2 className="font-serif text-2xl text-warm-text mb-4">
          点击任意位置开始
        </h2>
        <p className="text-warm-secondary leading-relaxed mb-8 max-w-xs mx-auto">
          你的浏览器需要一次点击来激活声音。
          点一下就好，之后就能感受颜色了。
        </p>

        {/* Device tips */}
        <div className="text-xs text-warm-secondary/60 space-y-1 mb-6">
          {isIOS && (
            <p>Apple 设备：请确认侧边静音开关已关闭，音量已调高</p>
          )}
          {!hasVibration && (
            <p>
              {isIOS
                ? "iOS 不支持振动，将使用视觉脉动代替"
                : "桌面端使用视觉脉动代替振动"}
            </p>
          )}
        </div>

        <span
          className={`inline-block px-8 py-3 rounded-lg font-serif text-lg transition-all duration-200 ${
            loading
              ? "bg-warm-surface text-warm-secondary"
              : "bg-warm-text text-warm-bg hover:opacity-85"
          }`}
        >
          {loading ? "正在初始化..." : "点我开始"}
        </span>

        {isIOS && (
          <p className="mt-4 text-xs text-warm-secondary/50">
            如果之后还是没声音，请关闭 iPhone 左侧的静音开关再试
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Main page
// ============================================================

export default function Home() {
  const [colors, setColors] = useState<ColorListItem[]>([]);
  const [selected, setSelected] = useState<ColorWithAnswers | null>(null);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [searchText, setSearchText] = useState("");
  const { play } = useSoundscape();
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    setColors(
      STATIC_DATA.colors.map((c) => ({
        id: c.id, slug: c.slug, nameZh: c.nameZh, nameEn: c.nameEn,
        hex: c.hex, summary: c.summary,
        answerCount: c.answerCount + getLocalAnswers(c.slug).length,
        consensusScore: c.consensusScore,
      }))
    );
    preloadTone();
  }, []);

  const selectColor = (slug: string) => {
    setLoading(true);
    const base = STATIC_DATA.bySlug[slug];
    if (!base) { setLoading(false); return; }
    const localAnswers = getLocalAnswers(slug);
    const merged: ColorWithAnswers = {
      ...base,
      answers: [
        ...localAnswers.map((a) => ({
          ...a, isConsensus: false, voteCount: a.voteCount + getLocalVoteDelta(a.id),
        })),
        ...base.answers.map((a) => ({
          ...a, voteCount: a.voteCount + getLocalVoteDelta(a.id),
        })),
      ].sort((a, b) => b.voteCount - a.voteCount),
      answerCount: base.answerCount + localAnswers.length,
      consensusScore: base.consensusScore,
      sensory: (base as any).sensory,
    };
    setSelected(merged);
    setLoading(false);
  };

  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("你的浏览器不支持语音识别，请用 Chrome 或 Safari。也可以直接点击颜色卡片。");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "zh-CN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setSearchText(transcript);
      const found = colors.find((c) => transcript.includes(c.nameZh));
      if (found) {
        selectColor(found.slug);
      } else {
        alert(`没找到"${transcript}"对应的颜色。试试直接说"紫色"、"红色"等。`);
      }
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognition.start();
    setListening(true);
    recognitionRef.current = recognition;
  }, [colors]);

  // Browser capability detection (deferred to client for SSR safety)
  const [visualVibe, setVisualVibe] = useState(false);
  const [hasVibration, setHasVibration] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  useEffect(() => {
    setHasVibration(!!navigator.vibrate);
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
  }, []);

  const feelColor = (sensory: SensoryData) => {
    if (navigator.vibrate) {
      navigator.vibrate(sensory.vibration.pattern);
    } else {
      const duration = (sensory.soundscape?.duration || 5) * 1000;
      setVisualVibe(true);
      setTimeout(() => setVisualVibe(false), duration);
    }
    play(sensory.soundscape);
  };

  const vote = (answerId: string) => {
    toggleLocalVote(answerId);
    if (selected) selectColor(selected.slug);
  };

  const submitAnswer = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selected) return;

    const form = e.currentTarget;
    const formData = new FormData(form);

    addLocalAnswer(
      selected.slug,
      (formData.get("authorName") as string) || "匿名",
      formData.get("touch") as string,
      formData.get("sound") as string,
      formData.get("temperature") as string,
      formData.get("smell") as string,
      formData.get("summary") as string
    );

    form.reset();
    selectColor(selected.slug);
  };

  return (
    <>
      {!audioReady && (
        <AudioGate
          onReady={() => setAudioReady(true)}
          hasVibration={hasVibration}
        />
      )}

      <main id="main-content" className="min-h-screen pb-24">
        {/* Header */}
        <header className="px-6 pt-12 pb-8 text-center relative max-w-2xl mx-auto">
          <a
            href="/studio"
            className="absolute top-4 right-4 font-serif text-sm text-warm-secondary hover:text-warm-text transition-colors duration-200 underline underline-offset-4 decoration-warm-border hover:decoration-warm-text"
          >
            Studio
          </a>
          <h1 className="font-serif text-hero text-warm-text mb-3">
            Synesthesia
          </h1>
          <p className="font-serif text-h4 text-warm-text/80 mb-2">
            通感词典
          </p>
          <p className="text-body text-warm-secondary max-w-md mx-auto leading-relaxed">
            用剩下的感官，感受颜色。按住屏幕问一个颜色，社区会告诉你它摸起来、听起来、闻起来是什么感觉。
          </p>
        </header>

        {/* Voice Search */}
        <div className="px-4 max-w-lg mx-auto mb-12">
          <button
            onClick={startListening}
            disabled={listening}
            className={`w-full py-5 rounded-lg font-serif text-xl transition-all duration-300 ${
              listening
                ? "bg-coral text-white"
                : "bg-warm-text text-warm-bg hover:opacity-85 active:scale-[0.98]"
            }`}
            aria-label={listening ? "正在听你说话" : "按住问颜色"}
          >
            {listening ? "正在听..." : "按住问颜色"}
          </button>
          {listening && (
            <p className="text-center mt-4 text-warm-secondary animate-pulse">
              说出一个颜色，比如"紫色"...
            </p>
          )}
          {searchText && (
            <p className="text-center mt-3 text-warm-secondary/70">
              你问了："{searchText}"
            </p>
          )}
        </div>

        {/* Color Grid */}
        {!selected && (
          <section className="px-4 max-w-3xl mx-auto">
            <h2 className="font-serif text-h4 text-warm-text/80 mb-6">
              {colors.length} 种颜色等你来感受
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {colors.map((c) => (
                <ColorCard key={c.id} color={c} onClick={() => selectColor(c.slug)} />
              ))}
            </div>
          </section>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-20 text-warm-secondary">加载中...</div>
        )}

        {/* Color Detail */}
        {selected && !loading && (
          <section className="px-4 max-w-2xl mx-auto">
            {/* Back */}
            <button
              onClick={() => setSelected(null)}
              className="mb-6 font-serif text-sm text-warm-secondary hover:text-warm-text transition-colors duration-200"
            >
              &larr; 回到所有颜色
            </button>

            {/* Color header */}
            <div
              className="rounded-xl p-8 mb-8 text-white relative overflow-hidden"
              style={{ backgroundColor: selected.hex || "#333" }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="relative z-10">
                <h2 className="font-serif text-4xl mb-1">{selected.nameZh}</h2>
                <p className="text-white/60">{selected.nameEn}</p>
                {selected.summary && (
                  <p className="mt-5 font-serif italic text-lg leading-relaxed text-white/90 max-w-lg">
                    &ldquo;{selected.summary}&rdquo;
                  </p>
                )}
                <div className="mt-4 flex gap-5 text-sm text-white/55 font-sans">
                  <span>{selected.answerCount} 个回答</span>
                  <span>{selected.consensusScore} 人共鸣</span>
                </div>
              </div>
            </div>

            {/* Feel this color */}
            {selected.sensory && (
              <div className="mb-10 text-center">
                <button
                  onClick={() => feelColor(selected.sensory!)}
                  className={`px-10 py-4 rounded-lg font-serif text-lg transition-all duration-300 ${
                    visualVibe
                      ? "bg-coral text-white scale-105 ring-4 ring-coral/30"
                      : "bg-warm-text text-warm-bg hover:opacity-85 active:scale-[0.98]"
                  }`}
                  aria-label={`感受${selected.nameZh}`}
                >
                  感受{selected.nameZh}
                </button>
                <p className="mt-3 text-xs text-warm-secondary/60 font-sans">
                  {hasVibration
                    ? `振动模式: ${selected.sensory.vibration.label} · 手机振动 + 音景`
                    : isIOS
                    ? `振动模式: ${selected.sensory.vibration.label} · iOS 不支持振动，用视觉脉动代替`
                    : `振动模式: ${selected.sensory.vibration.label} · 桌面端用视觉脉动代替 + 音景`}
                </p>
                {visualVibe && !hasVibration && (
                  <p className="mt-2 text-sm text-coral animate-pulse font-serif">
                    正在感受{selected.nameZh}的振动节奏...
                  </p>
                )}
              </div>
            )}

            {/* Community answers */}
            <h3 className="font-serif text-h4 text-warm-text/80 mb-5">
              社区回答
            </h3>

            {selected.answers.length === 0 && (
              <p className="text-warm-secondary text-center py-12">
                这个颜色还没有人回答。来做第一个翻译它的人吧。
              </p>
            )}

            <div className="space-y-4 mb-12">
              {selected.answers.map((answer) => (
                <div
                  key={answer.id}
                  className="border border-warm-border rounded-lg p-5 bg-warm-bg"
                >
                  {answer.isConsensus && (
                    <span className="inline-block mb-3 font-serif text-xs text-coral border border-coral/30 rounded-full px-3 py-0.5 bg-coral/5">
                      社区共识
                    </span>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <SenseRow label="触觉" text={answer.touch} />
                    <SenseRow label="听觉" text={answer.sound} />
                    <SenseRow label="温度" text={answer.temperature} />
                    <SenseRow label="嗅觉" text={answer.smell} />
                  </div>

                  {answer.summary && (
                    <p className="mt-4 font-serif italic text-warm-text/80 leading-relaxed">
                      &ldquo;{answer.summary}&rdquo;
                    </p>
                  )}

                  <div className="mt-4 flex items-center justify-between text-xs text-warm-secondary font-sans">
                    <span>{answer.authorName || "匿名"}</span>
                    <button
                      onClick={() => vote(answer.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-warm-border hover:border-warm-text/20 hover:bg-warm-surface transition-colors duration-200 active:scale-95"
                      aria-label={`有共鸣。当前 ${answer.voteCount} 人。`}
                    >
                      {answer.voteCount} 共鸣
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Answer form */}
            <div className="border border-warm-border rounded-xl p-6 mb-12">
              <h3 className="font-serif text-h4 text-warm-text/80 mb-2">
                写下你对{selected.nameZh}的感受
              </h3>
              <p className="text-xs text-warm-secondary mb-6 font-sans">
                规则：请不用视觉词汇（"看起来像..."）。盲人不缺眼睛，缺的是有人把颜色翻译成他们有的感官。
              </p>

              <form onSubmit={submitAnswer} className="space-y-4">
                <div>
                  <label className="text-sm text-warm-secondary block mb-1.5 font-sans">
                    你的名字
                  </label>
                  <input
                    name="authorName"
                    type="text"
                    placeholder="林言"
                    className="w-full rounded-lg border border-warm-border bg-warm-bg px-4 py-2.5 text-sm text-warm-text placeholder:text-warm-secondary/40 focus:outline-none focus:border-warm-text/30 transition-colors duration-200 font-sans"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <SenseInput name="touch" label="摸起来像..." placeholder="粗糙橡胶加细沙流过指尖" />
                  <SenseInput name="sound" label="听起来像..." placeholder="低音提琴和远处雷声" />
                  <SenseInput name="temperature" label="温度感觉" placeholder="微凉和闷热交替" />
                  <SenseInput name="smell" label="闻起来像..." placeholder="臭氧和湿泥土" />
                </div>

                <div>
                  <label className="text-sm text-warm-secondary block mb-1.5 font-sans">
                    一句话总结（可选）
                  </label>
                  <input
                    name="summary"
                    type="text"
                    placeholder="雷雨前空气里的重量感，闷闷的，带电的。"
                    className="w-full rounded-lg border border-warm-border bg-warm-bg px-4 py-2.5 text-sm text-warm-text placeholder:text-warm-secondary/40 focus:outline-none focus:border-warm-text/30 transition-colors duration-200 font-sans"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-lg font-serif text-base bg-warm-text text-warm-bg hover:opacity-85 active:scale-[0.98] transition-all duration-200"
                >
                  提交回答
                </button>
              </form>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="mt-20 text-center text-warm-secondary/40 text-xs font-sans py-8 border-t border-warm-border">
          <p>不是要代替光，是用剩下的所有感官，把光重构一遍。</p>
        </footer>
      </main>
    </>
  );
}

// ============================================================
// Small components
// ============================================================

function SenseRow({
  label,
  text,
}: {
  label: string;
  text: string | null;
}) {
  if (!text) return null;
  return (
    <div className="flex gap-2 text-sm font-sans">
      <span className="text-warm-secondary/60 shrink-0">{label}:</span>
      <span className="text-warm-text/80">{text}</span>
    </div>
  );
}

function SenseInput({
  name,
  label,
  placeholder,
}: {
  name: string;
  label: string;
  placeholder: string;
}) {
  return (
    <div>
      <label className="text-sm text-warm-secondary block mb-1.5 font-sans">
        {label}
      </label>
      <input
        name={name}
        type="text"
        placeholder={placeholder}
        className="w-full rounded-lg border border-warm-border bg-warm-bg px-4 py-2.5 text-sm text-warm-text placeholder:text-warm-secondary/40 focus:outline-none focus:border-warm-text/30 transition-colors duration-200 font-sans"
      />
    </div>
  );
}
