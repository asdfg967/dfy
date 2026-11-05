"use client";

import { useState, useEffect, useMemo } from "react";
import { Habit, calcStreak, calcLongestStreak } from "@/lib/habit-types";
import { localDateStr, parseLocalDate } from "@/lib/date-utils";

export default function HabitStatsSheet({ habit, onClose }: { habit: Habit; onClose: () => void }) {
  const [month, setMonth] = useState(localDateStr(new Date()).slice(0, 7));
  const [monthDates, setMonthDates] = useState<string[]>([]);
  const [allDates, setAllDates] = useState<string[]>(habit.checkin_dates || []);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/habits/${habit.id}/checkin?month=${month}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          setMonthDates(j.data.month_dates);
          setAllDates(j.data.all_dates);
        }
      })
      .finally(() => setLoading(false));
  }, [habit.id, month]);

  const todayStr = localDateStr(new Date());
  const streak = useMemo(() => calcStreak(allDates, todayStr), [allDates, todayStr]);
  const longest = useMemo(() => calcLongestStreak(allDates), [allDates]);

  // 本月完成率 = 已打卡 / 已过天数（起始日期之后）
  const completion = useMemo(() => {
    const start = new Date(habit.start_date + "T12:00:00");
    const now = new Date();
    let elapsed = 0;
    const [y, m] = month.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(y, m - 1, d);
      if (date < start) continue;
      if (date > now) break;
      elapsed++;
    }
    if (elapsed === 0) return 0;
    return Math.round((monthDates.length / elapsed) * 100);
  }, [monthDates, month, habit.start_date]);

  // 日历格子
  const calendarCells = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const firstDay = new Date(y, m - 1, 1).getDay(); // 0=周日
    const daysInMonth = new Date(y, m, 0).getDate();
    const cells: (string | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(`${month}-${String(d).padStart(2, "0")}`);
    }
    return cells;
  }, [month]);

  const checkedSet = useMemo(() => new Set(monthDates), [monthDates]);

  const changeMonth = (delta: number) => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const [yy, mm] = month.split("-").map(Number);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[480px] bg-white rounded-t-3xl max-h-[88vh] overflow-y-auto animate-slide-up">
        <div className="sticky top-0 bg-white px-5 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-[#1E293B] flex items-center gap-2">
            <span>{habit.icon}</span>{habit.name} · 统计
          </h3>
          <button onClick={onClose} className="text-[#94A3B8] text-2xl leading-none btn-press">×</button>
        </div>

        <div className="px-5 py-4">
          {/* 数据卡片 */}
          <div className="grid grid-cols-4 gap-2 mb-5">
            <div className="bg-[#EFF6FF] rounded-xl py-3 text-center">
              <div className="text-lg font-bold text-[#3B82F6]">{streak}</div>
              <div className="text-[10px] text-[#64748B]">当前连胜</div>
            </div>
            <div className="bg-[#FFF7ED] rounded-xl py-3 text-center">
              <div className="text-lg font-bold text-[#F97316]">{longest}</div>
              <div className="text-[10px] text-[#64748B]">最长连胜</div>
            </div>
            <div className="bg-[#EFF6FF] rounded-xl py-3 text-center">
              <div className="text-lg font-bold text-[#3B82F6]">{allDates.length}</div>
              <div className="text-[10px] text-[#64748B]">累计打卡</div>
            </div>
            <div className="bg-[#F5F3FF] rounded-xl py-3 text-center">
              <div className="text-lg font-bold text-[#8B5CF6]">{completion}%</div>
              <div className="text-[10px] text-[#64748B]">本月完成率</div>
            </div>
          </div>

          {/* 月份切换 */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => changeMonth(-1)} className="w-8 h-8 flex items-center justify-center text-[#64748B] btn-press">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <span className="text-sm font-semibold text-[#1E293B]">{yy}年{mm}月</span>
            <button onClick={() => changeMonth(1)} className="w-8 h-8 flex items-center justify-center text-[#64748B] btn-press">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>

          {/* 星期表头 */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {["日", "一", "二", "三", "四", "五", "六"].map((w) => (
              <div key={w} className="text-center text-[11px] text-[#94A3B8] py-1">{w}</div>
            ))}
          </div>

          {/* 日历热力 */}
          {loading ? (
            <div className="text-center py-8 text-sm text-[#94A3B8]">加载中...</div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((dateStr, i) => {
                if (!dateStr) return <div key={`e${i}`} />;
                const checked = checkedSet.has(dateStr);
                const dayNum = Number(dateStr.split("-")[2]);
                const isToday = dateStr === todayStr;
                const isFuture = parseLocalDate(dateStr) > new Date();
                return (
                  <div
                    key={dateStr}
                    className="aspect-square rounded-lg flex items-center justify-center text-xs font-medium"
                    style={{
                      backgroundColor: checked ? habit.color : isToday ? "#E2E8F0" : "#F8FAFB",
                      color: checked ? "white" : isFuture ? "#CBD5E1" : "#475569",
                      outline: isToday ? `2px solid ${habit.color}` : "none",
                      outlineOffset: -2,
                    }}
                  >
                    {dayNum}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
