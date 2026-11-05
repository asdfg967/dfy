"use client";

import { useState, useMemo, useEffect } from "react";
import {
  useLedger,
  LedgerRecord,
  categoryMeta,
} from "@/hooks/use-ledger";
import LedgerSheet from "@/components/ledger-sheet";
import LedgerInsights from "@/components/ledger-insights";
import {
  getMondayOfWeek,
  localDateStr,
  parseLocalDate,
} from "@/lib/date-utils";
import { apiFetch } from "@/lib/api-client";

export default function LedgerPanel({ selectedDate }: { selectedDate: string }) {
  const weekMonday = useMemo(() => localDateStr(getMondayOfWeek(parseLocalDate(selectedDate))), [selectedDate]);
  const weekSunday = useMemo(() => {
    const d = parseLocalDate(weekMonday);
    d.setDate(d.getDate() + 6);
    return localDateStr(d);
  }, [weekMonday]);

  const { records, loading, initialBalance, addRecord, updateRecord, deleteRecord, saveInitialBalance } =
    useLedger(weekMonday, weekSunday);

  const [sheet, setSheet] = useState<{ open: boolean; record?: LedgerRecord | null }>({ open: false });
  const [showBalance, setShowBalance] = useState(false);
  const [balanceInput, setBalanceInput] = useState("");
  const [allRecords, setAllRecords] = useState<LedgerRecord[]>([]);

  useEffect(() => {
    apiFetch("/api/ledger?start_date=2000-01-01&end_date=2100-12-31")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setAllRecords(j.data);
      });
  }, [records]);

  const dayRecords = useMemo(
    () => records.filter((r) => r.record_date === selectedDate),
    [records, selectedDate]
  );

  const sum = (list: LedgerRecord[], kind: string) =>
    list.filter((r) => r.kind === kind).reduce((s, r) => s + Number(r.amount), 0);

  const dayIncome = sum(dayRecords, "income");
  const dayExpense = sum(dayRecords, "expense");
  const weekIncome = sum(records, "income");
  const weekExpense = sum(records, "expense");

  const totalBalance = useMemo(
    () =>
      initialBalance +
      allRecords.filter((r) => r.kind === "income").reduce((s, r) => s + Number(r.amount), 0) -
      allRecords.filter((r) => r.kind === "expense").reduce((s, r) => s + Number(r.amount), 0),
    [initialBalance, allRecords]
  );

  const fmt = (n: number) => n.toFixed(2);

  return (
    <div className="px-4 pt-3 pb-4">
      <div className="rounded-2xl p-5 text-white mb-3" style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)" }}>
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/80">累计余额</span>
          <button
            onClick={() => { setBalanceInput(String(initialBalance)); setShowBalance(true); }}
            className="text-xs text-white/80 btn-press"
          >
            设置初始余额
          </button>
        </div>
        <div className="text-3xl font-bold mt-1">¥ {fmt(totalBalance)}</div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-white/15 rounded-xl px-3 py-2">
            <div className="text-[11px] text-white/80">本周收入</div>
            <div className="text-base font-semibold">+¥{fmt(weekIncome)}</div>
          </div>
          <div className="bg-white/15 rounded-xl px-3 py-2">
            <div className="text-[11px] text-white/80">本周支出</div>
            <div className="text-base font-semibold">-¥{fmt(weekExpense)}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white rounded-xl py-3 text-center shadow-sm">
          <div className="text-[11px] text-[#94A3B8]">当日收入</div>
          <div className="text-sm font-bold text-[#3B82F6]">+{fmt(dayIncome)}</div>
        </div>
        <div className="bg-white rounded-xl py-3 text-center shadow-sm">
          <div className="text-[11px] text-[#94A3B8]">当日支出</div>
          <div className="text-sm font-bold text-[#EF4444]">-{fmt(dayExpense)}</div>
        </div>
        <div className="bg-white rounded-xl py-3 text-center shadow-sm">
          <div className="text-[11px] text-[#94A3B8]">当日结余</div>
          <div className={`text-sm font-bold ${dayIncome - dayExpense >= 0 ? "text-[#3B82F6]" : "text-[#EF4444]"}`}>
            {fmt(dayIncome - dayExpense)}
          </div>
        </div>
      </div>

      <LedgerInsights />

      <button
        onClick={() => setSheet({ open: true })}
        className="w-full min-h-[48px] bg-[#3B82F6] text-white rounded-xl font-semibold mb-4 btn-press"
      >
        ＋ 记一笔
      </button>

      <h3 className="text-sm font-bold text-[#475569] mb-2">
        {parseLocalDate(selectedDate).getMonth() + 1}月{parseLocalDate(selectedDate).getDate()}日 流水
      </h3>
      {loading ? (
        <div className="text-center py-8 text-[#94A3B8] text-sm">加载中...</div>
      ) : dayRecords.length === 0 ? (
        <div className="text-center py-8 text-[#CBD5E1] text-sm">这天还没有记录</div>
      ) : (
        <div className="space-y-2">
          {dayRecords.map((r) => {
            const meta = categoryMeta(r.category, r.kind);
            return (
              <div key={r.id} className="bg-white rounded-xl px-3 py-3 flex items-center gap-3 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-[#F8FAFB] flex items-center justify-center text-xl shrink-0">
                  {meta.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium text-[#1E293B]">{meta.label}</div>
                  {r.notes && <div className="text-[11px] text-[#94A3B8] truncate">{r.notes}</div>}
                </div>
                <div className={`text-[15px] font-bold shrink-0 ${r.kind === "income" ? "text-[#3B82F6]" : "text-[#EF4444]"}`}>
                  {r.kind === "income" ? "+" : "-"}¥{fmt(Number(r.amount))}
                </div>
                <button
                  onClick={() => setSheet({ open: true, record: r })}
                  className="text-[#CBD5E1] btn-press shrink-0 px-1"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {sheet.open && (
        <LedgerSheet
          date={selectedDate}
          initial={sheet.record}
          onClose={() => setSheet({ open: false })}
          onSubmit={async (data) => {
            if (sheet.record) {
              await updateRecord(sheet.record.id, data);
            } else {
              await addRecord(data);
            }
          }}
          onDelete={sheet.record ? () => deleteRecord(sheet.record!.id) : undefined}
        />
      )}

      {showBalance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-8">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowBalance(false)} />
          <div className="relative w-full max-w-[480px] bg-white rounded-2xl p-5">
            <h3 className="text-base font-bold text-[#1E293B] mb-3">设置初始余额</h3>
            <input
              type="number"
              value={balanceInput}
              onChange={(e) => setBalanceInput(e.target.value)}
              className="w-full px-4 py-3 bg-[#F8FAFB] border border-slate-200 rounded-xl text-lg outline-none focus:border-[#3B82F6]"
              placeholder="0.00"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowBalance(false)} className="flex-1 py-3 text-[#64748B] btn-press">取消</button>
              <button
                onClick={async () => {
                  await saveInitialBalance(Number(balanceInput) || 0);
                  setShowBalance(false);
                }}
                className="flex-1 py-3 bg-[#3B82F6] text-white rounded-xl font-semibold btn-press"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
