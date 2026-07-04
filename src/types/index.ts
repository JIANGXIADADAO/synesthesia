export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ColorWithAnswers {
  id: string;
  slug: string;
  nameZh: string;
  nameEn: string | null;
  hex: string | null;
  summary: string | null;
  answerCount: number;
  consensusScore: number;
  createdAt: string;
  answers: AnswerWithSensory[];
  /** 最高赞回答编译后的感官参数（"感受这个颜色"按钮使用） */
  sensory?: {
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
  };
}

export interface AnswerWithSensory {
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

export interface SubmitAnswerBody {
  colorId: string;
  authorName: string;
  touch: string;
  sound: string;
  temperature: string;
  smell: string;
  summary?: string;
}

export interface VoteBody {
  voterId: string;
}
