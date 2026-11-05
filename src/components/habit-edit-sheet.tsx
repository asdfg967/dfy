"use client";

import { useState } from "react";
import { Habit, HABIT_ICONS, HABIT_COLORS, WEEKDAY_FULL } from "@/lib/habit-types";
import { localDateStr } from "@/lib/date-utils";

export interface HabitFormData {
  name: string;
  icon: string;
  color: string;
  frequency_type: "daily" | "weekly_count" | "weekly_days";
  weekly_target: number;
  weekly_days: number[];
  remind_time: string;
  start_date: string;
}

export default function HabitEditSheet({
  initial,
  onClose,
  onSubmit,
}: {
  initial?: Habit | null;
  onClose: () => void;
  onSubmit: (data: HabitFormData) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [icon, setIcon] = useState(initial?.icon || HABIT_ICONS[0]);
  const [color, setColor] = useState(initial?.color || HABIT_COLORS[0]);
  const [frequencyType, setFrequencyType] = useState<"daily" | "weekly_count" | "weekly_days">(
    initial?.frequency_type || "daily"
  );
  const [weeklyTarget, setWeeklyTarget] = useState(initial?.weekly_target || 3);
  const [weeklyDays, setWeeklyDays] = useState<number[]>(initial?.weekly_days || [1, 3, 5]);
  const [remindTime, setRemindTime] = useState(initial?.remind_time || "");
  const [startDate, setStartDate] = useState(initial?.start_date || localDateStr(new Date()));
  const [saving, setSaving] = useState(false);

  const toggleDay = (d: number) => {
    setWeeklyDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert("请输入习惯名称");
      return;
    }
    if (frequencyType === "weekly_days" && weeklyDays.length === 0) {
      alert("请至少选择一天");
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        icon,
        color,
        frequency_type: frequencyType,
        weekly_target: weeklyTarget,
        weekly_days: weeklyDays,
        remind_time: remindTime,
        start_date: startDate,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[480px] bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="sticky top-0 bg-white px-5 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-[#1E293B]">{initial ? "编辑习惯" : "新建习惯"}</h3>
          <button onClick={onClose} className="text-[#94A3B8] text-2xl leading-none btn-press">×</button>
        </div>

        <div className="px-5 py-4 space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#475569] mb-1.5">习惯名称</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如：每天背 20 个单词"
              maxLength={30}
              className="w-full px-4 py-3 bg-[#F8FAFB] border border-slate-200 rounded-xl text-[15px] outline-none focus:border-[#3B82F6]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#475569] mb-2">图标</label>
            <div className="grid grid-cols-8 gap-1.5">
              {HABIT_ICONS.map((ic) => (
                <button
                  key={ic}
                  onClick={() => setIcon(ic)}
                  className={`aspect-square rounded-lg text-lg flex items-center justify-center btn-press ${
                    icon === ic ? "bg-[#3B82F6]/10 ring-1 ring-[#3B82F6]" : "bg-[#F8FAFB]"
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#475569] mb-2">颜色</label>
            <div className="flex gap-2.5 flex-wrap">
              {HABIT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-9 h-9 rounded-full btn-press flex items-center justify-center"
                  style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 2px ${c}` : "none" }}
                >
                  {color === c && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#475569] mb-2">频率</label>
            <div className="grid grid-cols-3 gap-2 bg-[#F1F5F9] rounded-xl p-1">
              {([
                { v: "daily", l: "每天" },
                { v: "weekly_count", l: "每周N次" },
                { v: "weekly_days", l: "指定星期" },
              ] as const).map((o) => (
                <button
                  key={o.v}
                  onClick={() => setFrequencyType(o.v)}
                  className={`py-2 rounded-lg text-xs font-medium btn-press ${
                    frequencyType === o.v ? "bg-white text-[#3B82F6] shadow-sm" : "text-[#64748B]"
                  }`}
                >
                  {o.l}
                </button>
              ))}
            </div>

            {frequencyType === "weekly_count" && (
              <div className="mt-3 flex items-center gap-3">
                <span className="text-sm text-[#475569]">每周</span>
                <input
                  type="range"
                  min={1}
                  max={7}
                  value={weeklyTarget}
                  onChange={(e) => setWeeklyTarget(Number(e.target.value))}
                  className="flex-1 accent-[#3B82F6]"
                />
                <span className="text-sm font-bold text-[#3B82F6] w-12 text-right">{weeklyTarget} 次</span>
              </div>
            )}

            {frequencyType === "weekly_days" && (
              <div className="mt-3 grid grid-cols-7 gap-1.5">
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                  <button
                    key={d}
                    onClick={() => toggleDay(d)}
                    className={`py-2 rounded-lg text-xs font-medium btn-press ${
                      weeklyDays.includes(d) ? "bg-[#3B82F6] text-white" : "bg-[#F1F5F9] text-[#64748B]"
                    }`}
                  >
                    {WEEKDAY_FULL[d]}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#475569] mb-1.5">提醒时间（选填）</label>
              <input
                type="time"
                value={remindTime}
                onChange={(e) => setRemindTime(e.target.value)}
                className="w-full px-3 py-3 bg-[#F8FAFB] border border-slate-200 rounded-xl text-[15px] outline-none focus:border-[#3B82F6]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#475569] mb-1.5">起始日期</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-3 bg-[#F8FAFB] border border-slate-200 rounded-xl text-[15px] outline-none focus:border-[#3B82F6]"
              />
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white px-5 py-3 border-t border-slate-100">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full min-h-[48px] bg-[#3B82F6] text-white rounded-xl font-semibold btn-press disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
