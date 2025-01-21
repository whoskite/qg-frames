import { Timestamp } from 'firebase/firestore';

export interface StreakStatus {
  isValidStreak: boolean;
  hoursSinceLastLogin: number | null;
  nextEligibleLogin: number | null;
  streakDeadline: number | null;
  isEligibleForIncrement: boolean;
}

export interface StreakUpdate {
  current_streak: number;
  last_login_timestamp: Date;
  next_eligible_login: Date;
  streak_deadline: Date;
  timezone?: string;
}

export interface UserStreak {
  current_streak: number;
  longest_streak: number;
  last_login_timestamp: Timestamp;
  next_eligible_login: Timestamp;
  streak_deadline: Timestamp;
  timezone?: string;
  created_at?: Timestamp;
  updated_at?: Timestamp;
} 