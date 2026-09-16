import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trash2,
  RotateCcw,
  Play,
  CheckCircle,
  XCircle,
  Timer,
  Trophy,
  Grab,
  User,
  Medal,
  Home,
  Check,
  BookOpen,
  HelpCircle,
  FileText,
  Maximize,
  Minimize,
  AlertCircle,
  Undo2,
  ArrowLeftRight,
  Volume2,
  VolumeX,
  Music,
} from 'lucide-react';
import { categories, wordList } from './words';
import {
  TrashItem,
  LeaderboardEntry,
  QuizRecord,
} from './types';
import LeaderboardModal from './components/LeaderboardModal';
import GrammarGuideModal from './components/GrammarGuideModal';
import QuizModal from './components/QuizModal';
import { soundEngine } from './utils/soundEngine';
import {
  saveLeaderboardEntryToCloud,
  subscribeToLeaderboard,
  saveQuizRecordToCloud,
  subscribeToQuizRecords,
  clearAllLeaderboardFromCloud,
  clearAllQuizRecordsFromCloud,
} from './firebase';
import { initAuth, googleSignIn, logout } from './firebase';


const GAME_DURATION_SECONDS = 120; // 2 minutes
const LEADERBOARD_STORAGE_KEY = 'TRASH_NOUNS_LEADERBOARD_V3';
const PLAYER_NAME_STORAGE_KEY = 'TRASH_NOUNS_PLAYER_NAME_V3';

// Clear legacy mock data and old leaderboard keys once
try {
  localStorage.removeItem('TRASH_NOUNS_LEADERBOARD');
  localStorage.removeItem('TRASH_NOUNS_LEADERBOARD_V2');
  const legacyName = localStorage.getItem('TRASH_NOUNS_PLAYER_NAME_V2');
  if (legacyName === 'กิตติศักดิ์ พงษ์ศิริ') {
    localStorage.removeItem('TRASH_NOUNS_PLAYER_NAME_V2');
  }
} catch {
  // Ignore in SSR / private browsing
}

const trashVisuals = [
  { emoji: '📄', bg: 'bg-gray-100 border-gray-300 text-gray-800 rounded-sm' },
  { emoji: '📦', bg: 'bg-amber-700 text-amber-50 border-amber-900 rounded-md border-b-4' },
  { emoji: '🥫', bg: 'bg-zinc-300 text-zinc-900 border-zinc-500 rounded-full px-4' },
  { emoji: '📰', bg: 'bg-orange-50 text-gray-900 border-gray-400 font-serif italic' },
  { emoji: '🏷️', bg: 'bg-yellow-100 text-yellow-900 border-yellow-500 border-dashed rounded-lg' },
  { emoji: '🥤', bg: 'bg-red-500 text-white border-red-700 rounded-t-md rounded-b-xl border-t-4' },
  { emoji: '🧻', bg: 'bg-white text-gray-800 border-gray-200 rounded-full border-2' },
  { emoji: '🛍️', bg: 'bg-green-600 text-white border-green-800 rounded-b-lg border-t-2' },
];

function shuffleArray<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

let availableWords: typeof wordList = [];

function getNextWord() {
  if (availableWords.length === 0) {
    // True Fisher-Yates shuffle across all 131 words in the deck
    availableWords = shuffleArray(wordList);
  }
  return availableWords.pop()!;
}

function generateSingleTrash(): TrashItem {
  const word = getNextWord();
  const style = trashVisuals[Math.floor(Math.random() * trashVisuals.length)];
  
  // Natural distribution across the pile yard (5% to 75% X, 6% to 70% Y)
  const targetX = Math.max(4, Math.min(74, 4 + Math.random() * 70));
  const targetY = Math.max(6, Math.min(70, 6 + Math.random() * 64));
  const slideStartX = targetX + (-25 + Math.random() * 50);
  const slideStartY = -100 - Math.random() * 60;
  const exitSides: ('left' | 'right' | 'bottom')[] = ['left', 'right', 'bottom'];
  const chosenExit = exitSides[Math.floor(Math.random() * exitSides.length)];

  return {
    id: Math.random().toString(36).substring(2, 9),
    text: word.text,
    category: word.category,
    explanation: (word as any).explanation,
    isTrap: (word as any).isTrap,
    x: targetX,
    y: targetY,
    rotation: -18 + Math.random() * 36,
    emoji: style.emoji,
    bgClass: style.bg,
    startX: slideStartX,
    startY: slideStartY,
    exitDirection: chosenExit,
    zIndex: Math.floor(Math.random() * 20) + 10,
  };
}

