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
  initial_streak_start?: Date;
  streak_history?: {
    start_date: Date;
    end_date?: Date;
    length: number;
  }[];
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
  initial_streak_start?: Timestamp;
  streak_history?: {
    start_date: Timestamp;
    end_date?: Timestamp;
    length: number;
  }[];
} 