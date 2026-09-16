// Web Audio API Background Music & Sound Effects Engine
// Procedural, lightweight, zero-latency, no external dependencies

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isBgmPlaying: boolean = false;
  private isMuted: boolean = false;
  private bgmVolume: number = 0.35;
  private sfxVolume: number = 0.5;

  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  private bgmTimer: number | null = null;
  private currentStep: number = 0;
  private tempo: number = 108; // BPM

  constructor() {
    try {
      const savedMute = localStorage.getItem('GAME_BGM_MUTED');
      if (savedMute !== null) {
        this.isMuted = savedMute === 'true';
      }
      const savedVol = localStorage.getItem('GAME_BGM_VOLUME');
      if (savedVol !== null) {
        this.bgmVolume = Math.max(0, Math.min(1, parseFloat(savedVol)));
      }
    } catch {
      // Ignore in SSR
    }
  }

  private initContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.isMuted ? 0 : 1;
        this.masterGain.connect(this.ctx.destination);

        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.value = this.bgmVolume;
        this.bgmGain.connect(this.masterGain);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = this.sfxVolume;
        this.sfxGain.connect(this.masterGain);
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public getIsPlaying(): boolean {
    return this.isBgmPlaying;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getBgmVolume(): number {
    return this.bgmVolume;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    try {
      localStorage.setItem('GAME_BGM_MUTED', String(this.isMuted));
    } catch {
      // ignore
    }

    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime + 0.05;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(this.isMuted ? 0 : 1, now + 0.1);
    }

    // If unmuting and wasn't playing, start BGM
    if (!this.isMuted && !this.isBgmPlaying) {
      this.startBgm();
    }

    return this.isMuted;
  }

  public setBgmVolume(volume: number) {
    this.bgmVolume = Math.max(0, Math.min(1, volume));
    try {
      localStorage.setItem('GAME_BGM_VOLUME', String(this.bgmVolume));
    } catch {
      // ignore
    }

    if (this.bgmGain && this.ctx) {
      const now = this.ctx.currentTime + 0.05;
      this.bgmGain.gain.cancelScheduledValues(now);
      this.bgmGain.gain.setValueAtTime(this.bgmGain.gain.value, now);
      this.bgmGain.gain.linearRampToValueAtTime(this.bgmVolume, now + 0.1);
    }
  }

  public toggleBgm() {
    if (this.isBgmPlaying) {
      this.stopBgm();
    } else {
      this.startBgm();
    }
  }

  public startBgm() {
    this.initContext();
    if (!this.ctx) return;

    if (this.isBgmPlaying) return;
    this.isBgmPlaying = true;
    this.currentStep = 0;

    if (this.bgmGain) {
      const now = this.ctx.currentTime + 0.05;
      this.bgmGain.gain.cancelScheduledValues(now);
      this.bgmGain.gain.setValueAtTime(0, now);
      this.bgmGain.gain.linearRampToValueAtTime(this.bgmVolume, now + 0.5);
    }

    const stepDurationMs = (60 / this.tempo / 4) * 1000; // 16th notes
    this.bgmTimer = window.setInterval(() => {
      this.tickBgm();
    }, stepDurationMs);
  }

  public stopBgm() {
    this.isBgmPlaying = false;
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }

    if (this.bgmGain && this.ctx) {
      const now = this.ctx.currentTime + 0.05;
      this.bgmGain.gain.cancelScheduledValues(now);
      this.bgmGain.gain.setValueAtTime(this.bgmGain.gain.value, now);
      this.bgmGain.gain.linearRampToValueAtTime(0, now + 0.3);
    }
  }

  // Playful, cheerful, catchy musical sequence
  // 64 16th steps = 4 bars in 4/4 time
  private tickBgm() {
    if (!this.ctx || !this.bgmGain || !this.isBgmPlaying || this.isMuted) {
      this.currentStep = (this.currentStep + 1) % 64;
      return;
    }

    const step = this.currentStep;
    const now = this.ctx.currentTime + 0.05;

    // Melody notes (in Hz)
    // C4=261.63, D4=293.66, E4=329.63, G4=392.00, A4=440.00, C5=523.25, D5=587.33, E5=659.25, G5=783.99
    const C4 = 261.63, D4 = 293.66, E4 = 329.63, F4 = 349.23, G4 = 392.00, A4 = 440.00, B4 = 493.88;
    const C5 = 523.25, D5 = 587.33, E5 = 659.25, G5 = 783.99, A5 = 880.00;
    const C3 = 130.81, G3 = 196.00, A3 = 220.00, F3 = 174.61;

    // Bar 1: C Major (steps 0-15)
    // Bar 2: G Major (steps 16-31)
    // Bar 3: A Minor (steps 32-47)
    // Bar 4: F Major / G turnaround (steps 48-63)

    // Bassline (on beats 1 and 3.5)
    if (step === 0) this.playBass(C3, now);
    if (step === 10) this.playBass(C4, now);
    if (step === 16) this.playBass(G3, now);
    if (step === 26) this.playBass(D4, now);
    if (step === 32) this.playBass(A3, now);
    if (step === 42) this.playBass(E4, now);
    if (step === 48) this.playBass(F3, now);
    if (step === 56) this.playBass(G3, now);

    // Light percussion (soft high-hat click on every 8th note, kick on 1, snare on 2 & 4)
    if (step % 4 === 0) {
      // Beat 1, 2, 3, 4
      if (step % 16 === 0) {
        this.playSoftKick(now);
      } else if (step % 8 === 4) {
        this.playSoftSnare(now);
      }
    }
    if (step % 2 === 0) {
      this.playSoftHiHat(now);
    }

    // Cheerful Marimba Lead Melody
    const melodyMap: Record<number, number> = {
      // Bar 1 (C)
      0: C5, 4: E5, 8: G5, 12: A5, 14: G5,
      // Bar 2 (G)
      16: D5, 20: G5, 24: B4, 28: D5, 30: E5,
      // Bar 3 (Am)
      32: C5, 36: E5, 40: A5, 44: G5, 46: E5,
      // Bar 4 (F -> G)
      48: F4, 52: A4, 56: B4, 60: D5, 62: E5,
    };

    if (melodyMap[step]) {
      this.playMarimba(melodyMap[step], now);
    }

    // Counter harmony on off-beats
    const harmonyMap: Record<number, number> = {
      2: E4, 6: G4, 18: D4, 22: G4, 34: C4, 38: E4, 50: C4, 54: F4, 58: G4,
    };
    if (harmonyMap[step]) {
      this.playHarmony(harmonyMap[step], now);
    }

    this.currentStep = (this.currentStep + 1) % 64;
  }

  private playMarimba(freq: number, time: number) {
    if (!this.ctx || !this.bgmGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.18, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.28);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + 0.3);
  }

  private playHarmony(freq: number, time: number) {
    if (!this.ctx || !this.bgmGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.08, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.22);

    osc.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + 0.25);
  }

  private playBass(freq: number, time: number) {
    if (!this.ctx || !this.bgmGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.25, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

    osc.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + 0.38);
  }

  private playSoftHiHat(time: number) {
    if (!this.ctx || !this.bgmGain) return;

    // Filtered noise burst for delicate shaker / hi-hat
    const bufferSize = this.ctx.sampleRate * 0.03;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.03, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.025);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    noise.start(time);
    noise.stop(time + 0.03);
  }

  private playSoftKick(time: number) {
    if (!this.ctx || !this.bgmGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(130, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.08);

    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    osc.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + 0.13);
  }

  private playSoftSnare(time: number) {
    if (!this.ctx || !this.bgmGain) return;

    const bufferSize = this.ctx.sampleRate * 0.07;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    noise.start(time);
    noise.stop(time + 0.07);
  }

  // Sound Effects (SFX)
  public playPickup() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime + 0.05;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(560, now + 0.08);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playSwap() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime + 0.05;
    [480, 720].forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = now + idx * 0.05;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.07);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(startTime);
      osc.stop(startTime + 0.08);
    });
  }

  public playCorrect(streakCount: number = 0) {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime + 0.05;
    // Pleasant arpeggio: C5, E5, G5, C6
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + idx * 0.05;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.24, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.18);
    });

    // Voice cheer
    if (streakCount >= 5 && streakCount % 5 === 0) {
      this.playComboVoice(streakCount);
    } else {
      this.playRandomCorrectVoice();
    }
  }

  public playWrong() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime + 0.05;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(110, now + 0.22);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.24);

    // Voice encouragement
    this.playRandomWrongVoice();
  }

  public playToss() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime + 0.05;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.15);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playCombo() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime + 0.05;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + idx * 0.04;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.22);
    });
  }

  public playTick() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime + 0.05;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, now);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playGameOver() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime + 0.05;
    const chords = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    chords.forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + i * 0.09;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.5);
    });

    this.speak('หมดเวลาแล้ว เก่งมากๆ เลย!', 'event');
  }

  // --- Voice Feedback & Speech Synthesis ---
  private voiceListeners: Array<(event: { text: string; type: 'correct' | 'wrong' | 'combo' | 'event' }) => void> = [];

  public onVoice(listener: (event: { text: string; type: 'correct' | 'wrong' | 'combo' | 'event' }) => void) {
    this.voiceListeners.push(listener);
    return () => {
      this.voiceListeners = this.voiceListeners.filter((l) => l !== listener);
    };
  }

  private notifyVoice(text: string, type: 'correct' | 'wrong' | 'combo' | 'event') {
    this.voiceListeners.forEach((l) => l({ text, type }));
  }

  private correctPhrases = [
    'เย่!',
    'ยอดเยี่ยม!',
    'ถูกต้อง!',
    'เก่งมาก!',
    'เยี่ยมเลย!',
    'ถูกต้องแล้วจ้า!',
    'เป๊ะมาก!',
  ];

  private wrongPhrases = [
    'ยังไม่ถูกน้า',
    'เอาอีกที',
    'ลองใหม่อีกครั้งนะ',
    'เกือบถูกแล้ว สู้ๆ',
    'ลองดูใหม่อีกทีจ้า',
  ];

  public playRandomCorrectVoice() {
    const text = this.correctPhrases[Math.floor(Math.random() * this.correctPhrases.length)];
    this.speak(text, 'correct');
  }

  public playRandomWrongVoice() {
    const text = this.wrongPhrases[Math.floor(Math.random() * this.wrongPhrases.length)];
    this.speak(text, 'wrong');
  }

  public playComboVoice(count: number) {
    const text = `สุดยอด คอมโบ ${count} คำติด!`;
    this.playCombo();
    this.speak(text, 'combo');
  }

  public playStartVoice() {
    this.speak('เริ่มได้ ลุยเลย!', 'event');
  }

  public speak(text: string, type: 'correct' | 'wrong' | 'combo' | 'event' = 'event') {
    // Notify UI for floating speech bubble regardless of audio mute state
    this.notifyVoice(text, type);

    if (this.isMuted) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    try {
      // Cancel previous speech to keep audio snappy and real-time
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'th-TH';
      utterance.rate = 1.15; // lively, brisk rate for gaming
      utterance.pitch = 1.15; // cheerful, friendly pitch

      const voices = window.speechSynthesis.getVoices();
      const thaiVoice = voices.find((v) => v.lang.toLowerCase().includes('th'));
      if (thaiVoice) {
        utterance.voice = thaiVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch {
      // Fallback silently if browser blocks speech synthesis
    }
  }
}

export const soundEngine = new SoundEngine();
