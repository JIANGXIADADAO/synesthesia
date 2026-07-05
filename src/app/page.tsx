"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ColorWithAnswers, AnswerWithSensory } from "@/types";
import { STATIC_DATA, addLocalAnswer, getLocalAnswers, toggleLocalVote, getLocalVoteDelta, type ColorData, type AnswerData } from "@/lib/data";
import type * as ToneType from "tone";

// ============================================================
// Tone.js 预加载（模块级，页面加载即开始导入）
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
// 类型
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
// 工具函数
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
// 子组件：音景播放器 (Tone.js)
// ============================================================

function useSoundscape() {
  const playingRef = useRef(false);

  const play = useCallback(async (params: SensoryData["soundscape"]) => {
    if (playingRef.current) return;
    playingRef.current = true;

    try {
      // 使用预加载的 Tone 模块（页面加载时已开始 import）
      if (!toneModule) await preloadTone();
      const Tone = toneModule;

      // 如果 AudioGate 还没触发，补调 start（桌面端场景）
      if (!toneReady) {
        await Tone.start();
        toneReady = true;
      }
      console.log("🎵 Playing:", params.notes, params.synthType);

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

      console.log("🎵 Playing for", params.duration, "seconds");

      setTimeout(() => {
        synth.dispose();
        filter.dispose();
        delay.dispose();
        reverb.dispose();
        vol.dispose();
        playingRef.current = false;
        console.log("🎵 Done");
      }, (params.duration + 2) * 1000);

    } catch (e) {
      console.error("❌ Soundscape error:", e);
      playingRef.current = false;
    }
  }, []);

  return { play };
}

// ============================================================
// 子组件：颜色卡片
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
      className="relative overflow-hidden rounded-2xl p-5 text-left transition-all hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-amber-400"
      style={{
        backgroundColor: color.hex || "#333",
        minHeight: "160px",
      }}
      aria-label={`${color.nameZh}，${color.answerCount}个回答，${color.consensusScore}人共鸣`}
      data-color={color.slug}
    >
      {/* 渐变遮罩 */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      <div className="relative z-10 flex flex-col justify-end h-full min-h-[120px]">
        <span className="text-3xl font-bold text-white drop-shadow-lg">
          {color.nameZh}
        </span>
        <span className="text-sm text-white/70">{color.nameEn}</span>
        {color.summary && (
          <p className="mt-2 text-sm text-white/90 line-clamp-2 leading-relaxed">
            &ldquo;{color.summary}&rdquo;
          </p>
        )}
        <div className="mt-2 flex gap-3 text-xs text-white/60">
          <span>📝 {color.answerCount}</span>
          <span>💜 {color.consensusScore} 共鸣</span>
        </div>
      </div>
    </button>
  );
}

