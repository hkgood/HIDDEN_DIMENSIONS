import * as Tone from 'tone';

// 音色类型定义
export type TimbreType = 'bells' | 'strings' | 'piano' | 'windOrgan';

// 音色配置接口
interface TimbreConfig {
  name: string;           // 显示名称
  nameCN: string;         // 中文名称
  mainSynth: any;         // 主旋律合成器配置
  stepSynth: any;         // 步行音效合成器配置
  mechanismSynth: any;    // 机关音效合成器配置
  chordSettings: {        // 和弦/胜利音效设置
    duration: string;
    spacing: number;
  };
}

// 四种空灵音色配置
const TIMBRE_CONFIGS: Record<TimbreType, TimbreConfig> = {
  // 1. 铃声 + 三角铁 (Crystal Bells)
  bells: {
    name: 'Crystal Bells',
    nameCN: '水晶钟琴',
    mainSynth: {
      type: Tone.FMSynth,
      options: {
        harmonicity: 8,        // 高泛音 - 清脆
        modulationIndex: 12,   // 强调制 - 金属感
        detune: 0,
        oscillator: { type: "sine" },
        envelope: { attack: 0.001, decay: 0.8, sustain: 0.1, release: 2.5 },  // 极快attack
        modulation: { type: "square" },  // 方波调制增加金属质感
        modulationEnvelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.5 }
      },
      volume: -12
    },
    // 统一使用原始温和音效
    stepSynth: {
      type: Tone.Synth,
      options: {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 1 }
      },
      volume: -10
    },
    mechanismSynth: {
      type: Tone.MonoSynth,
      options: {
        oscillator: { type: "sine" },
        envelope: { attack: 0.2, decay: 0.5, sustain: 0.8, release: 1.5 }
      },
      volume: -6
    },
    chordSettings: { duration: "1n", spacing: 0.15 }
  },

  // 2. 弦乐 (Ethereal Strings)
  strings: {
    name: 'Ethereal Strings',
    nameCN: '空灵弦乐',
    mainSynth: {
      type: Tone.AMSynth,
      options: {
        harmonicity: 2,
        detune: 0,
        oscillator: { type: "sine" },
        envelope: { attack: 0.3, decay: 0.4, sustain: 0.7, release: 3 },  // 慢attack，长sustain
        modulation: { type: "square" },
        modulationEnvelope: { attack: 0.5, decay: 0.2, sustain: 0.8, release: 2 }
      },
      volume: -16
    },
    // 统一使用原始温和音效
    stepSynth: {
      type: Tone.Synth,
      options: {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 1 }
      },
      volume: -10
    },
    mechanismSynth: {
      type: Tone.MonoSynth,
      options: {
        oscillator: { type: "sine" },
        envelope: { attack: 0.2, decay: 0.5, sustain: 0.8, release: 1.5 }
      },
      volume: -6
    },
    chordSettings: { duration: "1n", spacing: 0.15 }
  },

  // 3. 钢琴 (Celestial Piano)
  piano: {
    name: 'Celestial Piano',
    nameCN: '天界钢琴',
    mainSynth: {
      type: Tone.FMSynth,
      options: {
        harmonicity: 3,
        modulationIndex: 10,
        detune: 0,
        oscillator: { type: "sine" },
        envelope: { attack: 0.01, decay: 0.5, sustain: 0.3, release: 2 },
        modulation: { type: "sine" },
        modulationEnvelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.8 }
      },
      volume: -14
    },
    // 统一使用原始温和音效
    stepSynth: {
      type: Tone.Synth,
      options: {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 1 }
      },
      volume: -10
    },
    mechanismSynth: {
      type: Tone.MonoSynth,
      options: {
        oscillator: { type: "sine" },
        envelope: { attack: 0.2, decay: 0.5, sustain: 0.8, release: 1.5 }
      },
      volume: -6
    },
    chordSettings: { duration: "1n", spacing: 0.15 }
  },

  // 4. 管风琴 (原有音色 - Wind Organ)
  windOrgan: {
    name: 'Wind Organ',
    nameCN: '风之管乐',
    mainSynth: {
      type: Tone.FMSynth,
      options: {
        harmonicity: 2,
        modulationIndex: 6,
        detune: 0,
        oscillator: { type: "sine" },
        envelope: { attack: 0.05, decay: 0.3, sustain: 0.4, release: 2 },
        modulation: { type: "sine" },
        modulationEnvelope: { attack: 0.2, decay: 0.1, sustain: 0.5, release: 1 }
      },
      volume: -14
    },
    stepSynth: {
      type: Tone.Synth,
      options: {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 1 }
      },
      volume: -10
    },
    mechanismSynth: {
      type: Tone.MonoSynth,
      options: {
        oscillator: { type: "sine" },
        envelope: { attack: 0.2, decay: 0.5, sustain: 0.8, release: 1.5 }
      },
      volume: -6
    },
    chordSettings: { duration: "1n", spacing: 0.15 }
  }
};

class AudioService {
  private mainSynth: any = null;           // 主旋律合成器
  private stepSynth: any = null;           // 步行音效合成器
  private mechanismSynth: any = null;      // 机关音效合成器
  private noise: Tone.Noise | null = null;
  private reverb: Tone.Reverb | null = null;
  private delay: Tone.FeedbackDelay | null = null;
  private loop: Tone.Loop | null = null;
  private isInitialized = false;
  
