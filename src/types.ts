export type Category = {
  id: string;
  label: string;
  sublabel?: string;
  hint?: string;
  border: string;
  bg: string;
  icon: string;
};

export type TrashItem = {
  id: string;
  text: string;
  category: string;
  x: number;
  y: number;
  rotation: number;
  emoji: string;
  bgClass: string;
  explanation?: string;
  isTrap?: boolean;
  startX?: number;
  startY?: number;
  exitDirection?: 'left' | 'right' | 'bottom';
  zIndex?: number;
};

export type LeaderboardEntry = {
  id: string;
  playerName: string;
  score: number;
  correctCount: number;
  wrongCount: number;
  date: string;
};

export type QuizQuestion = {
  id: number;
  question: string;
  context?: string;
  options: string[];
  correctAnswer: number; // 0-based index
  explanation: string;
  categoryTag: 'common' | 'proper' | 'classifier' | 'abstract' | 'mixed';
};

export type QuizRecord = {
  id: string;
  playerName: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  date: string;
  answers: number[];
};