// ============================================================
// 子组件：音频引导覆盖层（移动端 AudioContext 必须在用户手势中启动）
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
      // 在用户手势回调中同步启动 AudioContext
      if (!toneModule) await preloadTone();
      await toneModule.start();
      toneReady = true;
      onReady();
    } catch (e) {
      console.error("AudioGate init failed:", e);
      // 即使失败也放行，让后续 play() 重试
      onReady();
    }
    setLoading(false);
  };

  return (
    <div
      onClick={handleTap}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-950/95 backdrop-blur-sm cursor-pointer"
    >
      <div className="text-center px-6 max-w-sm">
        {/* 大图标 */}
        <div className="text-6xl mb-6 animate-bounce">🎧</div>
        <h2 className="text-2xl font-bold text-amber-400 mb-3">
          点击任意位置开始
        </h2>
        <p className="text-purple-200/70 leading-relaxed mb-4">
          你的浏览器需要一次点击来激活声音。
          <br />
          点一下就好，之后就能感受颜色了。
        </p>

        {/* 设备兼容信息 */}
        <div className="text-xs text-purple-300/40 space-y-1">
          {isIOS && (
            <p>
              🍎 iOS 设备：请确认侧边静音开关已关闭，音量已调高
            </p>
          )}
          {!hasVibration && (
            <p>
              {isIOS
                ? "📳 iOS 不支持振动，将使用视觉脉动代替"
                : "💻 桌面端使用视觉脉动代替振动"}
            </p>
          )}
        </div>

        <div className="mt-6">
          <span
            className={`inline-block px-6 py-3 rounded-full text-lg font-semibold transition-all ${
              loading
                ? "bg-gray-700 text-gray-400"
                : "bg-amber-400 text-gray-900 animate-pulse"
            }`}
          >
            {loading ? "⏳ 正在初始化..." : "👆 点击这里"}
          </span>
        </div>

        {/* 无障碍：关闭静音开关提示（iOS） */}
        {isIOS && (
          <p className="mt-4 text-xs text-amber-400/50">
            💡 如果之后还是没声音，请关闭 iPhone 左侧的静音开关再试
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 主页面
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

  // 加载颜色列表（静态数据）+ 预加载 Tone.js
  useEffect(() => {
    setColors(
      STATIC_DATA.colors.map((c) => ({
        id: c.id, slug: c.slug, nameZh: c.nameZh, nameEn: c.nameEn,
        hex: c.hex, summary: c.summary,
        answerCount: c.answerCount + getLocalAnswers(c.slug).length,
        consensusScore: c.consensusScore,
      }))
    );
    // 后台预加载 Tone.js 模块，不等它完成
    preloadTone();
  }, []);

  // 选中颜色 → 加载详情（静态数据 + localStorage）
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

  // 语音识别
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

      // 匹配颜色名
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

  // 振动支持检测（SSR 安全：延迟到客户端 useEffect 再读 navigator）
  const [visualVibe, setVisualVibe] = useState(false);
  const [hasVibration, setHasVibration] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  useEffect(() => {
    setHasVibration(!!navigator.vibrate);
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
  }, []);

  // 感受这个颜色
  const feelColor = (sensory: SensoryData) => {
    // 振动（手机端，周期性长振动 4-6 秒）
    if (navigator.vibrate) {
      navigator.vibrate(sensory.vibration.pattern);
    } else {
      // 桌面端降级：视觉脉动（跟随音景时长）
      const duration = (sensory.soundscape?.duration || 5) * 1000;
      setVisualVibe(true);
      setTimeout(() => setVisualVibe(false), duration);
    }
    // 音景（Tone.js，全平台可用）
    play(sensory.soundscape);
  };

  // 投票（localStorage）
  const vote = (answerId: string) => {
    toggleLocalVote(answerId);
    if (selected) selectColor(selected.slug);
  };

  // 提交回答（localStorage）
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
      {/* 移动端音频引导覆盖层：在用户手势中同步启动 AudioContext */}
      {!audioReady && (
        <AudioGate
          onReady={() => setAudioReady(true)}
          hasVibration={hasVibration}
        />
      )}

      <main id="main-content" className="min-h-screen pb-20">
        {/* Header */}
        <header className="px-6 py-8 text-center relative">
        <a href="/studio" className="absolute top-4 right-4 px-3 py-1.5 text-xs rounded-full bg-purple-800/30 border border-purple-700/30 text-purple-300 hover:bg-purple-700/50 hover:text-purple-100 transition-colors" title="声音设计工具">
          🎛 Studio
        </a>
        <h1 className="text-4xl font-bold tracking-wide text-amber-400">
          Synesthesia
        </h1>
        <p className="mt-2 text-lg text-purple-200">通感词典</p>
        <p className="mt-1 text-sm text-purple-300/60 max-w-md mx-auto leading-relaxed">
          用剩下的感官，感受颜色。按住屏幕问一个颜色，社区会告诉你它摸起来、听起来、闻起来是什么感觉。
        </p>
      </header>

      {/* Voice Search */}
      <div className="px-4 max-w-lg mx-auto mb-8">
        <button
          onClick={startListening}
          disabled={listening}
          className={`w-full py-6 rounded-2xl text-xl font-bold transition-all duration-300 ${
            listening
              ? "bg-red-500 animate-pulse text-white"
              : "bg-amber-400 text-gray-900 hover:bg-amber-300 active:scale-95"
          }`}
          aria-label={
            listening ? "正在听你说话..." : "按住问颜色。整个屏幕都是按钮。"
          }
        >
          {listening ? "👂 正在听..." : "🎤 按住问颜色"}
        </button>
        {listening && (
          <p className="text-center mt-3 text-purple-300/50 animate-pulse">
            说出一个颜色，比如&ldquo;紫色&rdquo;...
          </p>
        )}
        {searchText && (
          <p className="text-center mt-2 text-amber-400/80">
            你问了：&ldquo;{searchText}&rdquo;
          </p>
        )}
      </div>

      {/* Color Grid */}
      {!selected && (
        <section className="px-4 max-w-2xl mx-auto">
          <h2 className="text-lg font-semibold text-purple-300 mb-4">
            {colors.length} 种颜色等你来感受
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {colors.map((c) => (
              <ColorCard key={c.id} color={c} onClick={() => selectColor(c.slug)} />
            ))}
          </div>
        </section>
      )}

      {/* Color Detail */}
      {loading && (
        <div className="text-center py-20 text-purple-300/50">加载中...</div>
      )}

      {selected && !loading && (
        <section className="px-4 max-w-2xl mx-auto">
          {/* 返回 */}
          <button
            onClick={() => setSelected(null)}
            className="mb-4 text-purple-300 hover:text-amber-400 transition-colors text-sm"
          >
            ← 回到所有颜色
          </button>

          {/* 颜色头部 */}
          <div
            className="rounded-2xl p-8 mb-6 text-white relative overflow-hidden"
            style={{ backgroundColor: selected.hex || "#333" }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="relative z-10">
              <h2 className="text-4xl font-bold">{selected.nameZh}</h2>
              <p className="text-white/70">{selected.nameEn}</p>
              {selected.summary && (
                <p className="mt-4 text-lg leading-relaxed text-white/95">
                  &ldquo;{selected.summary}&rdquo;
                </p>
              )}
              <div className="mt-3 flex gap-4 text-sm text-white/70">
                <span>{selected.answerCount} 个回答</span>
                <span>{selected.consensusScore} 人共鸣</span>
              </div>
            </div>
          </div>

          {/* 感受这个颜色 */}
          {selected.sensory && (
            <div className="mb-6 text-center">
              <button
                onClick={() => feelColor(selected.sensory!)}
                className={`px-8 py-4 rounded-full text-white text-lg font-semibold
                  transition-all shadow-lg shadow-purple-900/30
                  ${visualVibe
                    ? "animate-pulse bg-gradient-to-r from-amber-500 to-red-500 scale-105 ring-4 ring-amber-400/50"
                    : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-95"
                  }`}
                aria-label={`感受${selected.nameZh}。${hasVibration ? "手机会振动并播放声音。" : "屏幕会脉动并播放声音。"}`}
              >
                📡 感受{selected.nameZh}
              </button>
              <p className="mt-2 text-xs text-purple-300/50">
                {hasVibration
                  ? `📳 振动模式: ${selected.sensory.vibration.label} · 手机振动 + 音景`
                  : isIOS
                  ? `👁 振动模式: ${selected.sensory.vibration.label} · iOS 不支持振动，用视觉脉动代替`
                  : `💻 振动模式: ${selected.sensory.vibration.label} · 桌面端用视觉脉动代替 + 音景`}
              </p>
              {visualVibe && !hasVibration && (
                <p className="mt-1 text-sm text-amber-400 animate-pulse">
                  ⚡ 正在感受{selected.nameZh}的振动节奏...
                </p>
              )}
            </div>
          )}

          {/* 回答列表 */}
          <h3 className="text-lg font-semibold text-purple-200 mb-4">
            社区回答
          </h3>

          {selected.answers.length === 0 && (
            <p className="text-purple-300/50 text-center py-10">
              这个颜色还没有人回答。来做第一个翻译它的人吧。
            </p>
          )}

          <div className="space-y-4 mb-10">
            {selected.answers.map((answer) => (
              <div
                key={answer.id}
                className="bg-purple-950/30 border border-purple-800/30 rounded-xl p-5"
              >
                {answer.isConsensus && (
                  <span className="inline-block mb-2 px-2 py-0.5 text-xs rounded-full bg-amber-400/20 text-amber-400 border border-amber-400/30">
                    ✦ 社区共识
                  </span>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <SenseRow emoji="🖐" label="触觉" text={answer.touch} />
                  <SenseRow emoji="👂" label="听觉" text={answer.sound} />
                  <SenseRow emoji="🌡" label="温度" text={answer.temperature} />
                  <SenseRow emoji="👃" label="嗅觉" text={answer.smell} />
                </div>

                {answer.summary && (
                  <p className="mt-3 text-purple-100 italic leading-relaxed">
                    &ldquo;{answer.summary}&rdquo;
                  </p>
                )}

                <div className="mt-3 flex items-center justify-between text-xs text-purple-300/60">
                  <span>{answer.authorName || "匿名"}</span>
                  <button
                    onClick={() => vote(answer.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-purple-800/30 hover:bg-purple-700/40 transition-colors active:scale-95"
                    aria-label={`有共鸣。当前 ${answer.voteCount} 人。`}
                  >
                    💜 {answer.voteCount} 共鸣
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* 回答表单 */}
          <div className="bg-purple-950/20 border border-purple-800/20 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-purple-200 mb-4">
              写下你对{selected.nameZh}的感受
            </h3>
            <p className="text-xs text-purple-300/50 mb-4">
              规则：请不用视觉词汇（&ldquo;看起来像...&rdquo;）。盲人不缺眼睛，缺的是有人把颜色翻译成他们有的感官。
            </p>

            <form onSubmit={submitAnswer} className="space-y-4">
              <div>
                <label className="text-sm text-purple-300 block mb-1">
                  你的名字
                </label>
                <input
                  name="authorName"
                  type="text"
                  placeholder="林言"
                  className="w-full rounded-lg bg-purple-950/50 border border-purple-800/30 px-4 py-2 text-purple-100 placeholder-purple-500/40 focus:outline-none focus:border-amber-400/50"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <SenseInput emoji="🖐" name="touch" label="摸起来像..." placeholder="粗糙橡胶加细沙流过指尖" />
                <SenseInput emoji="👂" name="sound" label="听起来像..." placeholder="低音提琴和远处雷声" />
                <SenseInput emoji="🌡" name="temperature" label="温度感觉" placeholder="微凉和闷热交替" />
                <SenseInput emoji="👃" name="smell" label="闻起来像..." placeholder="臭氧和湿泥土" />
              </div>

              <div>
                <label className="text-sm text-purple-300 block mb-1">
                  一句话总结（可选）
                </label>
                <input
                  name="summary"
                  type="text"
                  placeholder="雷雨前空气里的重量感，闷闷的，带电的。"
                  className="w-full rounded-lg bg-purple-950/50 border border-purple-800/30 px-4 py-2 text-purple-100 placeholder-purple-500/40 focus:outline-none focus:border-amber-400/50"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-amber-400 text-gray-900 font-semibold hover:bg-amber-300 active:scale-[0.98] transition-all"
              >
                提交回答
              </button>
            </form>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="mt-20 text-center text-purple-400/30 text-xs py-8">
        <p>不是要代替光，是用剩下的所有感官，把光重构一遍。</p>
      </footer>
    </main>
    </>
  );
}

// ============================================================
// 小组件
// ============================================================

function SenseRow({
  emoji,
  label,
  text,
}: {
  emoji: string;
  label: string;
  text: string | null;
}) {
  if (!text) return null;
  return (
    <div className="flex gap-2">
      <span className="shrink-0">{emoji}</span>
      <span className="text-purple-300/70">{label}:</span>
      <span className="text-purple-200">{text}</span>
    </div>
  );
}

function SenseInput({
  emoji,
  name,
  label,
  placeholder,
}: {
  emoji: string;
  name: string;
  label: string;
  placeholder: string;
}) {
  return (
    <div>
      <label className="text-sm text-purple-300 block mb-1">
        {emoji} {label}
      </label>
      <input
        name={name}
        type="text"
        placeholder={placeholder}
        className="w-full rounded-lg bg-purple-950/50 border border-purple-800/30 px-4 py-2 text-sm text-purple-100 placeholder-purple-500/40 focus:outline-none focus:border-amber-400/50"
      />
    </div>
  );
}
