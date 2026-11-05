"use client";

import { Task, TYPE_LABELS } from "@/hooks/use-tasks";
import { useState } from "react";

interface ConfirmSheetProps {
  items: Array<{
    title: string;
    type: string;
    due_date: string | null;
    location: string | null;
    notes: string | null;
  }>;
  onConfirm: (items: Array<Partial<Task>>) => Promise<void>;
  onClose: () => void;
}

export default function ConfirmSheet({ items, onConfirm, onClose }: ConfirmSheetProps) {
  const [editedItems, setEditedItems] = useState(items);
  const [saving, setSaving] = useState(false);

  const types = Object.entries(TYPE_LABELS);

  const updateItem = (index: number, field: string, value: string | null) => {
    setEditedItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const removeItem = (index: number) => {
    setEditedItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = async () => {
    if (editedItems.length === 0) return;
    setSaving(true);
    try {
      await onConfirm(editedItems);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const formatSimpleDate = (dateStr: string | null): string => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[480px] bg-white rounded-t-2xl max-h-[90vh] overflow-y-auto safe-bottom">
        {/* Header */}
        <div className="sticky top-0 bg-white px-5 pt-4 pb-3 border-b border-[#E2E8F0] flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-semibold text-[#1E293B]">确认提取结果</h2>
            <p className="text-[13px] text-[#94A3B8] mt-0.5">共识别 {editedItems.length} 个事项，可修改后保存</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="px-5 py-4 space-y-4">
          {editedItems.length === 0 && (
            <div className="text-center py-8 text-[#94A3B8]">
              <p>没有识别到事项</p>
            </div>
          )}
          {editedItems.map((item, index) => (
            <div key={index} className="bg-[#F8FAFB] rounded-xl p-4 space-y-3 relative">
              <button
                onClick={() => removeItem(index)}
                className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full bg-red-50 text-red-400 hover:text-red-600 btn-press"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1">标题</label>
                <input
                  type="text"
                  value={item.title}
                  onChange={e => updateItem(index, "title", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E2E8F0] text-[14px] bg-white focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30 focus:border-[#3B82F6]"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1">类型</label>
                <div className="flex flex-wrap gap-1.5">
                  {types.map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => updateItem(index, "type", value)}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all btn-press ${
                        item.type === value
                          ? "bg-[#3B82F6] text-white"
                          : "bg-white text-[#64748B] border border-[#E2E8F0]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1">截止时间</label>
                <input
                  type="datetime-local"
                  value={formatSimpleDate(item.due_date)}
                  onChange={e => {
                    const val = e.target.value ? new Date(e.target.value).toISOString() : null;
                    updateItem(index, "due_date", val);
                  }}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E2E8F0] text-[14px] bg-white focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30 focus:border-[#3B82F6]"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1">地点</label>
                <input
                  type="text"
                  value={item.location || ""}
                  onChange={e => updateItem(index, "location", e.target.value || null)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E2E8F0] text-[14px] bg-white focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30 focus:border-[#3B82F6]"
                  placeholder="无"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white px-5 py-4 border-t border-[#E2E8F0]">
          <button
            onClick={handleConfirm}
            disabled={saving || editedItems.length === 0}
            className="w-full py-3.5 rounded-xl bg-[#3B82F6] text-white font-semibold text-[16px] btn-press disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "保存中..." : `保存 ${editedItems.length} 个事项`}
          </button>
        </div>
      </div>
    </div>
  );
}
