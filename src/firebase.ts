import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  onSnapshot,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { LeaderboardEntry, QuizRecord } from './types';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file'); // Example Drive scope

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

// Initialize Firestore with specific database ID if provided in config
export const db: Firestore = firebaseConfig.firestoreDatabaseId
  ? initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

const LEADERBOARD_COLLECTION = 'leaderboard';
const QUIZ_COLLECTION = 'quiz_records';

/**
 * Save a game score to Cloud Firestore
 */
export async function saveLeaderboardEntryToCloud(entry: Omit<LeaderboardEntry, 'id'>): Promise<string | null> {
  try {
    const colRef = collection(db, LEADERBOARD_COLLECTION);
    const docRef = await addDoc(colRef, {
      playerName: entry.playerName || 'ผู้เล่นนิรนาม',
      score: entry.score,
      correctCount: entry.correctCount,
      wrongCount: entry.wrongCount,
      date: entry.date,
      createdAt: Date.now(),
    });
    return docRef.id;
  } catch (error) {
    console.warn('Failed to save score to cloud:', error);
    return null;
  }
}

/**
 * Real-time listener for global leaderboard entries
 */
export function subscribeToLeaderboard(
  callback: (entries: LeaderboardEntry[]) => void
): () => void {
  try {
    const colRef = collection(db, LEADERBOARD_COLLECTION);
    const q = query(colRef, orderBy('score', 'desc'), limit(100));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: LeaderboardEntry[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            playerName: data.playerName || 'ผู้เล่นนิรนาม',
            score: Number(data.score) || 0,
            correctCount: Number(data.correctCount) || 0,
            wrongCount: Number(data.wrongCount) || 0,
            date: data.date || '',
          };
        });
        callback(list);
      },
      (error) => {
        console.warn('Leaderboard subscription error:', error);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.warn('Could not establish leaderboard subscription:', error);
    return () => {};
  }
}

/**
 * Save a completed quiz record to Cloud Firestore
 */
export async function saveQuizRecordToCloud(record: Omit<QuizRecord, 'id'>): Promise<string | null> {
  try {
    const colRef = collection(db, QUIZ_COLLECTION);
    const docRef = await addDoc(colRef, {
      playerName: record.playerName || 'ผู้เล่นนิรนาม',
      score: record.score,
      totalQuestions: record.totalQuestions,
      percentage: record.percentage,
      date: record.date,
      answers: record.answers || [],
      createdAt: Date.now(),
    });
    return docRef.id;
  } catch (error) {
    console.warn('Failed to save quiz record to cloud:', error);
    return null;
  }
}

/**
 * Real-time listener for global quiz history
 */
export function subscribeToQuizRecords(
  callback: (records: QuizRecord[]) => void
): () => void {
  try {
    const colRef = collection(db, QUIZ_COLLECTION);
    const q = query(colRef, orderBy('createdAt', 'desc'), limit(50));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: QuizRecord[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            playerName: data.playerName || 'ผู้เล่นนิรนาม',
            score: Number(data.score) || 0,
            totalQuestions: Number(data.totalQuestions) || 20,
            percentage: Number(data.percentage) || 0,
            date: data.date || '',
            answers: data.answers || [],
          };
        });
        callback(list);
      },
      (error) => {
        console.warn('Quiz records subscription error:', error);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.warn('Could not establish quiz subscription:', error);
    return () => {};
  }
}
