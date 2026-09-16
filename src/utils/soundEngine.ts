// Sound & Voice Audio Engine for แยกขยะคำนาม ๔ ชนิด
// Combines real background music (with fallback CDN) and Web Audio SFX + Thai Speech Synthesis

class SoundEngine {
  private bgmAudio: HTMLAudioElement | null = null;
  private bgmSources: string[] = [];
  private currentSourceIdx: number = 0;
  private isBgmPlaying: boolean = false;
  private isMuted: boolean = false;
  private bgmVolume: number = 0.5;
  private sfxVolume: number = 0.6;

  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

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

    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        this.initContext();
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
        if (this.isBgmPlaying && !this.isMuted && this.bgmAudio && this.bgmAudio.paused) {
          this.bgmAudio.play().catch(() => {});
        }
      };

      window.addEventListener('click', unlockAudio, { passive: true });
      window.addEventListener('touchstart', unlockAudio, { passive: true });
      window.addEventListener('keydown', unlockAudio, { passive: true });
    }
  }

  private initBgmAudio() {
    if (typeof window === 'undefined') return;
    if (this.bgmAudio) return;

    try {
      const base = (import.meta as any).env?.BASE_URL || '/';
      const cleanBase = base.endsWith('/') ? base : base + '/';

      const isGoogleScript = typeof window !== 'undefined' && 
        (window.location.hostname.includes('google') || window.location.hostname.includes('googleusercontent'));

      const cdnUrl = 'https://upload.wikimedia.org/wikipedia/commons/transcoded/1/1b/The_Entertainer_-_Scott_Joplin.ogg/The_Entertainer_-_Scott_Joplin.ogg.mp3';

      // Chain of local assets and high-availability online fallback
      if (isGoogleScript) {
        this.bgmSources = [
          cdnUrl,
          `${cleanBase}audio/bgm.mp3`,
          `${cleanBase}bgm.mp3`,
          './audio/bgm.mp3',
          './bgm.mp3',
        ];
      } else {
        this.bgmSources = [
          `${cleanBase}audio/bgm.mp3`,
          `${cleanBase}bgm.mp3`,
          './audio/bgm.mp3',
          './bgm.mp3',
          '/audio/bgm.mp3',
          '/bgm.mp3',
          cdnUrl,
        ];
      }
      this.currentSourceIdx = 0;

      const audio = new Audio();
      audio.loop = true;
      audio.volume = this.isMuted ? 0 : this.bgmVolume;
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';

      audio.src = this.bgmSources[0];

      // Handle fallback if first audio path fails
      audio.addEventListener('error', () => {
        if (this.currentSourceIdx < this.bgmSources.length - 1) {
          this.currentSourceIdx++;
          audio.src = this.bgmSources[this.currentSourceIdx];
          if (this.isBgmPlaying && !this.isMuted) {
            audio.play().catch(() => {});
          }
        }
      });

      this.bgmAudio = audio;
    } catch (err) {
      console.warn('Failed to initialize BGM audio element:', err);
    }
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.isMuted ? 0 : 1;
        this.masterGain.connect(this.ctx.destination);

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

    if (this.bgmAudio) {
      this.bgmAudio.volume = this.isMuted ? 0 : this.bgmVolume;
      if (this.isMuted) {
        this.bgmAudio.pause();
      } else if (this.isBgmPlaying) {
        this.bgmAudio.play().catch(() => {});
      }
    }

    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, now);
    }

    // If unmuting while playing flag was active, trigger playback
    if (!this.isMuted && this.isBgmPlaying) {
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

    if (this.bgmAudio) {
      this.bgmAudio.volume = this.isMuted ? 0 : this.bgmVolume;
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
    this.initBgmAudio();
    this.isBgmPlaying = true;

    if (this.isMuted) return;

    if (this.bgmAudio) {
      this.bgmAudio.volume = this.bgmVolume;
      const playPromise = this.bgmAudio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('BGM play deferred until user interaction:', err);
          const handleResume = () => {
            if (this.isBgmPlaying && !this.isMuted && this.bgmAudio) {
              this.bgmAudio.play().catch(() => {});
            }
            window.removeEventListener('click', handleResume);
            window.removeEventListener('touchstart', handleResume);
          };
          window.addEventListener('click', handleResume, { once: true, passive: true });
          window.addEventListener('touchstart', handleResume, { once: true, passive: true });
        });
      }
    }
  }

  public stopBgm() {
    this.isBgmPlaying = false;
    if (this.bgmAudio) {
      this.bgmAudio.pause();
    }
  }

  // Sound Effects (SFX) via Web Audio API
  public playPickup() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

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

    const now = this.ctx.currentTime;
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

    const now = this.ctx.currentTime;
    // Pleasant musical chime: C5, E5, G5, C6
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + idx * 0.05;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.18);
    });

    // Voice encouragement
    if (streakCount >= 5 && streakCount % 5 === 0) {
      this.playComboVoice(streakCount);
    } else {
      this.playRandomCorrectVoice();
    }
  }

  public playWrong() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(110, now + 0.22);

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.24);

    this.playRandomWrongVoice();
  }

  public playToss() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
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

    const now = this.ctx.currentTime;
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

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, now);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playGameOver() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const chords = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    chords.forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + i * 0.09;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.2, t);
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
    this.notifyVoice(text, type);

    if (this.isMuted) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'th-TH';
      utterance.rate = 1.15;
      utterance.pitch = 1.15;

      const voices = window.speechSynthesis.getVoices();
      const thaiVoice = voices.find((v) => v.lang.toLowerCase().includes('th'));
      if (thaiVoice) {
        utterance.voice = thaiVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch {
      // Fallback silently if speech is blocked
    }
  }
}

export const soundEngine = new SoundEngine();
