import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { UserProfile, PracticeSession, Achievement } from '../types';

interface NoteLabs extends DBSchema {
  users: {
    key: string;
    value: UserProfile;
  };
  sessions: {
    key: string;
    value: PracticeSession;
    indexes: { 'by-user': string; 'by-date': number };
  };
  achievements: {
    key: string;
    value: Achievement;
    indexes: { 'by-user': string };
  };
}

let db: IDBPDatabase<NoteLabs> | null = null;

export const initDB = async (): Promise<IDBPDatabase<NoteLabs>> => {
  if (db) return db;

  db = await openDB<NoteLabs>('NoteLabs', 1, {
    upgrade(db) {
      // Users store
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'id' });
      }

      // Practice Sessions store with indexes
      if (!db.objectStoreNames.contains('sessions')) {
        const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
        sessionStore.createIndex('by-user', 'userId');
        sessionStore.createIndex('by-date', 'date');
      }

      // Achievements store with index
      if (!db.objectStoreNames.contains('achievements')) {
        const achievementStore = db.createObjectStore('achievements', { keyPath: 'id' });
        achievementStore.createIndex('by-user', 'userId');
      }
    },
  });

  return db;
};

// User operations
export const saveUser = async (user: UserProfile): Promise<void> => {
  const database = await initDB();
  user.updatedAt = Date.now();
  await database.put('users', user);
};

export const getUser = async (userId: string): Promise<UserProfile | undefined> => {
  const database = await initDB();
  return database.get('users', userId);
};

// Session operations
export const savePracticeSession = async (session: PracticeSession): Promise<void> => {
  const db = await initDB();
  session.createdAt = Date.now();
  await db.put('sessions', session);
};

export const getUserSessions = async (userId: string): Promise<PracticeSession[]> => {
  const database = await initDB();
  return database.getAllFromIndex('sessions', 'by-user', userId);
};

export const getRecentSessions = async (userId: string, days: number = 30): Promise<PracticeSession[]> => {
  const allSessions = await getUserSessions(userId);
  const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
  return allSessions.filter(s => s.date >= cutoffTime);
};

// Achievement operations
export const saveAchievement = async (achievement: Achievement, userId: string): Promise<void> => {
  const database = await initDB();
  const fullAchievement = { ...achievement, userId };
  await database.put('achievements', fullAchievement);
};

export const getUserAchievements = async (userId: string): Promise<Achievement[]> => {
  const database = await initDB();
  const achievements = await database.getAllFromIndex('achievements', 'by-user', userId);
  return achievements.map(a => ({
    id: a.id,
    name: a.name,
    description: a.description,
    unlockedAt: a.unlockedAt,
  }));
};

// Statistics calculation (efficient - computed on-the-fly from indexed data)
export const getUserStatistics = async (userId: string) => {
  const sessions = await getUserSessions(userId);
  
  const stats = {
    totalSessions: sessions.length,
    totalTime: sessions.reduce((acc, s) => acc + s.duration, 0),
    earTrainingCount: sessions.filter(s => s.sessionType === 'ear-training').length,
    alankarCount: sessions.filter(s => s.sessionType === 'alankar').length,
    averageAccuracy: 0,
    lastSessionDate: 0,
  };

  if (sessions.length > 0) {
    const avgAcc = sessions.reduce((acc, s) => {
      if (s.sessionType === 'ear-training') {
        return acc + (s.data as any).accuracy;
      }
      return acc;
    }, 0);
    stats.averageAccuracy = sessions.filter(s => s.sessionType === 'ear-training').length > 0
      ? avgAcc / sessions.filter(s => s.sessionType === 'ear-training').length
      : 0;
    
    stats.lastSessionDate = Math.max(...sessions.map(s => s.date));
  }

  return stats;
};

// Cleanup old sessions (keep last 90 days) - run periodically
export const cleanupOldSessions = async (userId: string, daysToKeep: number = 90): Promise<void> => {
  const database = await initDB();
  const sessions = await getUserSessions(userId);
  const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
  
  for (const session of sessions) {
    if (session.date < cutoffTime) {
      await database.delete('sessions', session.id);
    }
  }
};
