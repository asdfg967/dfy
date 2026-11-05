"use client";

import { useState } from "react";
import {
  LedgerRecord,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from "@/hooks/use-ledger";

export default function LedgerSheet({
  date,
  initial,
  onClose,
  onSubmit,
  onDelete,
}: {
  date: string;
  initial?: LedgerRecord | null;
  onClose: () => void;
  onSubmit: (data: {
    kind: "income" | "expense";
    amount: number;
    category: string;
    record_date: string;
    notes: string;
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [kind, setKind] = useState<"income" | "expense">(initial?.kind || "expense");
  const [amount, setAmount] = useState(initial?.amount || "");
  const [category, setCategory] = useState(
    initial?.category || "food"
  );
  const [recordDate, setRecordDate] = useState(initial?.record_date || date);
  const [notes, setNotes] = useState(initial?.notes || "");
  const [saving, setSaving] = useState(false);

  const cats = kind === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const switchKind = (k: "income" | "expense") => {
    setKind(k);
    setCategory(k === "income" ? "allowance" : "food");
  };

  const handleSubmit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      alert("请输入正确的金额");
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ kind, amount: amt, category, record_date: recordDate, notes: notes.trim() });
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
          <h3 className="text-base font-bold text-[#1E293B]">{initial ? "编辑记录" : "记一笔"}</h3>
          <button onClick={onClose} className="text-[#94A3B8] text-2xl leading-none btn-press">×</button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* 收支切换 */}
          <div className="grid grid-cols-2 gap-2 bg-[#F1F5F9] rounded-xl p-1">
            <button
              onClick={() => switchKind("expense")}
              className={`py-2.5 rounded-lg text-sm font-semibold btn-press transition-all ${
                kind === "expense" ? "bg-white text-[#EF4444] shadow-sm" : "text-[#64748B]"
              }`}
            >
              支出
            </button>
            <button
              onClick={() => switchKind("income")}
              className={`py-2.5 rounded-lg text-sm font-semibold btn-press transition-all ${
                kind === "income" ? "bg-white text-[#3B82F6] shadow-sm" : "text-[#64748B]"
              }`}
            >
              收入
            </button>
          </div>

          {/* 金额 */}
          <div className="flex items-center gap-2 px-4 py-4 bg-[#F8FAFB] rounded-xl">
            <span className="text-2xl font-bold text-[#1E293B]">¥</span>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              autoFocus
              className="flex-1 text-3xl font-bold bg-transparent outline-none text-[#1E293B]"
            />
          </div>

          {/* 分类 */}
          <div>
            <label className="block text-sm font-medium text-[#475569] mb-2">分类</label>
            <div className="grid grid-cols-4 gap-2">
              {cats.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className={`flex flex-col items-center gap-1 py-3 rounded-xl btn-press transition-all ${
                    category === c.value
                      ? "bg-[#3B82F6]/10 ring-1 ring-[#3B82F6]"
                      : "bg-[#F8FAFB]"
                  }`}
                >
                  <span className="text-2xl">{c.emoji}</span>
                  <span className="text-xs text-[#475569]">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 日期 */}
          <div>
            <label className="block text-sm font-medium text-[#475569] mb-1.5">日期</label>
            <input
              type="date"
              value={recordDate}
              onChange={(e) => setRecordDate(e.target.value)}
              className="w-full px-4 py-3 bg-[#F8FAFB] border border-slate-200 rounded-xl text-[15px] outline-none focus:border-[#3B82F6]"
            />
          </div>

          {/* 备注 */}
          <div>
            <label className="block text-sm font-medium text-[#475569] mb-1.5">备注（选填）</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="写点什么..."
              className="w-full px-4 py-3 bg-[#F8FAFB] border border-slate-200 rounded-xl text-[15px] outline-none focus:border-[#3B82F6]"
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-white px-5 py-3 border-t border-slate-100 flex gap-3">
          {initial && onDelete && (
            <button
              onClick={async () => {
                if (confirm("确定删除这条记录吗？")) {
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
