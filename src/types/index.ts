// User and Profile Types
export interface UserProfile {
  id: string;
  name: string;
  flute: string; // e.g., "C", "D", "E", "F", "G", "A", "B"
  saNoteFrequency: number;
  createdAt: number;
  updatedAt: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlockedAt?: number;
}

export interface PracticeSession {
  id: string;
  userId: string;
  sessionType: 'ear-training' | 'alankar';
  date: number;
  duration: number; // in milliseconds
  data: EarTrainingData | AlankarData;
  createdAt: number;
}

// Ear Training Types
export interface EarTrainingData {
  selectedNotes: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  correctAnswers: number;
  totalAttempts: number;
  accuracy: number; // percentage
}

// Alankar Types
export interface AlankarData {
  pattern: number[]; // e.g., [1, 2, 3]
  tempo: number; // BPM
  notes: string[];
  completed: boolean;
  tempo_progression: number[];
}

// Flute Types
export interface FluteScaleConfig {
  name: string;
  baseFrequency: number; // Sa frequency
  notes: string[]; // 15 notes (5 lower octave, 5 mid, 5 higher)
  noteFrequencies: number[];
}

export interface TuningData {
  noteIndex: number;
  targetFrequency: number;
  detectedFrequency: number;
  deviation: number; // in cents
  inTune: boolean; // ±2 cents threshold
}

// UI State Types
export const PageType = {
  HOME: 'home',
  EAR_TRAINING: 'ear-training',
  ALANKARS: 'alankars',
  SETTINGS: 'settings',
} as const;

export type PageType = (typeof PageType)[keyof typeof PageType];
