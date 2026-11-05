"use client";

export interface HabitRecentDay {
  date: string;
  checked: boolean;
}

export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  frequency_type: "daily" | "weekly_count" | "weekly_days";
  weekly_target: number;
  weekly_days: number[];
  remind_time: string | null;
  start_date: string;
  is_active: boolean;
  created_at: string;
  checked_today: boolean;
  recent_7: HabitRecentDay[];
  checkin_dates: string[];
}

export const HABIT_ICONS = ["⭐", "📖", "🏃", "💪", "🧘", "✍️", "🎨", "🎵", "💧", "🥗", "😴", "🧹", "📵", "🗣️", "🌅", "🧠"];

export const HABIT_COLORS = ["#3B82F6", "#3B82F6", "#F59E0B", "#8B5CF6", "#EC4899", "#EF4444", "#06B6D4"];

export const WEEKDAY_FULL = ["日", "一", "二", "三", "四", "五", "六"];

// 计算连胜（截至 todayStr，连续打卡天数）
export function calcStreak(dates: string[], todayStr: string): number {
  const set = new Set(dates);
  let streak = 0;
  const d = new Date(todayStr + "T12:00:00");
  // 若今天未打卡，从昨天开始计（连胜不断）
  if (!set.has(localStr(d))) {
    d.setDate(d.getDate() - 1);
  }
  while (set.has(localStr(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function localStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// 最长连胜
export function calcLongestStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...dates].sort();
  let longest = 1;
  let cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + "T12:00:00");
    const now = new Date(sorted[i] + "T12:00:00");
    const diff = Math.round((now.getTime() - prev.getTime()) / 86400000);
    if (diff === 1) {
      cur++;
      longest = Math.max(longest, cur);
    } else {
      cur = 1;
    }
  }
  return longest;
}

export function frequencyText(h: Habit): string {
  if (h.frequency_type === "daily") return "每天";
  if (h.frequency_type === "weekly_count") return `每周${h.weekly_target}次`;
  const days = [...h.weekly_days].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));
  return "每周" + days.map((d) => "周" + WEEKDAY_FULL[d]).join("、");
}
