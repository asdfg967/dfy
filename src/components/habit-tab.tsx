"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Habit, calcStreak, frequencyText } from "@/lib/habit-types";
import { localDateStr } from "@/lib/date-utils";
import HabitEditSheet, { HabitFormData } from "@/components/habit-edit-sheet";
import HabitStatsSheet from "@/components/habit-stats-sheet";

export default function HabitTab() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [statsHabit, setStatsHabit] = useState<Habit | null>(null);
  const [animatingId, setAnimatingId] = useState<string | null>(null);

  useEffect(() => setToday(localDateStr(new Date())), []);

  const fetchHabits = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/habits?date=${localDateStr(new Date())}`);
      const json = await res.json();
      if (json.success) setHabits(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  const handleCheckin = async (habit: Habit) => {
    if (habit.checked_today) {
      // 取消打卡
      const res = await fetch(`/api/habits/${habit.id}/checkin?date=${today}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setHabits((prev) =>
          prev.map((h) =>
            h.id === habit.id
              ? {
                  ...h,
                  checked_today: false,
                  checkin_dates: h.checkin_dates.filter((d) => d !== today),
                  recent_7: h.recent_7.map((d) => (d.date === today ? { ...d, checked: false } : d)),
                }
              : h
          )
        );
      }
      return;
    }

    // 打卡
    const res = await fetch(`/api/habits/${habit.id}/checkin?date=${today}`, { method: "POST" });
    const json = await res.json();
    if (json.success) {
      setAnimatingId(habit.id);
      setTimeout(() => setAnimatingId(null), 600);
      setHabits((prev) =>
        prev.map((h) =>
          h.id === habit.id
            ? {
                ...h,
                checked_today: true,
                checkin_dates: [...h.checkin_dates, today],
                recent_7: h.recent_7.map((d) => (d.date === today ? { ...d, checked: true } : d)),
              }
            : h
        )
      );
    } else {
      alert(json.error || "打卡失败");
    }
  };

  const handleSave = async (data: HabitFormData) => {
    const url = editing ? `/api/habits/${editing.id}` : "/api/habits";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.success) {
      alert(json.error || "保存失败");
      throw new Error(json.error);
    }
    await fetchHabits();
  };

  const handleDelete = async (habit: Habit) => {
    if (!confirm(`确定删除习惯「${habit.name}」吗？历史打卡也会删除。`)) return;
    const res = await fetch(`/api/habits/${habit.id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      setHabits((prev) => prev.filter((h) => h.id !== habit.id));
    }
  };

  const completedToday = useMemo(() => habits.filter((h) => h.checked_today).length, [habits]);

  return (
    <div className="min-h-screen bg-[#F8FAFB] pb-24">
      <div className="bg-white sticky top-0 z-30 safe-top px-5 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-[#1E293B]">习惯打卡</h1>
          <button
            onClick={() => { setEditing(null); setEditOpen(true); }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#3B82F6] text-white rounded-xl text-sm font-semibold btn-press shadow-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            新习惯
          </button>
        </div>
        {habits.length > 0 && (
          <p className="text-xs text-[#94A3B8]">
            今天已打卡 {completedToday}/{habits.length} 个习惯，继续保持！
          </p>
        )}
      </div>

      <div className="px-4 pt-3 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-[3px] border-[#3B82F6]/30 border-t-[#3B82F6] rounded-full animate-spin" />
          </div>
        ) : habits.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🌱</div>
            <p className="text-[#94A3B8] text-[15px] mb-2">还没有习惯</p>
            <p className="text-[#CBD5E1] text-sm">点击右上角，建立第一个好习惯吧</p>
          </div>
        ) : (
          habits.map((habit) => {
            const streak = calcStreak(habit.checkin_dates, today);
            return (
              <div key={habit.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                    style={{ backgroundColor: habit.color + "1A" }}
                  >
                    {habit.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[16px] font-bold text-[#1E293B] truncate">{habit.name}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-[#94A3B8]">{frequencyText(habit)}</span>
                      {streak > 0 && (
                        <span className="text-xs font-semibold text-[#F97316]">🔥 {streak}天</span>
                      )}
                    </div>
                  </div>

                  {/* 打卡圆钮 */}
                  <button
                    onClick={() => handleCheckin(habit)}
                    className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 btn-press transition-all ${
                      animatingId === habit.id ? "animate-check-pop" : ""
                    }`}
                    style={{
                      backgroundColor: habit.checked_today ? habit.color : "white",
                      border: `2.5px solid ${habit.color}`,
                    }}
                  >
                    {habit.checked_today ? (
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={habit.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* 最近 7 天小方块 */}
                <div className="flex items-center gap-1.5 mt-3">
                  {habit.recent_7.map((d) => (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full aspect-square rounded-md"
                        style={{
                          backgroundColor: d.checked ? habit.color : "#F1F5F9",
                        }}
                      />
                      <span className="text-[9px] text-[#CBD5E1]">{Number(d.date.slice(8))}</span>
                    </div>
                  ))}
                </div>

                {/* 操作 */}
                <div className="flex items-center justify-end gap-4 mt-2 pt-2 border-t border-slate-50">
                  <button
                    onClick={() => setStatsHabit(habit)}
                    className="text-xs text-[#64748B] btn-press flex items-center gap-1"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
                    统计
                  </button>
                  <button
                    onClick={() => { setEditing(habit); setEditOpen(true); }}
                    className="text-xs text-[#64748B] btn-press flex items-center gap-1"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(habit)}
                    className="text-xs text-[#EF4444] btn-press flex items-center gap-1"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                    删除
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {editOpen && (
        <HabitEditSheet
          initial={editing}
          onClose={() => setEditOpen(false)}
          onSubmit={handleSave}
        />
      )}
      {statsHabit && (
        <HabitStatsSheet habit={statsHabit} onClose={() => setStatsHabit(null)} />
      )}
    </div>
  );
}
