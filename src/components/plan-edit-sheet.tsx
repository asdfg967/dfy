"use client";

import { useState } from "react";
import { Task } from "@/hooks/use-tasks";

const COLORS = [
  { value: "#3B82F6", label: "薄荷绿" },
  { value: "#3B82F6", label: "学习蓝" },
  { value: "#F59E0B", label: "活力橙" },
  { value: "#8B5CF6", label: "紫色" },
  { value: "#EC4899", label: "粉色" },
  { value: "#06B6D4", label: "青色" },
  { value: "#EF4444", label: "红色" },
  { value: "#64748B", label: "灰色" },
];

function toInputValue(date: string, hourFloat: number): string {
  const hh = Math.floor(hourFloat);
  const mm = Math.round((hourFloat - hh) * 60);
  return `${date}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export interface PlanFormData {
  title: string;
  date: string;
  startHour: number; // 0-24
  endHour: number;
  color: string;
  notes: string;
}

export default function PlanEditSheet({
  initial,
  date,
  onClose,
  onSubmit,
  onDelete,
}: {
  initial?: Task | null;
  date: string;
  onClose: () => void;
  onSubmit: (data: PlanFormData) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title || "");
  const startInit = initial?.start_time
    ? new Date(initial.start_time)
    : new Date(`${date}T09:00`);
  const endInit = initial?.due_date
    ? new Date(initial.due_date)
    : new Date(`${date}T10:00`);
  const [start, setStart] = useState(toInputValue(date, startInit.getHours() + startInit.getMinutes() / 60));
  const [end, setEnd] = useState(toInputValue(date, endInit.getHours() + endInit.getMinutes() / 60));
  const [color, setColor] = useState(initial?.color || COLORS[0].value);
  const [notes, setNotes] = useState(initial?.notes || "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert("请输入计划标题");
      return;
    }
    const [sd, st] = start.split("T");
    const [ed, et] = end.split("T");
    const startDt = new Date(`${sd}T${st}:00`);
    const endDt = new Date(`${ed}T${et}:00`);
    if (endDt.getTime() <= startDt.getTime()) {
      alert("结束时间要晚于开始时间");
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        title: title.trim(),
        date: sd,
        startHour: startDt.getHours() + startDt.getMinutes() / 60,
        endHour: endDt.getHours() + endDt.getMinutes() / 60,
        color,
        notes: notes.trim(),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[480px] bg-white rounded-t-3xl max-h-[88vh] overflow-y-auto animate-slide-up">
        <div className="sticky top-0 bg-white px-5 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-[#1E293B]">{initial ? "编辑时间块" : "新增安排"}</h3>
          <button onClick={onClose} className="text-[#94A3B8] text-2xl leading-none btn-press">×</button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#475569] mb-1.5">标题</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="如：自习 / 打球 / 背单词"
              className="w-full px-4 py-3 bg-[#F8FAFB] border border-slate-200 rounded-xl text-[15px] outline-none focus:border-[#3B82F6]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#475569] mb-1.5">开始</label>
              <input
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full px-3 py-3 bg-[#F8FAFB] border border-slate-200 rounded-xl text-[15px] outline-none focus:border-[#3B82F6]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#475569] mb-1.5">结束</label>
              <input
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full px-3 py-3 bg-[#F8FAFB] border border-slate-200 rounded-xl text-[15px] outline-none focus:border-[#3B82F6]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#475569] mb-1.5">颜色</label>
            <div className="flex gap-2.5 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={`w-9 h-9 rounded-full btn-press flex items-center justify-center ${
                    color === c.value ? "ring-2 ring-offset-2" : ""
                  }`}
                  style={{ backgroundColor: c.value, boxShadow: color === c.value ? `0 0 0 2px ${c.value}` : "none" }}
                >
                  {color === c.value && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#475569] mb-1.5">备注（选填）</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="补充说明..."
              className="w-full px-4 py-3 bg-[#F8FAFB] border border-slate-200 rounded-xl text-[15px] outline-none focus:border-[#3B82F6] resize-none"
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-white px-5 py-3 border-t border-slate-100 flex gap-3">
          {initial && onDelete && (
            <button
              onClick={async () => {
                if (confirm("确定删除这个时间块吗？")) {
                  await onDelete();
                  onClose();
                }
              }}
              className="px-5 py-3 text-red-500 font-medium btn-press"
            >
              删除
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 min-h-[48px] bg-[#3B82F6] text-white rounded-xl font-semibold btn-press disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
