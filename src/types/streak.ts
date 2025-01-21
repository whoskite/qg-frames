import { Timestamp } from 'firebase/firestore';

export interface StreakStatus {
  isValidStreak: boolean;
  hoursSinceLastLogin: number | null;
  nextEligibleLogin: number | null;
  streakDeadline: number | null;
  isEligibleForIncrement: boolean;
  isInGracePeriod: boolean;
  hoursUntilReset: number | null;
}

export interface StreakUpdate {
  current_streak: number;
  last_login_timestamp: Date;
  next_eligible_login: Date;
  streak_deadline: Date;
  timezone?: string;
  initial_streak_start?: Date;
  last_streak_reset?: Date;
  grace_period_used?: boolean;
  streak_history?: {
    start_date: Date;
    end_date?: Date;
    length: number;
    was_recovered?: boolean;
    reset_reason?: 'missed_day' | 'grace_expired' | 'user_inactive';
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
  last_streak_reset?: Timestamp;
  grace_period_used?: boolean;
  streak_history?: {
    start_date: Timestamp;
    end_date?: Timestamp;
    length: number;
    was_recovered?: boolean;
    reset_reason?: 'missed_day' | 'grace_expired' | 'user_inactive';
  }[];
} 