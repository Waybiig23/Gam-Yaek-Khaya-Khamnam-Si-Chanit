import { useState, useRef, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy,
  X,
  Trash2,
  Calendar,
  Medal,
  FileText,
  User,
  Cloud,
  ChevronDown,
  ArrowDown,
  Lock,
  ShieldAlert,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
} from 'lucide-react';
import { LeaderboardEntry, QuizRecord } from '../types';
import { soundEngine } from '../utils/soundEngine';

const OWNER_PASSCODE = '237280';

const normalizePasscode = (val: string): string => {
  const thaiMap: Record<string, string> = {
    '๐': '0', '๑': '1', '๒': '2', '๓': '3', '๔': '4',
    '๕': '5', '๖': '6', '๗': '7', '๘': '8', '๙': '9',
  };
  return val
    .replace(/[๐-๙]/g, (ch) => thaiMap[ch] || ch)
    .replace(/[^0-9]/g, '')
    .trim();
};

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: LeaderboardEntry[];
  quizRecords?: QuizRecord[];
  currentEntryId?: string | null;
  onClear: () => void | Promise<void>;
  onClearQuizRecords?: () => void | Promise<void>;
  initialTab?: 'game' | 'quiz';
}

export default function LeaderboardModal({
  isOpen,
  onClose,
  entries,
  quizRecords = [],
  currentEntryId,
  onClear,
  onClearQuizRecords,
  initialTab = 'game',
}: LeaderboardModalProps) {
  const [activeTab, setActiveTab] = useState<'game' | 'quiz'>(initialTab);
  const [authModalTarget, setAuthModalTarget] = useState<'game' | 'quiz' | null>(null);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccessState, setIsSuccessState] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const currentRankIndex = entries.findIndex((e) => e.id === currentEntryId);
  const currentRank = currentRankIndex !== -1 ? currentRankIndex + 1 : null;

  const scrollToCurrentPlayer = () => {
    if (currentEntryId) {
      const el = document.getElementById(`leaderboard-item-${currentEntryId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const handleOpenPasscodeModal = (target: 'game' | 'quiz') => {
    setAuthModalTarget(target);
    setPasscodeInput('');
    setPasscodeError(null);
    setIsSuccessState(false);
    setIsDeleting(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleClosePasscodeModal = () => {
    if (isSuccessState || isDeleting) return;
    setAuthModalTarget(null);
    setPasscodeInput('');
    setPasscodeError(null);
    setIsDeleting(false);
  };

  const handleVerifyAndClear = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (isSuccessState || isDeleting) return;

    const normalized = normalizePasscode(passcodeInput);

    if (normalized === OWNER_PASSCODE) {
      setIsSuccessState(true);
      setIsDeleting(true);
      setPasscodeError(null);
      soundEngine.playCorrect();

      try {
        if (authModalTarget === 'game') {
          await onClear();
          setToastMessage('✅ ล้างประวัติเกมสำเร็จเรียบร้อย');
        } else if (authModalTarget === 'quiz' && onClearQuizRecords) {
          await onClearQuizRecords();
          setToastMessage('✅ ล้างประวัติแบบทดสอบสำเร็จเรียบร้อย');
        }
      } catch (err) {
        console.error('Failed to clear records:', err);
      } finally {
        setIsDeleting(false);
        setIsSuccessState(false);
        setAuthModalTarget(null);
        setPasscodeInput('');
        setTimeout(() => setToastMessage(null), 3500);
      }
    } else {
      soundEngine.playWrong();
      setPasscodeError('❌ รหัสผ่านไม่ถูกต้อง! เฉพาะเจ้าของเกมเท่านั้นที่สามารถล้างประวัติได้');
      inputRef.current?.focus();
    }
  };

  const handleDigitPress = (digit: string) => {
    if (isSuccessState || isDeleting) return;
    if (passcodeInput.length < 10) {
      setPasscodeInput((prev) => prev + digit);
      setPasscodeError(null);
    }
  };

  const handleBackspace = () => {
    if (isSuccessState || isDeleting) return;
    setPasscodeInput((prev) => prev.slice(0, -1));
    setPasscodeError(null);
  };

  const handleClearInput = () => {
    if (isSuccessState || isDeleting) return;
    setPasscodeInput('');
    setPasscodeError(null);
  };

  return (
    <div
      id="leaderboard-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs"
    >
      <motion.div
        id="leaderboard-modal-card"
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        className="relative w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border-2 border-orange-100 flex flex-col max-h-[90dvh] select-none"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 sm:px-6 sm:py-3.5 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 bg-white/20 rounded-xl">
              <Trophy className="text-yellow-200" size={22} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-lg sm:text-xl font-black leading-tight">ตารางอันดับและคะแนน</h2>
                <span className="flex items-center gap-0.5 text-[9px] sm:text-[10px] bg-emerald-500/80 text-white font-bold px-1.5 py-0.5 rounded-full shadow-xs">
                  <Cloud size={10} /> คลาวด์ออนไลน์
                </span>
              </div>
              <p className="text-orange-100 text-[11px] sm:text-xs">จัดอันดับยอดฝีมือภาษาไทย • เลื่อนดูคะแนนทั้งหมดได้</p>
            </div>
          </div>
          <button
            id="close-leaderboard-btn"
            onClick={onClose}
            aria-label="ปิด"
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 bg-orange-50/60 p-1 gap-1 flex-shrink-0">
          <button
            id="tab-game-leaderboard"
            onClick={() => setActiveTab('game')}
            className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'game'
                ? 'bg-white text-orange-700 shadow-xs border border-orange-200'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Medal size={15} className={activeTab === 'game' ? 'text-amber-500' : ''} />
            <span>เกมคุ้ยขยะ ({entries.length} อันดับ)</span>
          </button>

          <button
            id="tab-quiz-history"
            onClick={() => setActiveTab('quiz')}
            className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'quiz'
                ? 'bg-white text-indigo-700 shadow-xs border border-indigo-200'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText size={15} className={activeTab === 'quiz' ? 'text-indigo-600' : ''} />
            <span>แบบทดสอบ ๒๐ ข้อ ({quizRecords.length})</span>
          </button>
        </div>

        {/* Scroll Subheader & Quick Jump Banner */}
        {activeTab === 'game' && entries.length > 0 && (
          <div className="bg-amber-50/80 px-4 py-1.5 border-b border-amber-200/70 flex items-center justify-between text-xs text-amber-900 font-bold flex-shrink-0">
            <div className="flex items-center gap-1 text-[11px] sm:text-xs">
              <span>🏆 อันดับ ๑ ๒ ๓ ยอดเยี่ยม</span>
              <span className="text-amber-400">•</span>
              <span className="text-amber-800 font-medium flex items-center gap-0.5">
                เลื่อนดูทั้งหมด <ChevronDown size={13} className="animate-bounce" />
              </span>
            </div>

            {currentRank && (
              <button
                type="button"
                onClick={scrollToCurrentPlayer}
                className="bg-amber-200/90 hover:bg-amber-300 active:scale-95 text-amber-950 font-black text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full border border-amber-400/80 flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                title="เลื่อนไปยังคะแนนของคุณ"
              >
                <span>อันดับของคุณ: #{currentRank}</span>
                <ArrowDown size={11} />
              </button>
            )}
          </div>
        )}

        {/* Scrollable List Content */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 min-h-0 custom-scrollbar overscroll-contain"
        >
          {activeTab === 'game' ? (
            entries.length === 0 ? (
              <div className="py-10 text-center text-gray-400">
                <Medal className="mx-auto mb-2 opacity-40" size={40} />
                <p className="text-base font-bold text-gray-500">ยังไม่มีประวัติคะแนนเกม</p>
                <p className="text-xs">ทุกคนสามารถเริ่มเล่นเกมเพื่อบันทึกชื่อเป็นคนแรกได้เลย!</p>
              </div>
            ) : (
              entries.map((item, index) => {
                const isCurrent = item.id === currentEntryId;
                const rank = index + 1;

                // Rank 1, 2, 3 specialized styling that was commended by user
                let rankBadge = (
                  <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-100 text-gray-600 font-bold flex items-center justify-center text-xs sm:text-sm flex-shrink-0 border border-gray-200">
                    #{rank}
                  </span>
                );
                let rowStyle = isCurrent
                  ? 'bg-amber-50 border-amber-400 shadow-sm ring-2 ring-amber-400/40'
                  : 'bg-white border-gray-100 hover:bg-orange-50/40';

                let rankLabel: string | null = null;

                if (rank === 1) {
                  rankBadge = (
                    <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-amber-950 font-black flex items-center justify-center text-base sm:text-lg shadow-sm flex-shrink-0 border-2 border-amber-300">
                      🥇
                    </span>
                  );
                  rowStyle = isCurrent
                    ? 'bg-gradient-to-r from-amber-100/90 to-yellow-100/90 border-2 border-amber-400 shadow-md ring-2 ring-amber-400/50'
                    : 'bg-gradient-to-r from-amber-50 to-yellow-50/60 border-2 border-amber-300/80 hover:border-amber-400 shadow-2xs';
                  rankLabel = 'ชนะเลิศอันดับ ๑';
                } else if (rank === 2) {
                  rankBadge = (
                    <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-slate-300 to-slate-200 text-slate-900 font-black flex items-center justify-center text-base sm:text-lg shadow-sm flex-shrink-0 border-2 border-slate-300">
                      🥈
                    </span>
                  );
                  rowStyle = isCurrent
                    ? 'bg-gradient-to-r from-slate-100 to-gray-100 border-2 border-slate-400 shadow-md ring-2 ring-slate-400/50'
                    : 'bg-gradient-to-r from-slate-50 to-gray-50/70 border-2 border-slate-200 hover:border-slate-300 shadow-2xs';
                  rankLabel = 'รองชนะเลิศอันดับ ๑';
                } else if (rank === 3) {
                  rankBadge = (
                    <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-amber-600 to-amber-500 text-white font-black flex items-center justify-center text-base sm:text-lg shadow-sm flex-shrink-0 border-2 border-amber-600">
                      🥉
                    </span>
                  );
                  rowStyle = isCurrent
                    ? 'bg-gradient-to-r from-orange-100/90 to-amber-100/90 border-2 border-amber-500 shadow-md ring-2 ring-amber-500/50'
                    : 'bg-gradient-to-r from-orange-50 to-amber-50/70 border-2 border-amber-200 hover:border-amber-300 shadow-2xs';
                  rankLabel = 'รองชนะเลิศอันดับ ๒';
                }

                return (
                  <motion.div
                    key={item.id}
                    id={`leaderboard-item-${item.id}`}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(index * 0.015, 0.25) }}
                    className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border transition-all ${rowStyle}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      {rankBadge}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-gray-900 text-xs sm:text-sm truncate">
                            {item.playerName}
                          </span>
                          {rankLabel && (
                            <span className="text-[9px] sm:text-[10px] font-bold text-amber-900 bg-amber-200/80 px-1.5 py-0.2 rounded-md flex-shrink-0">
                              {rankLabel}
                            </span>
                          )}
                          {isCurrent && (
                            <span className="text-[9px] sm:text-[10px] bg-amber-500 text-white font-bold px-1.5 py-0.2 rounded-full flex-shrink-0">
                              รอบของคุณ
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-gray-500 truncate mt-0.5">
                          <Calendar size={11} className="flex-shrink-0 text-gray-400" />
                          <span className="truncate">{item.date}</span>
                          <span>•</span>
                          <span className="text-emerald-700 font-bold flex-shrink-0">ถูก {item.correctCount}</span>
                          <span className="text-rose-600 font-bold flex-shrink-0">ผิด {item.wrongCount}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 pl-1">
                      <span className="text-lg sm:text-xl md:text-2xl font-black text-orange-600 font-mono">
                        {item.score}
                      </span>
                      <span className="text-[10px] sm:text-xs text-gray-500 block font-bold">คะแนน</span>
                    </div>
                  </motion.div>
                );
              })
            )
          ) : (
            quizRecords.length === 0 ? (
              <div className="py-10 text-center text-gray-400">
                <FileText className="mx-auto mb-2 opacity-40 text-indigo-400" size={40} />
                <p className="text-base font-bold text-gray-500">ยังไม่มีประวัติแบบทดสอบ</p>
                <p className="text-xs">กด "แบบทดสอบ ๒๐ ข้อ" เพื่อเริ่มวัดความรู้และบันทึกคะแนน</p>
              </div>
            ) : (
              quizRecords.map((item, index) => (
                <div
                  key={item.id || index}
                  className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-gray-100 bg-white hover:bg-indigo-50/40 transition-all"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-bold text-gray-800 text-xs sm:text-sm flex items-center gap-1.5 truncate">
                      <User size={13} className="text-indigo-500 flex-shrink-0" />
                      <span className="truncate">{item.playerName}</span>
                    </div>
                    <div className="text-[10px] sm:text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Calendar size={11} /> {item.date}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-base sm:text-lg font-black text-indigo-700">
                      {item.score} / {item.totalQuestions}
                    </div>
                    <div className="text-[10px] text-gray-500 font-bold">
                      {item.percentage}%
                    </div>
                  </div>
                </div>
              ))
            )
          )}
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-emerald-700 text-white font-bold text-xs sm:text-sm px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 border border-emerald-500">
            <CheckCircle2 size={16} />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
          {activeTab === 'game' && entries.length > 0 ? (
            <button
              id="clear-leaderboard-btn"
              onClick={() => handleOpenPasscodeModal('game')}
              className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-rose-50 border border-rose-200/80 transition-colors cursor-pointer"
              title="เฉพาะผู้ดูแลระบบหรือเจ้าของเกม"
            >
              <Lock size={13} className="text-rose-500" />
              <span>ล้างประวัติเกม (เฉพาะเจ้าของ)</span>
            </button>
          ) : activeTab === 'quiz' && quizRecords.length > 0 && onClearQuizRecords ? (
            <button
              id="clear-quiz-history-btn"
              onClick={() => handleOpenPasscodeModal('quiz')}
              className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-rose-50 border border-rose-200/80 transition-colors cursor-pointer"
              title="เฉพาะผู้ดูแลระบบหรือเจ้าของเกม"
            >
              <Lock size={13} className="text-rose-500" />
              <span>ล้างประวัติแบบทดสอบ (เฉพาะเจ้าของ)</span>
            </button>
          ) : (
            <div className="text-[11px] text-gray-400 font-medium">
              แสดงทั้งหมด {entries.length} อันดับ
            </div>
          )}

          <button
            id="close-leaderboard-footer-btn"
            onClick={onClose}
            className="px-4 sm:px-5 py-1.5 sm:py-2 bg-gray-800 hover:bg-gray-900 text-white text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer"
          >
            ปิด
          </button>
        </div>

        {/* Owner Authentication Modal Dialog */}
        <AnimatePresence>
          {authModalTarget && (
            <div
              id="owner-auth-modal-backdrop"
              className="absolute inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="w-full max-w-sm bg-white rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-rose-200 overflow-hidden flex flex-col"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-rose-600 to-red-600 px-4 py-3 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-white/20 rounded-lg">
                      <ShieldAlert size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-black leading-tight">ยืนยันสิทธิ์เจ้าของเกม</h3>
                      <p className="text-[10px] text-rose-100 font-medium">Owner Security Verification</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClosePasscodeModal}
                    disabled={isSuccessState || isDeleting}
                    className="p-1 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Body */}
                <form onSubmit={handleVerifyAndClear} className="p-4 space-y-3">
                  <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-2.5 text-[11px] sm:text-xs text-amber-900 leading-relaxed">
                    <div className="font-bold flex items-center gap-1 text-amber-950 mb-0.5">
                      <span>🌍 พื้นที่เก็บข้อมูลส่วนกลาง</span>
                    </div>
                    <span>
                      เพื่อความปลอดภัยของข้อมูลผู้เล่นทั่วโลก การล้าง{authModalTarget === 'game' ? 'ประวัติเกมและตารางอันดับ' : 'ประวัติแบบทดสอบ'}
                      จำเป็นต้องใส่รหัสผ่านความปลอดภัยเฉพาะเจ้าของระบบ
                    </span>
                  </div>

                  {/* Password Input */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <KeyRound size={13} className="text-rose-600" /> ใส่รหัสผ่าน 6 หลัก:
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[11px] text-gray-500 hover:text-gray-800 flex items-center gap-0.5 cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                        <span>{showPassword ? 'ซ่อน' : 'แสดง'}</span>
                      </button>
                    </label>

                    <div className="relative">
                      <input
                        ref={inputRef}
                        id="owner-passcode-input"
                        type={showPassword ? 'text' : 'password'}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={10}
                        autoFocus
                        value={passcodeInput}
                        onChange={(e) => {
                          setPasscodeInput(e.target.value);
                          setPasscodeError(null);
                        }}
                        placeholder="••••••"
                        disabled={isSuccessState || isDeleting}
                        className={`w-full text-center text-xl font-mono font-black tracking-widest py-2 px-3 rounded-xl border-2 transition-all outline-hidden ${
                          passcodeError
                            ? 'border-rose-500 bg-rose-50 text-rose-900 animate-shake'
                            : isSuccessState
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                            : 'border-gray-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 bg-gray-50 focus:bg-white'
                        }`}
                      />
                    </div>

                    {/* Error / Success Feedback */}
                    {passcodeError && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-1.5 text-[11px] font-bold text-rose-600 flex items-center gap-1 justify-center bg-rose-50 py-1 px-2 rounded-lg border border-rose-200"
                      >
                        <ShieldAlert size={12} className="flex-shrink-0" />
                        <span>{passcodeError}</span>
                      </motion.div>
                    )}

                    {isSuccessState && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-1.5 text-[11px] font-bold text-emerald-700 flex items-center gap-1 justify-center bg-emerald-50 py-1 px-2 rounded-lg border border-emerald-200"
                      >
                        <CheckCircle2 size={13} className="flex-shrink-0" />
                        <span>รหัสถูกต้อง กำลังดำเนินการล้างข้อมูล...</span>
                      </motion.div>
                    )}
                  </div>

                  {/* Compact Numeric Pad for Touch Devices */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                      <button
                        key={digit}
                        type="button"
                        onClick={() => handleDigitPress(digit)}
                        disabled={isSuccessState || isDeleting}
                        className="py-2 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 active:scale-95 text-gray-800 font-bold font-mono text-base rounded-xl transition-all cursor-pointer select-none"
                      >
                        {digit}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleClearInput}
                      disabled={isSuccessState || isDeleting}
                      className="py-2 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 active:scale-95 text-gray-500 font-bold text-xs rounded-xl transition-all cursor-pointer select-none"
                    >
                      ล้าง
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDigitPress('0')}
                      disabled={isSuccessState || isDeleting}
                      className="py-2 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 active:scale-95 text-gray-800 font-bold font-mono text-base rounded-xl transition-all cursor-pointer select-none"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={handleBackspace}
                      disabled={isSuccessState || isDeleting}
                      className="py-2 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 active:scale-95 text-gray-700 font-bold text-sm rounded-xl transition-all cursor-pointer select-none flex items-center justify-center"
                    >
                      ⌫
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={handleClosePasscodeModal}
                      disabled={isSuccessState || isDeleting}
                      className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      id="confirm-owner-clear-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        handleVerifyAndClear();
                      }}
                      disabled={isSuccessState || isDeleting || normalizePasscode(passcodeInput).length === 0}
                      className="flex-1 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      {isDeleting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>กำลังล้างข้อมูล...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 size={14} />
                          <span>ยืนยันล้างประวัติ</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