  // 当前音色
  private currentTimbre: TimbreType = 'bells';
  private currentConfig: TimbreConfig = TIMBRE_CONFIGS.bells;

  // 五声音阶 - 保持空灵感
  private scale = ['Eb4', 'F4', 'G4', 'Bb4', 'C5', 'Eb5', 'F5', 'G5'];

  // 随机选择音色
  private selectRandomTimbre(): TimbreType {
    const timbres: TimbreType[] = ['bells', 'strings', 'piano', 'windOrgan'];
    return timbres[Math.floor(Math.random() * timbres.length)];
  }

  // 获取当前音色信息
  getTimbreInfo(): { type: TimbreType; name: string; nameCN: string } {
    return {
      type: this.currentTimbre,
      name: this.currentConfig.name,
      nameCN: this.currentConfig.nameCN
    };
  }

  async initialize() {
    if (this.isInitialized) return;

    await Tone.start();

    // 随机选择音色
    this.currentTimbre = this.selectRandomTimbre();
    this.currentConfig = TIMBRE_CONFIGS[this.currentTimbre];

    console.log(`🎵 音色已加载: ${this.currentConfig.nameCN} (${this.currentConfig.name})`);

    // FX Chain - 混响和延迟
    this.reverb = new Tone.Reverb({ decay: 8, wet: 0.6 }).toDestination();
    this.delay = new Tone.FeedbackDelay("4n", 0.4).connect(this.reverb);

    // 1. 环境噪音 (水流/风声)
    this.noise = new Tone.Noise("pink");
    const noiseFilter = new Tone.Filter(300, "lowpass").connect(this.reverb);
    this.noise.connect(noiseFilter);
    this.noise.volume.value = -28;
    const autoFilter = new Tone.AutoFilter("0.1hz").connect(noiseFilter);
    this.noise.connect(autoFilter);

    // 2. 创建主旋律合成器 (根据音色类型)
    const mainConfig = this.currentConfig.mainSynth;
    this.mainSynth = new Tone.PolySynth(mainConfig.type, mainConfig.options).connect(this.delay);
    this.mainSynth.volume.value = mainConfig.volume;

    // 3. 创建步行音效合成器 (统一使用原始配置)
    const stepConfig = this.currentConfig.stepSynth;
    this.stepSynth = new Tone.PolySynth(stepConfig.type, stepConfig.options).connect(this.reverb);
    this.stepSynth.volume.value = stepConfig.volume;

    // 4. 创建机关音效合成器 (统一使用原始配置)
    const mechConfig = this.currentConfig.mechanismSynth;
    this.mechanismSynth = new mechConfig.type(mechConfig.options).connect(this.reverb);
    this.mechanismSynth.volume.value = mechConfig.volume;

    this.isInitialized = true;
    this.startGenerativeAmbience();
  }

  startGenerativeAmbience() {
    if (!this.noise || !this.mainSynth) return;

    this.noise.start();

    // 生成式环境音乐循环
    this.loop = new Tone.Loop((time) => {
      // 不同音色不同的触发概率
      let probability = 0.6;
      if (this.currentTimbre === 'strings') probability = 0.5;      // 弦乐更稀疏
      if (this.currentTimbre === 'bells') probability = 0.65;       // 钟琴适中偏密集

      if (Math.random() > probability) {
        const note = this.scale[Math.floor(Math.random() * this.scale.length)];
        const duration = Math.random() > 0.5 ? "2n" : "1n";
        const velocity = 0.15 + Math.random() * 0.25;
        
        this.mainSynth?.triggerAttackRelease(note, duration, time, velocity);
      }
    }, "1n").start(0);

    Tone.getTransport().start();
  }

  playStep(stepIndex: number) {
    if (!this.stepSynth || !this.isInitialized) return;
    const note = this.scale[stepIndex % this.scale.length];
    // 统一使用温和的音效参数
    this.stepSynth.triggerAttackRelease(note, "8n", Tone.now(), 0.5);
  }

  playMechanism(type: 'rotate' | 'slide' | 'click') {
    if (!this.mechanismSynth || !this.isInitialized) return;
    
    // 统一使用原始的温和音效
    if (type === 'rotate') {
      this.mechanismSynth.triggerAttackRelease("Eb2", "2n");
    } else if (type === 'slide') {
      this.mechanismSynth.triggerAttackRelease("Bb2", "2n");
    }
  }

  playPortal() {
    if (!this.mainSynth || !this.isInitialized) return;
    const chord = ["Eb5", "G5", "Bb5", "Eb6"];
    const duration = this.currentConfig.chordSettings.duration;
    this.mainSynth.triggerAttackRelease(chord, duration);
  }

  playWin() {
    if (!this.mainSynth || !this.isInitialized) return;
    const now = Tone.now();
    const melody = ['Eb4', 'Bb4', 'Eb5', 'G5', 'Bb5', 'D6', 'Eb6'];
    const spacing = this.currentConfig.chordSettings.spacing;
    const duration = this.currentConfig.chordSettings.duration;
    
    melody.forEach((note, i) => {
      this.mainSynth?.triggerAttackRelease(note, duration, now + i * spacing);
    });
  }
}

export const audioService = new AudioService();