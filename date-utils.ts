// 日期工具（本地时区，避免 toISOString 的 UTC 偏移问题）

export function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// 周一为首日，返回该周周一的 Date
export function getMondayOfWeek(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay(); // 0=周日
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

// 返回某周的 7 天日期字符串（周一~周日）
export function getWeekDays(weekOffset: number): Date[] {
  const now = new Date();
  const monday = getMondayOfWeek(now);
  monday.setDate(monday.getDate() + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];

export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function getHourFromTs(ts: string | null): number | null {
  if (!ts) return null;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  return d.getHours() + d.getMinutes() / 60;
}

// 友好的月日
export function formatMonthDay(s: string): string {
  const d = parseLocalDate(s);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export function weekdayLabel(s: string): string {
  const d = parseLocalDate(s);
  return "周" + WEEKDAY_LABELS[(d.getDay() + 6) % 7];
}

// 临期等级（基于截止时间）
export type Urgency = "expired" | "today" | "soon" | "normal" | "none";
export function urgencyOf(dueDate: string | null, baseDate: Date = new Date()): Urgency {
  if (!dueDate) return "none";
  const due = new Date(dueDate);
  const diff = due.getTime() - baseDate.getTime();
  const h24 = 24 * 3600 * 1000;
  const d3 = 3 * 24 * 3600 * 1000;
  if (diff < 0) return "expired";
  if (diff <= h24) return "today";
  if (diff <= d3) return "soon";
  return "normal";
}

export const URGENCY_DOT: Record<string, string> = {
  expired: "#EF4444",
  today: "#F97316",
  soon: "#EAB308",
  normal: "#10B981",
  none: "#CBD5E1",
};
