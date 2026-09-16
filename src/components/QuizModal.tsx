import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  X,
  CheckCircle2,
  XCircle,
  Award,
  ChevronRight,
  RotateCcw,
  BookOpen,
  History,
  Check,
  User,
  Cloud,
} from 'lucide-react';
import { QuizQuestion, QuizRecord } from '../types';
import { quizQuestions } from '../data/quizQuestions';
import { soundEngine } from '../utils/soundEngine';

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
  onSaveRecord: (record: QuizRecord) => void;
  quizHistory: QuizRecord[];
  onOpenGrammarGuide: () => void;
}

export default function QuizModal({
  isOpen,
  onClose,
  playerName,
  onSaveRecord,
  quizHistory,
  onOpenGrammarGuide,
}: QuizModalProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [hasAnsweredCurrent, setHasAnsweredCurrent] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [viewMode, setViewMode] = useState<'quiz' | 'history' | 'review'>('quiz');

  if (!isOpen) return null;

  const currentQ: QuizQuestion = quizQuestions[currentIdx];
  const userSelected = selectedAnswers[currentIdx];

  // Calculate score
  const correctCount = selectedAnswers.reduce((acc, ans, idx) => {
    return ans === quizQuestions[idx]?.correctAnswer ? acc + 1 : acc;
  }, 0);

  const handleSelectOption = (optionIdx: number) => {
    if (hasAnsweredCurrent || isFinished) return;
    const nextAnswers = [...selectedAnswers];
    nextAnswers[currentIdx] = optionIdx;
    setSelectedAnswers(nextAnswers);
    setHasAnsweredCurrent(true);

    const isCorrect = optionIdx === currentQ.correctAnswer;
    if (isCorrect) {
      soundEngine.playCorrect();
    } else {
      soundEngine.playWrong();
    }
  };

  const handleNextQuestion = () => {
    if (currentIdx < quizQuestions.length - 1) {
      soundEngine.playPickup();
      setCurrentIdx(currentIdx + 1);
      setHasAnsweredCurrent(selectedAnswers[currentIdx + 1] !== undefined);
    } else {
      // Finished all 20 questions!
      setIsFinished(true);
      soundEngine.playGameOver();
      const finalScore = selectedAnswers.reduce((acc, ans, idx) => {
        return ans === quizQuestions[idx]?.correctAnswer ? acc + 1 : acc;
      }, 0);
      const newRecord: QuizRecord = {
        id: 'quiz-' + Date.now(),
        playerName: playerName.trim() || 'ผู้เล่นนิรนาม',
        score: finalScore,
        totalQuestions: quizQuestions.length,
        percentage: Math.round((finalScore / quizQuestions.length) * 100),
        date: new Date().toLocaleDateString('th-TH', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        answers: selectedAnswers,
      };
      onSaveRecord(newRecord);
    }
  };

  const handleRestartQuiz = () => {
    setCurrentIdx(0);
    setSelectedAnswers([]);
    setHasAnsweredCurrent(false);
    setIsFinished(false);
    setViewMode('quiz');
  };

  // Performance feedback
  const getFeedbackBadge = (score: number) => {
    if (score >= 18) {
      return {
        title: '🌟 ยอดเยี่ยมมาก! ระดับเซียนคำนาม',
        desc: 'คุณมีความรู้ความเข้าใจเรื่องคำนามทั้ง ๔ ชนิดอย่างถ่องแท้และแม่นยำมาก',
        color: 'text-amber-700 bg-amber-50 border-amber-300',
      };
    } else if (score >= 14) {
      return {
        title: '👏 เก่งมาก! ความรู้แน่นปึ้ก',
        desc: 'คุณจำแนกคำนามทั่วไป ชี้เฉพาะ ลักษณนาม และอาการนามได้อย่างถูกต้องส่วนใหญ่',
        color: 'text-blue-700 bg-blue-50 border-blue-300',
      };
    } else if (score >= 10) {
      return {
        title: '👍 ผ่านเกณฑ์มาตรฐาน!',
        desc: 'คุณเข้าใจหลักการพื้นฐานดี ทบทวนเรื่องนามสามัญ/วิสามัญและลักษณนามอีกนิดจะยิ่งแม่นยำ',
        color: 'text-emerald-700 bg-emerald-50 border-emerald-300',
      };
    } else {
      return {
        title: '📚 ควรทบทวนเพิ่มเติมอีกหน่อย',
        desc: 'ลองเปิดอ่านเมนู "รอบรู้เรื่องคำนาม" เพื่อทำความเข้าใจ แล้วกลับมาทดสอบใหม่อีกรอบนะ!',
        color: 'text-rose-700 bg-rose-50 border-rose-300',
      };
    }
  };

  return (
    <div
      id="quiz-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs"
    >
      <motion.div
        id="quiz-modal-card"
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        className="relative w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border-2 border-indigo-200 flex flex-col max-h-[90dvh] select-none text-left"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-600 px-4 py-3 sm:px-6 sm:py-3.5 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 bg-white/20 rounded-xl">
              <FileText className="text-yellow-200" size={22} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base sm:text-lg md:text-xl font-black leading-tight">
                  แบบทดสอบรอบรู้เรื่องคำนาม (๒๐ ข้อ)
                </h2>
                <span className="hidden sm:inline-flex items-center gap-0.5 text-[9px] bg-emerald-500/80 text-white font-bold px-1.5 py-0.5 rounded-full shadow-xs">
                  <Cloud size={10} /> ซิงค์คลาวด์
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-blue-100">
                <span className="flex items-center gap-1">
                  <User size={12} /> {playerName.trim() || 'ผู้เล่นทั่วไป'}
                </span>
                <span>•</span>
                <span>บันทึกผลออนไลน์เรียลไทม์</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              id="quiz-toggle-history-btn"
              onClick={() => setViewMode(viewMode === 'history' ? (isFinished ? 'review' : 'quiz') : 'history')}
              className="p-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              title="ดูประวัติการทดสอบ"
            >
              <History size={16} />
              <span className="hidden sm:inline">ประวัติ ({quizHistory.length})</span>
            </button>

            <button
              id="close-quiz-btn"
              onClick={onClose}
              aria-label="ปิด"
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* VIEW 1: HISTORY MODE */}
        {viewMode === 'history' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-black text-gray-800 text-sm sm:text-base flex items-center gap-1.5">
                <History className="text-indigo-600" size={18} /> ประวัติการทำแบบทดสอบคำนาม
              </h3>
              <button
                onClick={() => setViewMode(isFinished ? 'review' : 'quiz')}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
              >
                กลับไปที่แบบทดสอบ
              </button>
            </div>

            {quizHistory.length === 0 ? (
              <div className="text-center py-10 text-gray-500 text-sm">
                ยังไม่มีประวัติการทำแบบทดสอบ<br />
                <span className="text-xs text-gray-400">เมื่อทำแบบทดสอบครบ ๒๐ ข้อ ผลคะแนนจะถูกบันทึกไว้ที่นี่</span>
              </div>
            ) : (
              <div className="space-y-2">
                {quizHistory.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-indigo-50/40 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
                        <User size={13} className="text-indigo-500" /> {item.playerName}
                      </div>
                      <div className="text-[11px] text-gray-500">{item.date}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-base sm:text-lg font-black text-indigo-700">
                        {item.score} / {item.totalQuestions}
                      </div>
                      <div className="text-[10px] font-bold text-gray-600">{item.percentage}%</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: QUIZ RESULT MODE */}
        {viewMode === 'quiz' && isFinished && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-indigo-100 flex items-center justify-center text-3xl sm:text-4xl shadow-inner">
              🏆
            </div>

            <div>
              <h3 className="text-xl sm:text-2xl font-black text-gray-800">สรุปผลการทดสอบ</h3>
              <p className="text-xs text-gray-500 mt-0.5">ผู้ทดสอบ: <b>{playerName.trim() || 'ผู้เล่น'}</b></p>
            </div>

            {/* Score Ring */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-2xl p-4 max-w-sm mx-auto shadow-xs">
              <div className="text-4xl sm:text-5xl font-black text-indigo-700 font-mono">
                {correctCount} <span className="text-xl text-gray-500 font-sans">/ ๒๐</span>
              </div>
              <div className="text-xs font-bold text-indigo-900 mt-1">
                คิดเป็น {Math.round((correctCount / 20) * 100)}% ของข้อสอบทั้งหมด
              </div>
            </div>

            {/* Evaluation */}
            {(() => {
              const badge = getFeedbackBadge(correctCount);
              return (
                <div className={`p-3.5 rounded-xl border text-left max-w-md mx-auto ${badge.color}`}>
                  <div className="font-bold text-sm mb-1">{badge.title}</div>
                  <div className="text-xs leading-relaxed">{badge.desc}</div>
                </div>
              );
            })()}

            {/* Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md mx-auto pt-2">
              <button
                id="review-answers-btn"
                onClick={() => setViewMode('review')}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <BookOpen size={16} /> ดูเฉลยและคำอธิบาย ๒๐ ข้อ
              </button>

              <button
                id="restart-quiz-btn"
                onClick={handleRestartQuiz}
                className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw size={16} /> ทำแบบทดสอบอีกครั้ง
              </button>
            </div>
          </div>
        )}

        {/* VIEW 3: REVIEW ALL QUESTIONS MODE */}
        {viewMode === 'review' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-left">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-black text-gray-800 text-sm sm:text-base flex items-center gap-1.5">
                <BookOpen className="text-indigo-600" size={18} /> เฉลยและคำอธิบายละเอียด (๒๐ ข้อ)
              </h3>
              <button
                onClick={() => setViewMode('quiz')}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
              >
                กลับไปหน้าสรุป
              </button>
            </div>

            <div className="space-y-4">
              {quizQuestions.map((q, qIdx) => {
                const userAns = selectedAnswers[qIdx];
                const isCorrect = userAns === q.correctAnswer;
                return (
                  <div
                    key={q.id}
                    className={`p-3.5 sm:p-4 rounded-xl border text-xs sm:text-sm space-y-2 ${
                      isCorrect ? 'border-green-200 bg-green-50/40' : 'border-red-200 bg-red-50/40'
                    }`}
                  >
                    <div className="flex items-start gap-2 font-bold text-gray-800">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] flex-shrink-0 mt-0.5 text-white bg-gray-700">
                        {qIdx + 1}
                      </span>
                      <span>{q.question}</span>
                    </div>

                    <div className="grid grid-cols-1 gap-1.5 pl-7 text-xs">
                      {q.options.map((opt, optIdx) => {
                        const isThisCorrect = optIdx === q.correctAnswer;
                        const isUserPicked = optIdx === userAns;
                        return (
                          <div
                            key={optIdx}
                            className={`p-2 rounded-lg flex items-center justify-between border ${
                              isThisCorrect
                                ? 'bg-green-100 border-green-300 text-green-900 font-bold'
                                : isUserPicked
                                ? 'bg-red-100 border-red-300 text-red-900'
                                : 'bg-white/60 border-gray-200 text-gray-600'
                            }`}
                          >
                            <span>{opt}</span>
                            {isThisCorrect && <CheckCircle2 size={15} className="text-green-600" />}
                            {isUserPicked && !isThisCorrect && <XCircle size={15} className="text-red-600" />}
                          </div>
                        );
                      })}
                    </div>

                    <div className="pl-7 pt-1 text-[11px] text-gray-700 bg-white/70 p-2 rounded-lg border border-gray-200 leading-relaxed">
                      💡 <b>คำอธิบาย:</b> {q.explanation}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 4: ACTIVE QUESTION MODE */}
        {viewMode === 'quiz' && !isFinished && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col justify-between">
            <div>
              {/* Progress & Category Bar */}
              <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                <span className="font-bold text-indigo-700">
                  คำถามที่ {currentIdx + 1} จาก {quizQuestions.length} ข้อ
                </span>
                <span className="text-gray-500 font-mono">
                  คะแนนปัจจุบัน: <b>{correctCount}</b> ข้อ
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-4 border border-gray-200">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-teal-500 transition-all duration-300 rounded-full"
                  style={{ width: `${((currentIdx + 1) / quizQuestions.length) * 100}%` }}
                />
              </div>

              {/* Question Card */}
              <div className="bg-indigo-50/60 p-4 sm:p-5 rounded-2xl border border-indigo-100 mb-4">
                <h3 className="text-sm sm:text-base md:text-lg font-black text-gray-800 leading-snug">
                  {currentIdx + 1}. {currentQ.question}
                </h3>
              </div>

              {/* Options */}
              <div className="space-y-2">
                {currentQ.options.map((opt, optIdx) => {
                  let optStyle = 'bg-white border-gray-200 hover:border-indigo-300 text-gray-800 hover:bg-indigo-50/30';
                  if (hasAnsweredCurrent) {
                    if (optIdx === currentQ.correctAnswer) {
                      optStyle = 'bg-green-100 border-green-500 text-green-900 font-bold ring-2 ring-green-300';
                    } else if (optIdx === userSelected) {
                      optStyle = 'bg-red-100 border-red-500 text-red-900 ring-2 ring-red-300';
                    } else {
                      optStyle = 'bg-gray-50 border-gray-200 text-gray-400 opacity-60';
                    }
                  }

                  return (
                    <button
                      key={optIdx}
                      id={`quiz-option-${optIdx}`}
                      onClick={() => handleSelectOption(optIdx)}
                      disabled={hasAnsweredCurrent}
                      className={`w-full p-3 sm:p-3.5 rounded-xl border-2 text-left text-xs sm:text-sm font-medium transition-all flex items-center justify-between cursor-pointer ${optStyle}`}
                    >
                      <span>{opt}</span>
                      {hasAnsweredCurrent && optIdx === currentQ.correctAnswer && (
                        <CheckCircle2 size={18} className="text-green-600 flex-shrink-0" />
                      )}
                      {hasAnsweredCurrent && optIdx === userSelected && optIdx !== currentQ.correctAnswer && (
                        <XCircle size={18} className="text-red-600 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Instant Explanation when answered */}
              <AnimatePresence>
                {hasAnsweredCurrent && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-3 p-3 rounded-xl border text-xs leading-relaxed ${
                      userSelected === currentQ.correctAnswer
                        ? 'bg-green-50/90 border-green-200 text-green-950'
                        : 'bg-orange-50/90 border-orange-200 text-orange-950'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1 mb-0.5">
                      {userSelected === currentQ.correctAnswer ? (
                        <span className="text-green-700 flex items-center gap-1">
                          <Check size={14} /> ถูกต้อง!
                        </span>
                      ) : (
                        <span className="text-red-700 flex items-center gap-1">
                          <X size={14} /> ยังไม่ถูกต้อง
                        </span>
                      )}
                    </div>
                    {currentQ.explanation}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom Next Button */}
            <div className="pt-4 flex items-center justify-between border-t border-gray-100 mt-3">
              <button
                id="open-guide-from-quiz-btn"
                onClick={onOpenGrammarGuide}
                className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <BookOpen size={14} /> ดูรอบรู้เรื่องคำนาม
              </button>

              <button
                id="next-question-btn"
                onClick={handleNextQuestion}
                disabled={!hasAnsweredCurrent}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  hasAnsweredCurrent
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 active:scale-95'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <span>{currentIdx < quizQuestions.length - 1 ? 'ข้อถัดไป' : 'ดูผลคะแนน'}</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
