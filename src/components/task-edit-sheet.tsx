"use client";

import { Task, TYPE_LABELS } from "@/hooks/use-tasks";
import { useState } from "react";

interface TaskEditSheetProps {
  task: Task;
  onSave: (id: string, data: Partial<Task>) => Promise<void>;
  onClose: () => void;
}

export default function TaskEditSheet({ task, onSave, onClose }: TaskEditSheetProps) {
  const [title, setTitle] = useState(task.title);
  const [type, setType] = useState(task.type);
  const [dueDate, setDueDate] = useState(() => {
    if (!task.due_date) return "";
    const d = new Date(task.due_date);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  });
  const [location, setLocation] = useState(task.location || "");
  const [notes, setNotes] = useState(task.notes || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave(task.id, {
        title: title.trim(),
        type,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        location: location.trim() || null,
        notes: notes.trim() || null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const types = Object.entries(TYPE_LABELS);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[480px] bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto safe-bottom">
        {/* Header */}
        <div className="sticky top-0 bg-white px-5 pt-4 pb-3 border-b border-[#E2E8F0] flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#1E293B]">编辑事项</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="px-5 py-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-[#64748B] mb-1.5">标题</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-3 rounded-xl border border-[#E2E8F0] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30 focus:border-[#3B82F6]"
              placeholder="事项标题"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-[#64748B] mb-1.5">类型</label>
            <div className="flex flex-wrap gap-2">
              {types.map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setType(value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all btn-press ${
                    type === value
                      ? "bg-[#3B82F6] text-white"
                      : "bg-[#F1F5F9] text-[#64748B]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-[#64748B] mb-1.5">截止时间</label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full px-3 py-3 rounded-xl border border-[#E2E8F0] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30 focus:border-[#3B82F6]"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-[#64748B] mb-1.5">地点</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="w-full px-3 py-3 rounded-xl border border-[#E2E8F0] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30 focus:border-[#3B82F6]"
              placeholder="地点（可选）"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-[#64748B] mb-1.5">备注</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-3 rounded-xl border border-[#E2E8F0] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30 focus:border-[#3B82F6] resize-none"
              rows={3}
              placeholder="备注说明（可选）"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white px-5 py-4 border-t border-[#E2E8F0]">
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="w-full py-3.5 rounded-xl bg-[#3B82F6] text-white font-semibold text-[16px] btn-press disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "保存中..." : "保存修改"}
          </button>
        </div>
      </div>
    </div>
  );
}
