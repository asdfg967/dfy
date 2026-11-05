"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Diary } from "@/lib/diary-types";
import { localDateStr } from "@/lib/date-utils";
import DiaryEditSheet, { DiaryFormData } from "@/components/diary-edit-sheet";
import { apiFetch } from "@/lib/api-client";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

export default function DiaryTab() {
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Diary | null>(null);
  const [writeDate, setWriteDate] = useState<string>(localDateStr(new Date()));
  const [calMonth, setCalMonth] = useState(localDateStr(new Date()).slice(0, 7));
  const [showCalendar, setShowCalendar] = useState(false);
  const [viewer, setViewer] = useState<{ images: string[]; idx: number } | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const todayStr = localDateStr(new Date());

  const fetchDiaries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/diaries");
      const json = await res.json();
      if (json.success) setDiaries(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiaries();
  }, [fetchDiaries]);

  const dateSet = useMemo(() => new Set(diaries.map((d) => d.diary_date)), [diaries]);
  const diaryMap = useMemo(() => {
    const m: Record<string, Diary> = {};
    diaries.forEach((d) => (m[d.diary_date] = d));
    return m;
  }, [diaries]);

  const handleSave = async (data: DiaryFormData) => {
    const url = editing ? `/api/diaries/${editing.id}` : "/api/diaries";
    const method = editing ? "PUT" : "POST";
    const payload = editing
      ? { ...data, image_keys: data.image_keys }
      : data;
    const res = await apiFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.success) {
      alert(json.error || "保存失败");
      throw new Error(json.error);
    }
    // 后台异步触发 AI 分析，完成后静默刷新
    const diaryId = editing?.id || json.data?.id;
    if (diaryId) {
      setAnalyzingId(diaryId);
      apiFetch("/api/ai/diary-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diary_id: diaryId }),
      })
        .then((r) => r.json())
        .then((j) => {
          if (j.success) fetchDiaries();
        })
        .catch(() => {})
        .finally(() => setAnalyzingId(null));
    }
    await fetchDiaries();
  };

  const reAnalyze = (diary: Diary) => {
    setAnalyzingId(diary.id);
    apiFetch("/api/ai/diary-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ diary_id: diary.id }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.success) fetchDiaries();
      })
      .catch(() => {})
      .finally(() => setAnalyzingId(null));
  };

  const handleDelete = async (diary: Diary) => {
    if (!confirm("确定删除这篇日记吗？")) return;
    const res = await apiFetch(`/api/diaries/${diary.id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) setDiaries((prev) => prev.filter((d) => d.id !== diary.id));
  };

  const openWrite = (dateStr?: string) => {
    const target = dateStr || todayStr;
    const existing = diaryMap[target];
    setEditing(existing || null);
    setWriteDate(target);
    setEditOpen(true);
  };

  // 日历格子
  const calendarCells = useMemo(() => {
    const [y, m] = calMonth.split("-").map(Number);
    const firstDay = new Date(y, m - 1, 1).getDay();
    const daysInMonth = new Date(y, m, 0).getDate();
    const cells: (string | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(`${calMonth}-${String(d).padStart(2, "0")}`);
    return cells;
  }, [calMonth]);

  const changeMonth = (delta: number) => {
    const [y, m] = calMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const formatHeader = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    const md = `${d.getMonth() + 1}月${d.getDate()}日`;
    const wd = `星期${WEEKDAYS[d.getDay()]}`;
    const isToday = dateStr === todayStr;
    return { md, wd, isToday };
  };

  const [cy, cm] = calMonth.split("-").map(Number);

  return (
    <div className="min-h-screen bg-[#F8FAFB] pb-24">
      {/* 顶部 */}
      <div className="bg-white sticky top-0 z-30 safe-top px-5 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-[#1E293B]">我的日记</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCalendar((v) => !v)}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#EFF6FF] text-[#3B82F6] btn-press"
              aria-label="日历"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            </button>
            <button
              onClick={() => openWrite()}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-[#3B82F6] text-white rounded-xl text-sm font-semibold btn-press shadow-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
              写日记
            </button>
          </div>
        </div>
      </div>

      {/* 小日历 */}
      {showCalendar && (
        <div className="bg-white mx-4 mt-3 rounded-2xl shadow-sm p-4 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => changeMonth(-1)} className="w-8 h-8 flex items-center justify-center text-[#64748B] btn-press">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <span className="text-sm font-semibold text-[#1E293B]">{cy}年{cm}月</span>
            <button onClick={() => changeMonth(1)} className="w-8 h-8 flex items-center justify-center text-[#64748B] btn-press">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-center text-[10px] text-[#94A3B8] py-0.5">{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((dateStr, i) => {
              if (!dateStr) return <div key={`e${i}`} />;
              const has = dateSet.has(dateStr);
              const dayNum = Number(dateStr.slice(8));
              const isToday = dateStr === todayStr;
              return (
                <button
                  key={dateStr}
                  onClick={() => {
                    if (has) openWrite(dateStr);
                  }}
                  className="aspect-square rounded-lg flex flex-col items-center justify-center relative btn-press"
                  style={{
                    backgroundColor: isToday ? "#DBEAFE" : "transparent",
                  }}
                >
                  <span className={`text-xs ${isToday ? "text-[#2563EB] font-bold" : has ? "text-[#1E293B] font-medium" : "text-[#CBD5E1]"}`}>
                    {dayNum}
                  </span>
                  {has && <span className="w-1 h-1 rounded-full bg-[#3B82F6] mt-0.5" />}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-[#CBD5E1] text-center mt-2">有绿点的日期写了日记，点击可查看/编辑</p>
        </div>
      )}

      {/* 信息流 */}
      <div className="px-4 pt-3 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-[3px] border-[#3B82F6]/30 border-t-[#3B82F6] rounded-full animate-spin" />
          </div>
        ) : diaries.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📔</div>
            <p className="text-[#94A3B8] text-[15px] mb-2">还没有日记</p>
            <p className="text-[#CBD5E1] text-sm">点击右上角，写下今天的故事吧</p>
          </div>
        ) : (
          diaries.map((diary) => {
            const h = formatHeader(diary.diary_date);
            return (
              <div key={diary.id} className="bg-white rounded-2xl p-4 shadow-sm animate-fade-up">
                {/* 头部 */}
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#60A5FA] flex items-center justify-center text-white text-sm font-bold">
                      {Number(diary.diary_date.slice(8))}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-[#1E293B]">{h.md}</span>
                        {h.isToday && <span className="text-[10px] bg-[#DBEAFE] text-[#2563EB] px-1.5 py-0.5 rounded">今天</span>}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#94A3B8]">
                        <span>{h.wd}</span>
                        {diary.mood && <span>{diary.mood}</span>}
                        {diary.weather && <span>{diary.weather}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => { setEditing(diary); setEditOpen(true); }} className="text-[#94A3B8] btn-press">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </button>
                    <button onClick={() => handleDelete(diary)} className="text-[#EF4444]/70 btn-press">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                    </button>
                  </div>
                </div>

                {/* 正文 */}
                {diary.content && (
                  <p className="text-[15px] text-[#334155] leading-relaxed whitespace-pre-wrap mb-3">{diary.content}</p>
                )}

                {/* 图片九宫格 */}
                {diary.images && diary.images.length > 0 && (
                  <div className={`grid gap-1.5 ${diary.images.length === 1 ? "grid-cols-1" : diary.images.length === 2 || diary.images.length === 4 ? "grid-cols-2" : "grid-cols-3"}`}>
                    {diary.images.map((url, i) => (
                      <button
                        key={i}
                        onClick={() => setViewer({ images: diary.images!, idx: i })}
                        className={`overflow-hidden rounded-lg ${diary.images!.length === 1 ? "max-h-72" : "aspect-square"}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className={`w-full ${diary.images!.length === 1 ? "h-72" : "h-full"} object-cover`} loading="lazy" />
                      </button>
                    ))}
                  </div>
                )}

                {/* 位置 */}
                {diary.location && (
                  <div className="flex items-center gap-1 mt-3 text-xs text-[#94A3B8]">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                    {diary.location}
                  </div>
                )}

                {/* AI 陪伴反馈 */}
                {analyzingId === diary.id ? (
                  <div className="mt-3 bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] rounded-xl p-3.5 flex items-center gap-2.5">
                    <div className="w-4 h-4 border-2 border-[#3B82F6]/30 border-t-[#3B82F6] rounded-full animate-spin shrink-0" />
                    <span className="text-xs text-[#3B82F6]">Deep 大肥鱼正在读你的日记...</span>
                  </div>
                ) : diary.ai_feedback && (diary.ai_feedback.mood_analysis || diary.ai_feedback.comfort) ? (
                  <div className="mt-3 bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] rounded-xl p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-[#2563EB]">
                        Deep 大肥鱼 · AI 陪伴
                      </span>
                      <button
                        onClick={() => reAnalyze(diary)}
                        className="text-[10px] text-[#60A5FA] btn-press"
                      >
                        重新分析
                      </button>
                    </div>
                    {diary.ai_feedback.mood_analysis && (
                      <div className="text-xs text-[#1E40AF] mb-1.5">
                        {diary.ai_feedback.mood_analysis}
                      </div>
                    )}
                    {diary.ai_feedback.comfort && (
                      <p className="text-[13px] text-[#334155] leading-relaxed mb-1.5">
                        💙 {diary.ai_feedback.comfort}
                      </p>
                    )}
                    {diary.ai_feedback.life_advice && (
                      <p className="text-[13px] text-[#334155] leading-relaxed mb-1.5">
                        🌱 {diary.ai_feedback.life_advice}
                      </p>
                    )}
                    {diary.ai_feedback.social_advice && (
                      <p className="text-[13px] text-[#334155] leading-relaxed">
                        🤝 {diary.ai_feedback.social_advice}
                      </p>
                    )}
                  </div>
                ) : diary.content ? (
                  <button
                    onClick={() => reAnalyze(diary)}
                    className="mt-3 text-xs text-[#60A5FA] btn-press"
                  >
                    ✨ 让 AI 读一读这篇日记
                  </button>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      {editOpen && (
        <DiaryEditSheet
          initial={editing}
          defaultDate={writeDate}
          onClose={() => setEditOpen(false)}
          onSubmit={handleSave}
        />
      )}

      {/* 图片大图查看 */}
      {viewer && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center" onClick={() => setViewer(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={viewer.images[viewer.idx]} alt="" className="max-w-full max-h-full object-contain" />
          <button className="absolute top-6 right-5 text-white/80 text-3xl" onClick={() => setViewer(null)}>×</button>
          {viewer.images.length > 1 && (
            <div className="absolute bottom-8 left-0 right-0 text-center text-white/70 text-sm">
              {viewer.idx + 1} / {viewer.images.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
