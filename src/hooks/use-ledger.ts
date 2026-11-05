"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api-client";

export interface LedgerRecord {
  id: string;
  kind: "income" | "expense";
  amount: string;
  category: string;
  record_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LedgerInput {
  kind: "income" | "expense";
  amount: number;
  category: string;
  record_date: string;
  notes: string;
}

export const EXPENSE_CATEGORIES: { value: string; label: string; emoji: string }[] = [
  { value: "food", label: "餐饮", emoji: "🍜" },
  { value: "study", label: "学习", emoji: "📚" },
  { value: "transport", label: "交通", emoji: "🚌" },
  { value: "shopping", label: "购物", emoji: "🛍️" },
  { value: "entertainment", label: "娱乐", emoji: "🎮" },
  { value: "life", label: "生活", emoji: "🧴" },
  { value: "other_expense", label: "其他", emoji: "📦" },
];

export const INCOME_CATEGORIES: { value: string; label: string; emoji: string }[] = [
  { value: "allowance", label: "生活费", emoji: "💰" },
  { value: "scholarship", label: "奖学金", emoji: "🏆" },
  { value: "parttime", label: "兼职", emoji: "💼" },
  { value: "redpacket", label: "红包", emoji: "🧧" },
  { value: "other_income", label: "其他", emoji: "✨" },
];

export function categoryMeta(category: string, kind: string) {
  const list = kind === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return list.find((c) => c.value === category) || { value: category, label: "其他", emoji: "📦" };
}

export function useLedger(startDate: string, endDate: string) {
  const [records, setRecords] = useState<LedgerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialBalance, setInitialBalance] = useState(0);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const [recRes, setRes] = await Promise.all([
        apiFetch(`/api/ledger?start_date=${startDate}&end_date=${endDate}`).then((r) => r.json()),
        apiFetch("/api/settings").then((r) => r.json()),
      ]);
      if (recRes.success) setRecords(recRes.data);
      if (setRes.success) {
        setInitialBalance(Number(setRes.data?.initial_balance || 0));
      }
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const addRecord = useCallback(async (data: Partial<LedgerInput>) => {
    const res = await apiFetch("/api/ledger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.success) await fetchRecords();
    return json;
  }, [fetchRecords]);

  const updateRecord = useCallback(async (id: string, data: Partial<LedgerInput>) => {
    const res = await apiFetch(`/api/ledger/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.success) await fetchRecords();
    return json;
  }, [fetchRecords]);

  const deleteRecord = useCallback(async (id: string) => {
    const res = await apiFetch(`/api/ledger/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) await fetchRecords();
    return json;
  }, [fetchRecords]);

  const saveInitialBalance = useCallback(async (v: number) => {
    const res = await apiFetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "initial_balance", value: String(v) }),
    });
    const json = await res.json();
    if (json.success) setInitialBalance(v);
    return json;
  }, []);

  return {
    records,
    loading,
    initialBalance,
    fetchRecords,
    addRecord,
    updateRecord,
    deleteRecord,
    saveInitialBalance,
  };
}
