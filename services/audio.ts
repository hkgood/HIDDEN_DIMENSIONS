
import * as Tone from 'tone';

class AudioService {
  private synth: Tone.PolySynth | null = null;
  private bassSynth: Tone.MonoSynth | null = null;
  private fmSynth: Tone.PolySynth | null = null; // New Ethereal Synth
  private noise: Tone.Noise | null = null;
  private reverb: Tone.Reverb | null = null;
  private delay: Tone.FeedbackDelay | null = null;
  private loop: Tone.Loop | null = null;
  private isInitialized = false;

  // Pentatonic scale for water theme (Eb Major Pentatonic)
  private scale = ['Eb4', 'F4', 'G4', 'Bb4', 'C5', 'Eb5', 'F5', 'G5'];

  async initialize() {
    if (this.isInitialized) return;

    await Tone.start();

    // FX Chain
    this.reverb = new Tone.Reverb({ decay: 8, wet: 0.6 }).toDestination();
    this.delay = new Tone.FeedbackDelay("4n", 0.4).connect(this.reverb);

    // 1. Wind/Water Texture (Filtered Noise)
    this.noise = new Tone.Noise("pink");
    const noiseFilter = new Tone.Filter(300, "lowpass").connect(this.reverb);
    this.noise.connect(noiseFilter);
    this.noise.volume.value = -28;
    // Auto-filter for movement (Ebb and flow)
    const autoFilter = new Tone.AutoFilter("0.1hz").connect(noiseFilter);
    this.noise.connect(autoFilter);

    // 2. Main Bell/Glass Synth (FM Synthesis)
    this.fmSynth = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 2,
      modulationIndex: 6,
      detune: 0,
      oscillator: { type: "sine" },
      envelope: { attack: 0.05, decay: 0.3, sustain: 0.4, release: 2 },
      modulation: { type: "sine" },
      modulationEnvelope: { attack: 0.2, decay: 0.1, sustain: 0.5, release: 1 }
    }).connect(this.delay);
    this.fmSynth.volume.value = -14;

    // 3. Player Movement Synth (Pluck/Droplet)
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 1 },
      volume: -10
    }).connect(this.reverb);

    // 4. Mechanism Bass
    this.bassSynth = new Tone.MonoSynth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.2, decay: 0.5, sustain: 0.8, release: 1.5 },
      volume: -6
    }).connect(this.reverb);

    this.isInitialized = true;
    this.startGenerativeAmbience();
  }

  startGenerativeAmbience() {
    if (!this.noise || !this.fmSynth) return;

    this.noise.start();

    // Generative Melody Loop
    this.loop = new Tone.Loop((time) => {
      if (Math.random() > 0.6) {
        // Pick a random note from the scale
        const note = this.scale[Math.floor(Math.random() * this.scale.length)];
        const duration = Math.random() > 0.5 ? "2n" : "1n";
        // Play with low velocity for softness
        this.fmSynth?.triggerAttackRelease(note, duration, time, 0.2 + Math.random() * 0.2);
      }
    }, "1n").start(0);

    Tone.getTransport().start();
  }

  playStep(stepIndex: number) {
    if (!this.synth || !this.isInitialized) return;
    // Walk up the scale
    const note = this.scale[stepIndex % this.scale.length];
    this.synth.triggerAttackRelease(note, "8n", Tone.now(), 0.5);
  }

  playMechanism(type: 'rotate' | 'slide' | 'click') {
    if (!this.bassSynth || !this.isInitialized) return;
    
    if (type === 'rotate') {
      this.bassSynth.triggerAttackRelease("Eb2", "2n");
    } else if (type === 'slide') {
      this.bassSynth.triggerAttackRelease("Bb2", "2n");
    }
  }

  playPortal() {
    if (!this.fmSynth || !this.isInitialized) return;
    this.fmSynth.triggerAttackRelease(["Eb5", "G5", "Bb5", "Eb6"], "1n");
  }

  playWin() {
    if (!this.fmSynth || !this.isInitialized) return;
    const now = Tone.now();
    ['Eb4', 'Bb4', 'Eb5', 'G5', 'Bb5', 'D6', 'Eb6'].forEach((note, i) => {
        this.fmSynth?.triggerAttackRelease(note, "1n", now + i * 0.15);
    });
  }
}

export const audioService = new AudioService();