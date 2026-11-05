"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { apiFetch } from "@/lib/api-client";

interface PieItem {
  name: string;
  value: number;
  color: string;
  percent: number;
}

interface InsightData {
  total_expense: number;
  total_income: number;
  pie_data: PieItem[];
  summary: string;
  suggestions: string[];
  ai_available: boolean;
}

export default function LedgerInsights() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<InsightData | null>(null);
  const [error, setError] = useState("");

  const analyze = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/api/ai/ledger-advice?days=30");
      const j = await res.json();
      if (j.success) {
        setData(j.data);
        setOpen(true);
      } else {
        setError(j.error || "分析失败");
      }
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <div className="mb-3">
        <button
          onClick={analyze}
          disabled={loading}
          className="w-full h-12 rounded-2xl bg-white border border-[#BFDBFE] text-[#2563EB] text-sm font-medium shadow-sm btn-press flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.4-1.6 3.2-.9.9-1.4 1.6-1.4 2.8" />
            <circle cx="12" cy="17" r="1" />
            <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" />
          </svg>
          {loading ? "AI 正在分析你的账单..." : "AI 账单分析（近30天）"}
        </button>
        {error && (
          <div className="mt-2 text-xs text-[#EF4444] bg-[#FEF2F2] rounded-xl px-3 py-2">
            {error}
          </div>
        )}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 mb-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[15px] font-semibold text-[#1E293B]">
          AI 账单分析 · 近30天
        </h3>
        <button
          onClick={() => setOpen(false)}
          className="text-xs text-[#94A3B8] btn-press px-2 py-1"
        >
          收起
        </button>
      </div>

      {/* 饼图 */}
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data.pie_data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={72}
              paddingAngle={3}
              strokeWidth={0}
            >
              {data.pie_data.map((item) => (
                <Cell key={item.name} fill={item.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [
                `¥${Number(value ?? 0).toFixed(2)}`,
                name ?? "",
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* 图例 */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 justify-center mb-3">
        {data.pie_data.map((item) => (
          <div key={item.name} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: item.color }}
            />
            <span className="text-xs text-[#475569]">
              {item.name} {item.percent}%
            </span>
          </div>
        ))}
      </div>

      {/* 收支概览 */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-[#F0F9FF] rounded-xl py-2 text-center">
          <div className="text-[11px] text-[#64748B]">总支出</div>
          <div className="text-sm font-bold text-[#EF4444]">
            -¥{data.total_expense.toFixed(2)}
          </div>
        </div>
        <div className="bg-[#EFF6FF] rounded-xl py-2 text-center">
          <div className="text-[11px] text-[#64748B]">总收入</div>
          <div className="text-sm font-bold text-[#16A34A]">
            +¥{data.total_income.toFixed(2)}
          </div>
        </div>
      </div>

      {/* AI 建议 */}
      {data.ai_available ? (
        <div className="bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] rounded-xl p-3.5">
          {data.summary && (
            <p className="text-[13px] text-[#1E40AF] leading-relaxed mb-2">
              {data.summary}
            </p>
          )}
          <div className="space-y-1.5">
            {data.suggestions.map((s, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-[#3B82F6] text-xs mt-0.5 shrink-0">
                  {i + 1}.
                </span>
                <p className="text-[13px] text-[#334155] leading-relaxed">{s}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-[#94A3B8] text-center py-2">
          AI 建议暂时不可用，图表统计正常
        </p>
      )}
    </div>
  );
}