function generateInitialPile(count: number): TrashItem[] {
  const pile: TrashItem[] = [];
  for (let i = 0; i < count; i++) {
    pile.push(generateSingleTrash());
  }
  return pile;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function App() {
  const [gameState, setGameState] = useState<'start' | 'playing' | 'end'>('start');
  const [playerName, setPlayerName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(PLAYER_NAME_STORAGE_KEY);
      if (saved && saved !== 'กิตติศักดิ์ พงษ์ศิริ') return saved;
    } catch {
      // ignore
    }
    return '';
  });
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_SECONDS);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [trashPile, setTrashPile] = useState<TrashItem[]>([]);
  const [selectedTrash, setSelectedTrash] = useState<TrashItem | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [animatingCategory, setAnimatingCategory] = useState<string | null>(null);

  // Leaderboard state: starts 100% empty - records new players as they play
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => {
    try {
      const stored = localStorage.getItem(LEADERBOARD_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [latestEntryId, setLatestEntryId] = useState<string | null>(null);
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const [trickExplanation, setTrickExplanation] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [streak, setStreak] = useState<number>(0);
  const [voiceBanner, setVoiceBanner] = useState<{
    id: number;
    text: string;
    type: 'correct' | 'wrong' | 'combo' | 'event';
  } | null>(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(() => soundEngine.getIsPlaying());
  const [isMuted, setIsMuted] = useState<boolean>(() => soundEngine.getIsMuted());
  const [bgmVolume, setBgmVolume] = useState<number>(() => soundEngine.getBgmVolume());
  const [needsAuth, setNeedsAuth] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<any | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const unsub = initAuth(
      (u, t) => {
        setAuthUser(u);
        setToken(t);
        setNeedsAuth(false);
      },
      () => setNeedsAuth(true)
    );
    return () => unsub();
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setAuthUser(result.user);
        setNeedsAuth(false);
      }
    } catch (err) {
      console.error("Login failed:", err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setAuthUser(null);
    setToken(null);
    setNeedsAuth(true);
  };

  // Listen to voice speech events from soundEngine
  useEffect(() => {
    const unsub = soundEngine.onVoice((event) => {
      setVoiceBanner({
        id: Date.now(),
        text: event.text,
        type: event.type,
      });
    });
    return unsub;
  }, []);

  // Automatically dismiss floating voice banner after duration
  useEffect(() => {
    if (!voiceBanner) return;
    const timer = setTimeout(() => {
      setVoiceBanner((current) => (current?.id === voiceBanner.id ? null : current));
    }, 2200);
    return () => clearTimeout(timer);
  }, [voiceBanner]);

  const handleToggleMusic = () => {
    if (isMuted) {
      soundEngine.toggleMute();
      setIsMuted(false);
      soundEngine.startBgm();
      setIsMusicPlaying(true);
    } else if (!isMusicPlaying) {
      soundEngine.startBgm();
      setIsMusicPlaying(true);
    } else {
      soundEngine.toggleMute();
      setIsMuted(true);
      setIsMusicPlaying(false);
    }
  };

  // Synchronize fullscreen state with document events
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else if ((document.documentElement as any).webkitRequestFullscreen) {
          await (document.documentElement as any).webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen request error:', err);
    }
  };

  // Quiz history state recorded by player name
  const [quizHistory, setQuizHistory] = useState<QuizRecord[]>(() => {
    try {
      const stored = localStorage.getItem('TRASH_NOUNS_QUIZ_HISTORY_V1');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  // Subscribe to real-time Cloud Firestore updates
  useEffect(() => {
    // 1. Sync global leaderboard from cloud
    const unsubscribeLeaderboard = subscribeToLeaderboard((cloudEntries) => {
      if (cloudEntries && cloudEntries.length > 0) {
        setLeaderboard(cloudEntries);
        try {
          localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(cloudEntries));
        } catch {
          // ignore
        }
      }
    });

    // 2. Sync global quiz records from cloud
    const unsubscribeQuiz = subscribeToQuizRecords((cloudQuizRecords) => {
      if (cloudQuizRecords && cloudQuizRecords.length > 0) {
        setQuizHistory(cloudQuizRecords);
        try {
          localStorage.setItem('TRASH_NOUNS_QUIZ_HISTORY_V1', JSON.stringify(cloudQuizRecords));
        } catch {
          // ignore
        }
      }
    });

    return () => {
      unsubscribeLeaderboard();
      unsubscribeQuiz();
    };
  }, []);

  const handleSaveQuizRecord = (record: QuizRecord) => {
    // Optimistic local state update
    setQuizHistory((prev) => {
      const next = [record, ...prev];
      try {
        localStorage.setItem('TRASH_NOUNS_QUIZ_HISTORY_V1', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });

    // Save to Firebase Cloud Firestore for all players
    saveQuizRecordToCloud({
      playerName: record.playerName,
      score: record.score,
      totalQuestions: record.totalQuestions,
      percentage: record.percentage,
      date: record.date,
      answers: record.answers,
    });
  };

  const handleClearQuizRecords = async () => {
    setQuizHistory([]);
    try {
      localStorage.removeItem('TRASH_NOUNS_QUIZ_HISTORY_V1');
    } catch {
      // ignore
    }
    try {
      await clearAllQuizRecordsFromCloud();
    } catch (e) {
      console.warn('Failed to clear quiz records from cloud:', e);
    }
  };

  // Save player name when edited
  const handlePlayerNameChange = (name: string) => {
    setPlayerName(name);
    try {
      localStorage.setItem(PLAYER_NAME_STORAGE_KEY, name);
    } catch {
      // ignore
    }
  };

  // Timer effect for 2 minutes with audio ticks and 10s warning
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState === 'playing' && timeLeft > 0) {
      if (timeLeft === 10) {
        soundEngine.speak('เร็วเข้า เหลือ ๑๐ วินาทีสุดท้าย!', 'event');
      } else if (timeLeft <= 5 && timeLeft > 0) {
        soundEngine.playTick();
      }
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (gameState === 'playing' && timeLeft === 0) {
      handleGameEnd();
    }
    return () => clearTimeout(timer);
  }, [timeLeft, gameState]);

  // Trash spawning: creates a real overflowing pile feeling.
  // Spawns rapidly enough to fill the pile up to 14-16 items.
  // When it overflows beyond 14 items, older items slide off the sides like a real overflowing heap!
  useEffect(() => {
    let spawnInterval: NodeJS.Timeout;
    if (gameState === 'playing') {
      spawnInterval = setInterval(() => {
        setTrashPile((prev) => {
          const newItem = generateSingleTrash();
          // If the pile is already overflowing (> 14 items), the oldest item naturally slides out of the screen
          if (prev.length >= 14) {
            return [...prev.slice(1), newItem];
          }
          return [...prev, newItem];
        });
      }, 2000); // Steady flow of trash (every 2 seconds) creating an authentic garbage yard flow
    }
    return () => clearInterval(spawnInterval);
  }, [gameState]);

  const handleGameEnd = () => {
    setGameState('end');
    soundEngine.stopBgm();
    setIsMusicPlaying(false);
    soundEngine.playGameOver();
    const cleanName = playerName.trim() || 'ผู้เล่น';
    const now = new Date();
    const formattedDate = now.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

    const newEntry: LeaderboardEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      playerName: cleanName,
      score,
      correctCount,
      wrongCount,
      date: formattedDate,
    };

    setLatestEntryId(newEntry.id);

    // Save to Cloud Firestore for shared leaderboard
    saveLeaderboardEntryToCloud({
      playerName: newEntry.playerName,
      score: newEntry.score,
      correctCount: newEntry.correctCount,
      wrongCount: newEntry.wrongCount,
      date: newEntry.date,
    });

    setLeaderboard((prev) => {
      const updated = [...prev, newEntry].sort((a, b) => b.score - a.score).slice(0, 100);
      try {
        localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // storage quota exceeded or private mode
      }

      const rankIndex = updated.findIndex((item) => item.id === newEntry.id);
      setPlayerRank(rankIndex !== -1 ? rankIndex + 1 : null);
      return updated;
    });
  };

  const handleClearLeaderboard = async () => {
    setLeaderboard([]);
    try {
      localStorage.removeItem(LEADERBOARD_STORAGE_KEY);
    } catch {
      // ignore
    }
    setLatestEntryId(null);
    setPlayerRank(null);
    try {
      await clearAllLeaderboardFromCloud();
    } catch (e) {
      console.warn('Failed to clear leaderboard from cloud:', e);
    }
  };

  const startGame = () => {
    const cleanName = playerName.trim() || 'ผู้เล่น';
    handlePlayerNameChange(cleanName);
    setScore(0);
    setCorrectCount(0);
    setWrongCount(0);
    setStreak(0);
    setTimeLeft(GAME_DURATION_SECONDS); // 120 seconds
    setTrashPile(generateInitialPile(6)); // Start with just 6 items for a clean, spacious look
    setSelectedTrash(null);
    setLatestEntryId(null);
    setPlayerRank(null);
    setGameState('playing');

    // Automatically start lively background music if not muted
    if (!isMuted) {
      soundEngine.startBgm();
      setIsMusicPlaying(true);
    }
    soundEngine.playStartVoice();
  };

  const handleSelectTrash = (item: TrashItem) => {
    if (animatingCategory) return;
    
    soundEngine.playPickup();

    // If the user already has a trash item picked up, return it back to the pile
    // so they can freely switch to another piece of trash (e.g. if they suspect it's a trick word)
    if (selectedTrash) {
      const returnTargetX = Math.max(5, Math.min(68, 5 + Math.random() * 63));
      const returnTargetY = Math.max(8, Math.min(68, 8 + Math.random() * 60));
      const previousSelected: TrashItem = {
        ...selectedTrash,
        x: returnTargetX,
        y: returnTargetY,
        startX: returnTargetX,
        startY: -40,
      };
      setTrashPile((prev) => [...prev.filter((i) => i.id !== item.id), previousSelected]);
    } else {
      setTrashPile((prev) => prev.filter((i) => i.id !== item.id));
    }

    setSelectedTrash(item);
    setTrickExplanation(null);
  };

  const handleReturnSelectedToPile = () => {
    if (!selectedTrash || animatingCategory) return;
    soundEngine.playSwap();
    const returnTargetX = Math.max(5, Math.min(68, 5 + Math.random() * 63));
    const returnTargetY = Math.max(8, Math.min(68, 8 + Math.random() * 60));
    const returnedItem: TrashItem = {
      ...selectedTrash,
      x: returnTargetX,
      y: returnTargetY,
      startX: returnTargetX,
      startY: -40,
    };
    setTrashPile((prev) => [...prev, returnedItem]);
    setSelectedTrash(null);
    setTrickExplanation(null);
  };

  const handleGuess = (categoryId: string) => {
    if (!selectedTrash || animatingCategory || gameState !== 'playing') return;

    const isCorrect = selectedTrash.category === categoryId;
    setAnimatingCategory(categoryId);
    setFeedback(isCorrect ? 'correct' : 'wrong');
    soundEngine.playToss();

    if (isCorrect) {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      soundEngine.playCorrect(nextStreak);

      const streakBonus = nextStreak >= 5 ? 5 : nextStreak >= 3 ? 2 : 0;
      setScore((s) => s + 10 + streakBonus);
      setCorrectCount((c) => c + 1);
      if (selectedTrash.isTrap) {
        setTrickExplanation(`เก่งมาก! "${selectedTrash.text}" เป็นคำนามสามัญ (ไม่หลงกลอาการนาม)`);
      } else {
        setTrickExplanation(null);
      }
    } else {
      setStreak(0);
      soundEngine.playWrong();
      setScore((s) => Math.max(0, s - 5));
      setWrongCount((w) => w + 1);

      // Provide clear feedback on trick words and classification errors
      if (selectedTrash.explanation) {
        setTrickExplanation(`⚠️ ระวังคำหลอก! "${selectedTrash.text}": ${selectedTrash.explanation}`);
      } else if (selectedTrash.category === 'common' && categoryId === 'abstract') {
        setTrickExplanation(`⚠️ ข้อควรระวัง: "${selectedTrash.text}" เป็นคำนามสามัญทั่วไป ไม่ใช่คำอาการนาม`);
      } else if (selectedTrash.category === 'abstract' && categoryId === 'common') {
        setTrickExplanation(`💡 ข้อสังเกต: "${selectedTrash.text}" เกิดจากการ/ความ นำหน้ากริยาหรือวิเศษณ์ จึงเป็นคำอาการนาม`);
      } else {
        const targetCat = categories.find((c) => c.id === selectedTrash.category);
        setTrickExplanation(`💡 คำว่า "${selectedTrash.text}" จัดอยู่ในประเภท: ${targetCat?.label || 'คำนามอีกประเภท'}`);
      }
    }

    setTimeout(() => {
      if (!isCorrect) {
        // Put it back in the pile safely with sliding trajectory
        const newTargetX = Math.max(5, Math.min(68, 5 + Math.random() * 63));
        const newTargetY = Math.max(8, Math.min(68, 8 + Math.random() * 60));
        setTrashPile((prev) => [
          ...prev,
          {
            ...selectedTrash,
            x: newTargetX,
            y: newTargetY,
            startX: newTargetX + (-15 + Math.random() * 30),
            startY: -80,
            rotation: -18 + Math.random() * 36,
          },
        ]);
      }
      setAnimatingCategory(null);
      setFeedback(null);
      setSelectedTrash(null);
    }, 700);
  };

  return (
    <div className="w-full h-[100dvh] max-h-[100dvh] min-h-[100dvh] bg-gradient-to-br from-amber-50 via-orange-50/60 to-emerald-50/40 flex flex-col font-sans overflow-hidden select-none relative">
      {/* Decorative ambient background accents */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-orange-200/30 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/3 -right-24 w-80 h-80 bg-blue-200/25 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-24 left-1/4 w-96 h-96 bg-emerald-200/25 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header - Glassmorphic, Modern & Ultra-Clear Labels */}
      <header className="flex-shrink-0 w-full max-w-5xl mx-auto px-2 py-1 sm:px-4 sm:py-2 flex flex-wrap sm:flex-nowrap justify-between items-center gap-1 sm:gap-2 z-20">
        {/* Left Side: Score & Player Info */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Logo Badge */}
          <div className="hidden md:flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-2.5 py-1 rounded-full shadow-xs text-xs font-black tracking-wide">
            <span>🗑️</span>
            <span>คุ้ยขยะคำนาม</span>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 bg-white/95 backdrop-blur-md px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full shadow-xs border border-orange-200/90">
            <Trophy className="text-amber-500 flex-shrink-0" size={15} />
            <span className="text-[11px] sm:text-xs font-bold text-gray-500">คะแนน</span>
            <span className="text-sm sm:text-base font-black text-orange-600 font-mono min-w-[20px]">{score}</span>
          </div>

          <div className="flex items-center gap-1 bg-white/85 backdrop-blur-md px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-full shadow-xs border border-orange-200/70 text-[11px] sm:text-xs text-gray-700 font-bold max-w-[85px] sm:max-w-[140px] truncate">
            <User size={12} className="text-orange-500 flex-shrink-0" />
            <span className="truncate">{playerName.trim() || 'ผู้เล่น'}</span>
          </div>

          <div className="flex items-center gap-1 bg-white/95 backdrop-blur-md px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-full shadow-xs border border-orange-200">
            <Timer className={timeLeft < 15 ? 'text-red-500 animate-pulse' : 'text-blue-500'} size={14} />
            <span
              className={`text-xs sm:text-sm font-black font-mono ${
                timeLeft < 15 ? 'text-red-600 animate-pulse' : 'text-gray-800'
              }`}
            >
              {formatTime(timeLeft)}
            </span>
          </div>

          {gameState === 'playing' && streak >= 2 && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1 bg-gradient-to-r from-amber-500 to-rose-500 text-white px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full shadow-xs text-[10px] sm:text-xs font-black animate-pulse"
            >
              <span>🔥</span>
              <span>{streak} คอมโบ</span>
            </motion.div>
          )}
        </div>

        {/* Right Side: Feature Navigation Buttons with Clear Names & Icons */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* 1. รอบรู้คำนาม */}
          <button
            id="open-guide-btn"
            onClick={() => setIsGuideOpen(true)}
            className="flex items-center gap-1 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95 whitespace-nowrap"
            title="เปิดอ่านคู่มือความรู้เรื่องคำนาม ๔ ชนิด"
          >
            <BookOpen size={13} className="flex-shrink-0" />
            <span>รอบรู้คำนาม</span>
          </button>

          {/* 2. แบบทดสอบ ๒๐ ข้อ */}
          <button
            id="open-quiz-btn"
            onClick={() => setIsQuizOpen(true)}
            className="flex items-center gap-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95 whitespace-nowrap"
            title="ทำแบบทดสอบวัดความรู้ ๒๐ ข้อ"
          >
            <FileText size={13} className="flex-shrink-0" />
            <span>แบบทดสอบ</span>
          </button>

          {/* 3. ตารางอันดับ */}
          <button
            id="open-leaderboard-btn"
            onClick={() => setIsLeaderboardOpen(true)}
            className="flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95 whitespace-nowrap"
            title="ดูตารางอันดับและประวัติการเล่น"
          >
            <Medal size={13} className="flex-shrink-0" />
            <span>อันดับ</span>
          </button>

          {/* 4. เสียงแบ็กกราวนด์และเอฟเฟกต์ */}
          <button
            id="toggle-bgm-btn"
            onClick={handleToggleMusic}
            className={`flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold shadow-xs transition-all cursor-pointer border active:scale-95 whitespace-nowrap ${
              !isMuted && isMusicPlaying
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 ring-1 ring-emerald-400/40'
                : 'bg-white hover:bg-gray-100 text-gray-600 border-gray-200'
            }`}
            title={!isMuted && isMusicPlaying ? 'ปิดเสียงแบ็กกราวนด์' : 'เปิดเสียงแบ็กกราวนด์'}
            aria-label={!isMuted && isMusicPlaying ? 'ปิดเสียง' : 'เปิดเสียง'}
          >
            {!isMuted && isMusicPlaying ? (
              <>
                <Volume2 size={13} className="text-emerald-600 animate-pulse flex-shrink-0" />
                <span>เสียง: เปิด</span>
              </>
            ) : (
              <>
                <VolumeX size={13} className="text-gray-400 flex-shrink-0" />
                <span>เสียง: ปิด</span>
              </>
            )}
          </button>

          {/* 5. ปุ่มเต็มจอพร้อมชื่อกำกับชัดเจน */}
          <button
            id="toggle-fullscreen-btn"
            onClick={toggleFullscreen}
            className="flex items-center gap-1 bg-white hover:bg-orange-50 text-gray-800 hover:text-orange-700 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold shadow-xs transition-all cursor-pointer border border-orange-200 active:scale-95 whitespace-nowrap"
            title={isFullscreen ? 'ย่อหน้าต่างกลับคืน' : 'ขยายหน้าจอเต็ม (Full Screen)'}
            aria-label={isFullscreen ? 'ย่อหน้าจอ' : 'ขยายเต็มจอ'}
          >
            {isFullscreen ? (
              <>
                <Minimize size={13} className="text-orange-600 flex-shrink-0" />
                <span>ย่อจอ</span>
              </>
            ) : (
              <>
                <Maximize size={13} className="text-orange-600 flex-shrink-0" />
                <span>เต็มจอ</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Content - Flex-1 with zero overflow risk */}
      <main className="flex-1 w-full max-w-5xl mx-auto flex flex-col justify-between p-1 sm:p-2.5 overflow-hidden min-h-0 relative z-10">
        <AnimatePresence mode="wait">
          {gameState === 'start' && (
            <motion.div
              key="start"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              className="bg-white/95 backdrop-blur-md p-5 sm:p-7 md:p-8 rounded-3xl shadow-2xl max-w-lg w-[94vw] mx-auto text-center z-50 my-auto border-2 border-orange-200/80 max-h-[92dvh] overflow-y-auto"
            >
              {/* Header Icon Graphic */}
              <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-amber-100 to-orange-100 rounded-3xl shadow-inner mb-3 border border-orange-200">
                <span className="text-4xl sm:text-5xl animate-bounce">🗑️</span>
                <span className="text-3xl sm:text-4xl -ml-2 animate-pulse">✨</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-800 mb-1 leading-tight tracking-tight">
                เกมคุ้ยขยะหาคำนาม ๔ ชนิด
              </h1>
              <p className="text-orange-700 text-xs sm:text-sm font-semibold mb-2">
                สื่อการเรียนรู้ภาษาไทยแสนสนุก • สะสมแต้มขึ้นกระดานออนไลน์
              </p>
              <p className="text-gray-600 mb-4 text-xs sm:text-sm leading-relaxed max-w-md mx-auto">
                ขยะคำนามจะตกลงมาในกองอย่างต่อเนื่อง! คุ้ยเลือกคำนามแล้วแยกทิ้งลงถังให้ถูกต้องระวังคำหลอกอาการนาม สะสมคะแนนใน <b>2 นาที</b>
              </p>

              {/* 4 Category Preview Pills */}
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mb-4 text-left">
                {categories.map((c) => (
                  <div
                    key={c.id}
                    className={`p-2 rounded-xl border ${c.border} ${c.bg} flex items-center gap-2 shadow-2xs`}
                  >
                    <span className="text-lg flex-shrink-0">{c.binIcon}</span>
                    <div className="min-w-0">
                      <div className="font-black text-xs text-gray-800 truncate">{c.label}</div>
                      <div className="text-[10px] text-gray-600 truncate">{c.sublabel}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Player Name Input */}
              <div className="text-left mb-4 bg-orange-50/80 p-3 sm:p-3.5 rounded-2xl border border-orange-200">
                <label
                  htmlFor="player-name-input"
                  className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5"
                >
                  <User size={14} className="text-orange-600" /> ชื่อผู้เล่น (สำหรับบันทึกคะแนนคลาวด์)
                </label>
                <input
                  id="player-name-input"
                  type="text"
                  value={playerName}
                  onChange={(e) => handlePlayerNameChange(e.target.value)}
                  placeholder="พิมพ์ชื่อของคุณที่นี่..."
                  maxLength={35}
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-orange-300 focus:border-orange-500 focus:bg-white focus:outline-none font-bold text-gray-800 bg-white shadow-inner text-sm sm:text-base transition-colors"
                />
                <p className="mt-1 text-[11px] text-gray-500">
                  💡 บันทึกคะแนนและประวัติการเล่นซิงค์ออนไลน์อัตโนมัติ
                </p>
              </div>

              {/* Sound / Background Music Status Banner */}
              <div className="flex items-center justify-between px-3.5 py-2 bg-amber-50/90 rounded-2xl border border-amber-200 mb-3.5 text-xs text-left">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-200/80 rounded-xl text-amber-900">
                    <Music size={15} />
                  </div>
                  <div>
                    <div className="font-bold text-amber-950 flex items-center gap-1.5">
                      <span>เสียงดนตรีแบ็กกราวนด์</span>
                      {!isMuted && isMusicPlaying && (
                        <span className="text-[9px] bg-emerald-500 text-white font-black px-1.5 py-0.2 rounded-full animate-pulse">
                          เล่นอยู่
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-amber-800">ดนตรีน่ารักสดใส เพิ่มบรรยากาศการเรียนรู้</div>
                  </div>
                </div>

                <button
                  type="button"
                  id="start-screen-music-toggle"
                  onClick={handleToggleMusic}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95 ${
                    !isMuted && isMusicPlaying
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : isMuted
                      ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      : 'bg-amber-500 hover:bg-amber-600 text-white'
                  }`}
                >
                  {!isMuted && isMusicPlaying ? (
                    <>
                      <Volume2 size={14} />
                      <span>เปิดเสียงอยู่</span>
                    </>
                  ) : (
                    <>
                      <VolumeX size={14} />
                      <span>เปิดเสียงดนตรี</span>
                    </>
                  )}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  id="start-game-btn"
                  onClick={startGame}
                  className="w-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white text-base sm:text-lg font-black py-3 sm:py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-orange-500/30 cursor-pointer border-b-4 border-orange-700"
                >
                  <Play fill="currentColor" size={18} /> เริ่มเกมคุ้ยขยะ (2 นาที)
                </button>

                <button
                  id="open-quiz-start-btn"
                  onClick={() => setIsQuizOpen(true)}
                  className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-sm sm:text-base font-bold py-2.5 sm:py-3 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-indigo-500/20 cursor-pointer border-b-4 border-indigo-800"
                >
                  <FileText size={17} /> ทำแบบทดสอบรอบรู้คำนาม (๒๐ ข้อ)
                </button>

                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <button
                    id="view-guide-start-btn"
                    onClick={() => setIsGuideOpen(true)}
                    className="w-full bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 font-bold py-2 sm:py-2.5 rounded-2xl flex items-center justify-center gap-1 text-xs transition-colors cursor-pointer active:scale-95"
                  >
                    <BookOpen size={14} className="text-blue-600 flex-shrink-0" /> รอบรู้เรื่องคำนาม
                  </button>

                  <button
                    id="view-rankings-start-btn"
                    onClick={() => setIsLeaderboardOpen(true)}
                    className="w-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold py-2 sm:py-2.5 rounded-2xl flex items-center justify-center gap-1 text-xs transition-colors cursor-pointer active:scale-95"
                  >
                    <Medal size={14} className="text-amber-600 flex-shrink-0" /> ตารางอันดับ & สถิติ
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {gameState === 'playing' && (
            <motion.div
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full flex flex-col justify-between overflow-hidden min-h-0"
            >
              {/* Baskets (Top) - High Polish Bins with 3D feel and clear targets */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 sm:gap-2.5 w-full px-1 flex-shrink-0">
                {categories.map((c) => (
                  <motion.button
                    key={c.id}
                    id={`bin-${c.id}`}
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.95 }}
                    animate={
                      animatingCategory === c.id
                        ? feedback === 'correct'
                          ? { scale: [1, 1.08, 1], rotate: [0, -4, 4, 0] }
                          : { x: [-4, 4, -4, 4, 0] }
                        : {}
                    }
                    onClick={() => handleGuess(c.id)}
                    disabled={!selectedTrash || !!animatingCategory}
                    className={`relative p-1.5 sm:p-2.5 md:p-3 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center gap-0.5 sm:gap-1 border-2 sm:border-3 ${c.border} ${c.bg} shadow-sm transition-all overflow-hidden cursor-pointer ${
                      !selectedTrash || animatingCategory
                        ? 'opacity-85 cursor-not-allowed filter grayscale-[20%]'
                        : 'hover:shadow-md active:scale-95 ring-2 ring-transparent hover:ring-white'
                    }`}
                  >
                    {/* Top colored lip/handle representing bin lid */}
                    <div className="w-full flex items-center justify-between px-1">
                      <span className="text-[11px] sm:text-xs md:text-sm font-black text-gray-500/70 font-mono leading-none">
                        {c.binIcon}
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-white/80 text-gray-700 shadow-2xs leading-tight">
                        ถังขยะ
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-center">
                      <Trash2 size={16} className={`${c.icon} flex-shrink-0 drop-shadow-2xs sm:w-5 sm:h-5`} />
                      <span className="font-black text-xs sm:text-sm md:text-base text-gray-900 leading-tight">
                        {c.label}
                      </span>
                    </div>

                    {c.hint && (
                      <span className="text-[8px] sm:text-[10px] text-gray-600 bg-white/70 px-1 py-0.2 sm:px-1.5 sm:py-0.5 rounded-md text-center leading-none truncate max-w-full font-medium">
                        {c.hint}
                      </span>
                    )}

                    {/* Interactive pulsating glow when an item is selected */}
                    {selectedTrash && !animatingCategory && (
                      <div className="absolute inset-0 border-2 border-dashed border-orange-400/50 rounded-xl sm:rounded-2xl pointer-events-none animate-pulse"></div>
                    )}
                  </motion.button>
                ))}
              </div>

              {/* Character and Inspection Area (Middle) - Compact to allow large trash pile without scrolling */}
              <div className="flex-1 flex flex-col items-center justify-center w-full relative min-h-[85px] sm:min-h-[120px] my-0.5 sm:my-1">
                {/* Floating Animated Mascot Voice Speech Bubble */}
                <AnimatePresence>
                  {voiceBanner && (
                    <motion.div
                      key={voiceBanner.id}
                      initial={{ opacity: 0, scale: 0.6, y: 15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.7, y: -12 }}
                      transition={{ type: 'spring', bounce: 0.4 }}
                      className={`absolute -top-3.5 sm:-top-4.5 z-40 px-3.5 py-1 sm:px-4 sm:py-1.5 rounded-full shadow-lg border-2 font-black text-xs sm:text-sm flex items-center gap-1.5 pointer-events-none select-none ${
                        voiceBanner.type === 'correct'
                          ? 'bg-emerald-500 text-white border-white shadow-emerald-500/30'
                          : voiceBanner.type === 'wrong'
                          ? 'bg-rose-500 text-white border-white shadow-rose-500/30'
                          : voiceBanner.type === 'combo'
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-white shadow-orange-500/40'
                          : 'bg-indigo-600 text-white border-white shadow-indigo-500/30'
                      }`}
                    >
                      <span className="text-sm sm:text-base leading-none">
                        {voiceBanner.type === 'correct'
                          ? '🎉'
                          : voiceBanner.type === 'wrong'
                          ? '😅'
                          : voiceBanner.type === 'combo'
                          ? '🔥'
                          : '📢'}
                      </span>
                      <span className="tracking-wide drop-shadow-xs">{voiceBanner.text}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Robot/Guide Mascot */}
                <div className="text-4xl sm:text-7xl select-none absolute opacity-20 sm:opacity-80 z-0 transition-all pointer-events-none animate-float-slow">
                  {selectedTrash ? '🧐' : '🤖'}
                </div>

                <div className="z-20 flex flex-col items-center justify-center w-full px-2">
                  <AnimatePresence mode="wait">
                    {!selectedTrash ? (
                      <motion.div
                        key="prompt"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="bg-white/95 backdrop-blur-md px-3.5 py-1.5 sm:px-5 sm:py-2 rounded-full text-gray-800 font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-md border-2 border-orange-300 animate-pulse-glow"
                      >
                        <Grab size={14} className="text-orange-500" />
                        <span>แตะคุ้ยขยะในกองด้านล่างขึ้นมาดู!</span>
                      </motion.div>
                    ) : (
                      <motion.div
                        key={selectedTrash.id}
                        initial={{ opacity: 0, y: 30, scale: 0.6 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{
                          opacity: 0,
                          scale: feedback === 'correct' ? 0.3 : 1,
                          y: feedback === 'correct' ? -90 : 40,
                        }}
                        transition={{ type: 'spring', bounce: 0.35 }}
                        className={`px-4 py-2 sm:px-7 sm:py-3.5 shadow-2xl rounded-2xl sm:rounded-3xl border-2 sm:border-3 flex flex-col items-center justify-center min-w-[150px] sm:min-w-[220px] max-w-[90vw] ${selectedTrash.bgClass} relative`}
                      >
                        <div className="text-2xl sm:text-4xl filter drop-shadow-sm leading-none mb-0.5">{selectedTrash.emoji}</div>
                        <h2 className="text-lg sm:text-2xl md:text-3xl font-black text-center break-words max-w-full text-gray-900 tracking-tight">
                          {selectedTrash.text}
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="text-[9px] sm:text-[11px] text-gray-700 font-bold bg-white/80 px-2 py-0.5 rounded-full shadow-2xs">
                            👆 แตะถังขยะด้านบนเพื่อทิ้ง
                          </div>
                          {/* Swap/Put Back Button: Lets the player return this item if they think it's a trap or want to change */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReturnSelectedToPile();
                            }}
                            className="bg-amber-100 hover:bg-amber-200 active:scale-95 text-amber-900 font-bold text-[9px] sm:text-[11px] px-2 py-0.5 rounded-full border border-amber-300 shadow-2xs flex items-center gap-1 transition-all cursor-pointer"
                            title="วางคืนลงกอง หรือแตะขยะชิ้นอื่นในกองด้านล่างเพื่อเปลี่ยนชิ้นได้เลย!"
                          >
                            <Undo2 size={11} className="text-amber-700" />
                            <span>เปลี่ยนชิ้น</span>
                          </button>
                        </div>

                        {feedback === 'correct' && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute -top-2.5 -right-2.5 bg-emerald-500 text-white rounded-full p-1 shadow-lg flex items-center gap-0.5 px-2 text-[11px] sm:text-xs font-black border-2 border-white"
                          >
                            <CheckCircle size={14} /> +10
                          </motion.div>
                        )}
                        {feedback === 'wrong' && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute -top-2.5 -right-2.5 bg-rose-500 text-white rounded-full p-1 shadow-lg flex items-center gap-0.5 px-2 text-[11px] sm:text-xs font-black border-2 border-white"
                          >
                            <XCircle size={14} /> -5
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Dynamic Learning & Trick Word Feedback Banner */}
                  <AnimatePresence>
                    {trickExplanation && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="mt-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-bold shadow-md flex items-center gap-1.5 max-w-[95vw] border border-amber-300 backdrop-blur-md text-center leading-tight z-30"
                      >
                        <AlertCircle size={15} className="text-yellow-200 flex-shrink-0" />
                        <span>{trickExplanation}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Trash Pile (Bottom) - Lush garbage yard with realistic chute and sliding physics */}
              <div className="w-full h-52 sm:h-64 md:h-72 bg-gradient-to-b from-[#e8d5bc] via-[#dfc7a7] to-[#d4b791] rounded-t-3xl sm:rounded-t-4xl border-t-6 sm:border-t-8 border-[#a98a60] relative overflow-hidden flex-shrink-0 shadow-[inset_0_4px_16px_rgba(0,0,0,0.15)]">
                {/* Chute entrance / Wood/Ground rim accent */}
                <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-b from-[#6e5332] to-[#8c6b41]/40 flex justify-center items-center z-10 pointer-events-none">
                  <div className="w-32 sm:w-44 h-1.5 bg-[#4a361e]/60 rounded-full"></div>
                </div>

                {/* Conveyor chute guide line indicator */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-56 sm:w-72 h-7 bg-orange-950/10 rounded-b-2xl border-b border-dashed border-orange-900/30 pointer-events-none flex items-center justify-center">
                  <span className="text-[9px] sm:text-[10px] text-amber-950/60 font-black tracking-wide flex items-center gap-1.5">
                    <ArrowLeftRight size={11} className="text-amber-800" />
                    <span>ขยะกองรวม & ไหลล้น • แตะสลับชิ้นได้</span>
                  </span>
                </div>

                {/* Texture overlay */}
                <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>

                {/* Live count badge & Overflow indicator */}
                <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5">
                  {trashPile.length >= 12 && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: [1, 1.08, 1], opacity: 1 }}
                      transition={{ repeat: Infinity, duration: 1.2 }}
                      className="bg-rose-500/90 text-white text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1 border border-white/40"
                    >
                      <span>⚠️ ขยะล้นกอง!</span>
                    </motion.div>
                  )}
                  <div className="bg-orange-950/30 backdrop-blur-xs text-orange-950 text-[11px] sm:text-xs px-2.5 py-0.5 sm:py-1 rounded-full font-bold pointer-events-none border border-orange-950/10 flex items-center gap-1 shadow-2xs">
                    <span>🗑️ ในกอง:</span>
                    <span className="font-mono font-black">{trashPile.length}</span>
                    <span>ชิ้น</span>
                  </div>
                </div>

                <AnimatePresence>
                  {trashPile.map((item) => {
                    // Determine slide-off exit trajectory when garbage overflows or gets picked
                    const exitX =
                      item.exitDirection === 'left'
                        ? -140
                        : item.exitDirection === 'right'
                        ? 140
                        : 0;
                    const exitY = item.exitDirection === 'bottom' ? 140 : 40;

                    return (
                      <motion.div
                        key={item.id}
                        id={`trash-item-${item.id}`}
                        initial={{
                          opacity: 0,
                          x: (item.startX ?? item.x) - item.x,
                          y: item.startY ?? -90,
                          scale: 0.7,
                          rotate: item.rotation * 2,
                        }}
                        animate={{
                          opacity: 1,
                          x: 0,
                          y: 0,
                          scale: 1,
                          rotate: item.rotation,
                        }}
                        transition={{
                          type: 'spring',
                          damping: 14,
                          stiffness: 110,
                          mass: 0.8,
                        }}
                        exit={{
                          opacity: 0,
                          x: exitX,
                          y: exitY,
                          scale: 0.85,
                          rotate: item.rotation + (exitX > 0 ? 30 : -30),
                          transition: { duration: 0.45, ease: 'easeOut' },
                        }}
                        whileHover={{ scale: 1.15, zIndex: 50, rotate: 0 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => handleSelectTrash(item)}
                        className={`absolute cursor-pointer shadow-md hover:shadow-xl transition-shadow border-2 px-2.5 py-1.5 sm:px-3 sm:py-2 flex items-center gap-1.5 max-w-[125px] sm:max-w-[150px] touch-manipulation select-none rounded-2xl active:scale-95 ${item.bgClass}`}
                        style={{
                          left: `${item.x}%`,
                          top: `${item.y}%`,
                          zIndex: item.zIndex || 20,
                        }}
                      >
                        <span className="text-lg sm:text-xl pointer-events-none drop-shadow-xs flex-shrink-0">
                          {item.emoji}
                        </span>
                        <span className="font-black select-none text-[11px] sm:text-xs pointer-events-none truncate tracking-tight text-gray-900">
                          {item.text}
                        </span>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {trashPile.length === 0 && !selectedTrash && (
                  <div className="absolute inset-0 flex items-center justify-center text-orange-900/60 font-bold text-sm sm:text-base animate-pulse">
                    กำลังลำเลียงขยะชิ้นใหม่ลงราง... 🚛
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {gameState === 'end' && (
            <motion.div
              key="end"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white/95 backdrop-blur-md p-5 sm:p-7 md:p-8 rounded-3xl shadow-2xl max-w-md w-[94vw] mx-auto text-center z-50 my-auto border-2 border-orange-200 max-h-[92dvh] overflow-y-auto"
            >
              <div className="text-4xl sm:text-5xl mb-2">🏆</div>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-800 mb-1">หมดเวลา 2 นาที!</h2>
              <p className="text-gray-500 mb-3 text-xs sm:text-sm">
                บันทึกคะแนนของ <span className="font-bold text-orange-600">{playerName}</span> เรียบร้อย
              </p>

              {/* Rank Banner */}
              {playerRank && (
                <div className="mb-4 bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-300 rounded-2xl py-2 px-3 flex items-center justify-center gap-1.5 text-orange-950 font-black text-sm sm:text-base shadow-xs">
                  <Medal className="text-amber-600 flex-shrink-0" size={20} />
                  <span>ติดอันดับที่ #{playerRank} ในตารางคะแนน!</span>
                </div>
              )}

              {/* Score Display */}
              <div className="bg-gradient-to-b from-orange-50 to-amber-50/70 rounded-3xl p-4 border-2 border-orange-200/80 mb-3 shadow-inner">
                <div className="text-xs text-orange-800 font-black mb-0.5 tracking-wide">คะแนนรวมที่ได้</div>
                <div className="text-5xl sm:text-6xl font-black text-orange-500 mb-2 font-mono tracking-tight drop-shadow-xs">{score}</div>

                <div className="grid grid-cols-2 gap-2 text-xs font-black pt-2.5 border-t border-orange-200/70">
                  <div className="bg-emerald-100 text-emerald-800 py-1.5 px-2 rounded-xl flex items-center justify-center gap-1 border border-emerald-200">
                    <Check size={14} className="stroke-[3]" /> ถูก {correctCount} คำ
                  </div>
                  <div className="bg-rose-100 text-rose-800 py-1.5 px-2 rounded-xl flex items-center justify-center gap-1 border border-rose-200">
                    <XCircle size={14} className="stroke-[2.5]" /> ผิด {wrongCount} คำ
                  </div>
                </div>
              </div>

              {/* Scrollable Leaderboard on End Screen */}
              {leaderboard.length > 0 && (
                <div className="mb-3 text-left bg-orange-50/80 rounded-2xl p-2.5 sm:p-3 border border-orange-200">
                  <div className="flex items-center justify-between mb-1.5 px-1">
                    <span className="text-xs font-black text-orange-950 flex items-center gap-1">
                      <Trophy size={14} className="text-amber-500" />
                      <span>อันดับ ๑ ๒ ๓ & เลื่อนดูคะแนน ↕️</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsLeaderboardOpen(true)}
                      className="text-[11px] font-bold text-orange-700 hover:text-orange-900 cursor-pointer flex items-center gap-0.5"
                    >
                      ดูเต็มจอ ({leaderboard.length})
                    </button>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 custom-scrollbar pr-1 overscroll-contain">
                    {leaderboard.map((item, idx) => {
                      const isCurrent = item.id === latestEntryId;
                      const rank = idx + 1;
                      const badge =
                        rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
                      return (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between py-1 px-2 rounded-xl text-xs transition-colors ${
                            isCurrent
                              ? 'bg-amber-100 border border-amber-300 font-black text-orange-950 shadow-2xs'
                              : rank <= 3
                              ? 'bg-white border border-amber-200/80 font-bold text-gray-800'
                              : 'bg-white/70 border border-orange-100 text-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="w-6 text-center font-bold flex-shrink-0">{badge}</span>
                            <span className="truncate">{item.playerName}</span>
                            {isCurrent && (
                              <span className="text-[9px] bg-amber-500 text-white font-bold px-1.5 py-0.2 rounded-full">
                                คุณ
                              </span>
                            )}
                          </div>
                          <span className="font-mono font-black text-orange-600 pl-2 flex-shrink-0">
                            {item.score}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2">
                <button
                  id="play-again-btn"
                  onClick={startGame}
                  className="w-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white text-base font-black py-3 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-orange-500/25 cursor-pointer border-b-4 border-orange-700"
                >
                  <RotateCcw size={17} /> เล่นอีกครั้ง (2 นาที)
                </button>

                <button
                  id="open-quiz-end-btn"
                  onClick={() => setIsQuizOpen(true)}
                  className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold py-2.5 rounded-2xl flex items-center justify-center gap-1.5 text-xs sm:text-sm transition-all active:scale-95 shadow-md shadow-indigo-500/20 cursor-pointer border-b-4 border-indigo-800"
                >
                  <FileText size={16} /> ทำแบบทดสอบวัดความรู้ (๒๐ ข้อ)
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    id="view-leaderboard-end-btn"
                    onClick={() => setIsLeaderboardOpen(true)}
                    className="bg-amber-100/90 hover:bg-amber-200 text-amber-900 font-bold py-2.5 rounded-xl flex items-center justify-center gap-1 text-xs sm:text-sm transition-colors cursor-pointer border border-amber-300 active:scale-95"
                  >
                    <Trophy size={15} className="text-amber-600" /> สถิติ & อันดับ
                  </button>

                  <button
                    id="view-guide-end-btn"
                    onClick={() => setIsGuideOpen(true)}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold py-2.5 rounded-xl flex items-center justify-center gap-1 text-xs sm:text-sm transition-colors cursor-pointer border border-blue-200 active:scale-95"
                  >
                    <BookOpen size={15} className="text-blue-600" /> รอบรู้เรื่องคำนาม
                  </button>
                </div>

                <button
                  id="back-home-btn"
                  onClick={() => setGameState('start')}
                  className="w-full bg-white hover:bg-gray-50 text-gray-700 font-bold py-2 rounded-xl flex items-center justify-center gap-1 text-xs sm:text-sm transition-colors cursor-pointer border border-gray-200 active:scale-95 shadow-2xs"
                >
                  <Home size={15} /> กลับหน้าแรก / เปลี่ยนชื่อ
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Leaderboard Modal */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        entries={leaderboard}
        quizRecords={quizHistory}
        currentEntryId={latestEntryId}
        onClear={handleClearLeaderboard}
        onClearQuizRecords={handleClearQuizRecords}
      />

      {/* Grammar Guide Modal */}
      <GrammarGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      {/* Quiz Modal */}
      <QuizModal
        isOpen={isQuizOpen}
        onClose={() => setIsQuizOpen(false)}
        playerName={playerName}
        onSaveRecord={handleSaveQuizRecord}
        quizHistory={quizHistory}
        onOpenGrammarGuide={() => {
          setIsQuizOpen(false);
          setIsGuideOpen(true);
        }}
      />
    </div>
  );
}




