import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Trophy, X, Trash2, Calendar, Medal, FileText, User, Cloud, ChevronDown, ArrowDown } from 'lucide-react';
import { LeaderboardEntry, QuizRecord } from '../types';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: LeaderboardEntry[];
  quizRecords?: QuizRecord[];
  currentEntryId?: string | null;
  onClear: () => void;
  onClearQuizRecords?: () => void;
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
          {activeTab === 'game' && entries.length > 0 ? (
            <button
              id="clear-leaderboard-btn"
              onClick={() => {
                if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการล้างตารางอันดับคะแนนเกมทั้งหมด?')) {
                  onClear();
                }
              }}
              className="text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
            >
              <Trash2 size={13} /> ล้างประวัติเกม
            </button>
          ) : activeTab === 'quiz' && quizRecords.length > 0 && onClearQuizRecords ? (
            <button
              id="clear-quiz-history-btn"
              onClick={() => {
                if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการล้างประวัติการทำแบบทดสอบทั้งหมด?')) {
                  onClearQuizRecords();
                }
              }}
              className="text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
            >
              <Trash2 size={13} /> ล้างประวัติแบบทดสอบ
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
      </motion.div>
    </div>
  );
}

