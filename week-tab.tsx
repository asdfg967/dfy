"use client";

import { useState, useMemo, useEffect } from "react";
import { useTasks, Task } from "@/hooks/use-tasks";
import {
  getWeekDays,
  localDateStr,
  WEEKDAY_LABELS,
  isSameLocalDay,
  urgencyOf,
  URGENCY_DOT,
} from "@/lib/date-utils";
import { TYPE_LABELS } from "@/hooks/use-tasks";
import PlanEditSheet, { PlanFormData } from "@/components/plan-edit-sheet";
import LedgerPanel from "@/components/ledger-panel";

const TYPE_HEX: Record<string, string> = {
  homework: "#3B82F6",
  exam: "#EF4444",
  meeting: "#8B5CF6",
  payment: "#F59E0B",
  checkin: "#06B6D4",
  other: "#64748B",
};

const HOUR_START = 6;
const HOUR_END = 24;
const HOUR_HEIGHT = 56; // px per hour

export default function WeekTab() {
  const { tasks, createTask, updateTask, deleteTask } = useTasks();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(localDateStr(new Date()));
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<"timeline" | "ledger">("timeline");
  const [planSheet, setPlanSheet] = useState<{ open: boolean; task?: Task | null }>({ open: false });
  const [assignTask, setAssignTask] = useState<Task | null>(null);

  useEffect(() => setMounted(true), []);

  const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset]);
  const todayStr = mounted ? localDateStr(new Date()) : selectedDate;
  const isCurrentWeek = weekOffset === 0;

  // 每周的事项按天分组（依据 due_date 的日期）
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach((t) => {
      if (!t.due_date) return;
      const d = new Date(t.due_date);
      const key = localDateStr(d);
      (map[key] = map[key] || []).push(t);
    });
    return map;
  }, [tasks]);

  // 选中日的事项
  const dayTasks = useMemo(() => tasksByDate[selectedDate] || [], [tasksByDate, selectedDate]);

  // 有具体时间（有 start_time，或非手动任务有 due_date 的时间且非 23:59/00:00）
  // 简化：手动计划用 start_time~due_date；通知待办若 due_date 的分钟非整点边界则视为有时间
  const timedTasks = useMemo(() => {
    return dayTasks
      .filter((t) => {
        if (t.status === "completed") return false;
        if (t.is_manual) return !!t.start_time;
        // 通知任务：有 due_date 即显示在对应小时
        return !!t.due_date;
      })
      .map((t) => {
        const start = t.start_time ? new Date(t.start_time) : new Date(t.due_date!);
        const end = t.due_date ? new Date(t.due_date) : new Date(start.getTime() + 60 * 60 * 1000);
        const startHour = start.getHours() + start.getMinutes() / 60;
        const endHour = end.getHours() + end.getMinutes() / 60;
        return { task: t, startHour, endHour: endHour > startHour ? endHour : startHour + 1 };
      });
  }, [dayTasks]);

  // 全天/待安排：有日期但无具体时间
  const allDayTasks = useMemo(() => {
    return dayTasks.filter((t) => {
      if (t.status === "completed") return false;
      if (t.is_manual) return !t.start_time;
      // 通知任务：若截止时间正好是 23:59 或 00:00，视为无具体时间
      if (!t.due_date) return true;
      const d = new Date(t.due_date);
      const mins = d.getHours() * 60 + d.getMinutes();
      return mins === 23 * 60 + 59 || mins === 0;
    });
  }, [dayTasks]);

  const handleSavePlan = async (data: PlanFormData) => {
    const startIso = new Date(`${data.date}T${String(Math.floor(data.startHour)).padStart(2, "0")}:${String(Math.round((data.startHour % 1) * 60)).padStart(2, "0")}:00`).toISOString();
    const endIso = new Date(`${data.date}T${String(Math.floor(data.endHour)).padStart(2, "0")}:${String(Math.round((data.endHour % 1) * 60)).padStart(2, "0")}:00`).toISOString();
    if (planSheet.task) {
      await updateTask(planSheet.task.id, {
        title: data.title,
        start_time: startIso,
        due_date: endIso,
        color: data.color,
        notes: data.notes || null,
      });
    } else {
      await createTask({
        title: data.title,
        type: "plan",
        start_time: startIso,
        due_date: endIso,
        is_manual: true,
        color: data.color,
        notes: data.notes || null,
      });
    }
  };

  // 给待安排事项指定时间
  const handleAssignTime = async (task: Task, hour: number) => {
    const date = selectedDate;
    const hh = String(hour).padStart(2, "0");
    const startIso = new Date(`${date}T${hh}:00:00`).toISOString();
    const endIso = new Date(`${date}T${String(Math.min(hour + 1, 23)).padStart(2, "0")}:59:00`).toISOString();
    await updateTask(task.id, { start_time: startIso, due_date: endIso, is_manual: true });
    setAssignTask(null);
  };

  const blockColor = (t: Task) => {
    if (t.is_manual && t.color) return t.color;
    return TYPE_HEX[t.type] || TYPE_HEX.other;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFB] pb-24">
      {/* 顶部 */}
      <div className="bg-white sticky top-0 z-30 safe-top">
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <h1 className="text-xl font-bold text-[#1E293B]">周历</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setView(view === "timeline" ? "ledger" : "timeline")}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-[#F0FDF4] text-[#10B981] btn-press"
            >
              {view === "timeline" ? "💰 记账" : "📅 时间轴"}
            </button>
            {!isCurrentWeek && (
              <button
                onClick={() => {
                  setWeekOffset(0);
                  setSelectedDate(localDateStr(new Date()));
                }}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-[#10B981] text-white btn-press"
              >
                回到本周
              </button>
            )}
          </div>
        </div>

        {view === "timeline" && (
          <>
            {/* 周切换 */}
            <div className="px-5 pb-2 flex items-center justify-between">
              <button onClick={() => setWeekOffset((o) => o - 1)} className="w-9 h-9 flex items-center justify-center text-[#64748B] btn-press">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <span className="text-sm font-semibold text-[#1E293B]">
                {weekDays[0].getMonth() + 1}月{weekDays[0].getDate()}日 - {weekDays[6].getMonth() + 1}月{weekDays[6].getDate()}日
              </span>
              <button onClick={() => setWeekOffset((o) => o + 1)} className="w-9 h-9 flex items-center justify-center text-[#64748B] btn-press">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>

            {/* 7 列周视图 */}
            <div className="px-3 pb-3 grid grid-cols-7 gap-1">
              {weekDays.map((d, i) => {
                const ds = localDateStr(d);
                const dayList = tasksByDate[ds] || [];
                const isSelected = ds === selectedDate;
                const isToday = ds === todayStr;
                // 当天最紧急的点颜色
                const pendingList = dayList.filter((t) => t.status !== "completed");
                let dotColor = "#CBD5E1";
                if (pendingList.length > 0) {
                  const levels = pendingList.map((t) => urgencyOf(t.due_date));
                  if (levels.includes("expired")) dotColor = URGENCY_DOT.expired;
                  else if (levels.includes("today")) dotColor = URGENCY_DOT.today;
                  else if (levels.includes("soon")) dotColor = URGENCY_DOT.soon;
                  else dotColor = URGENCY_DOT.normal;
                }
                return (
                  <button
                    key={ds}
                    onClick={() => setSelectedDate(ds)}
                    className={`flex flex-col items-center py-2 rounded-xl btn-press transition-all ${
                      isSelected ? "bg-[#10B981] text-white" : "bg-[#F8FAFB]"
                    }`}
                  >
                    <span className={`text-[10px] ${isSelected ? "text-white/80" : "text-[#94A3B8]"}`}>{WEEKDAY_LABELS[i]}</span>
                    <span className={`text-[15px] font-semibold my-0.5 ${isSelected ? "text-white" : isToday ? "text-[#10B981]" : "text-[#1E293B]"}`}>
                      {d.getDate()}
                    </span>
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: isSelected ? "white" : dotColor }}
                    />
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {view === "ledger" ? (
        <LedgerPanel selectedDate={selectedDate} />
      ) : (
        <>
          {/* 全天/待安排 */}
          <div className="px-4 pt-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-[#475569]">
                {new Date(selectedDate + "T12:00:00").getMonth() + 1}月{new Date(selectedDate + "T12:00:00").getDate()}日 · 全天 / 待安排
                {allDayTasks.length > 0 && <span className="ml-1 text-[#94A3B8]">({allDayTasks.length})</span>}
              </h2>
            </div>
            {allDayTasks.length === 0 ? (
              <div className="text-xs text-[#CBD5E1] py-1">暂无待安排事项</div>
            ) : (
              <div className="space-y-2">
                {allDayTasks.map((t) => (
                  <div
                    key={t.id}
                    className="bg-white rounded-xl px-3 py-2.5 flex items-center gap-2 shadow-sm"
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: blockColor(t) }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-medium text-[#1E293B] truncate">{t.title}</div>
                      {!t.is_manual && (
                        <div className="text-[11px] text-[#94A3B8]">{TYPE_LABELS[t.type] || "待办"}</div>
                      )}
                    </div>
                    <button
                      onClick={() => setAssignTask(t)}
                      className="px-2.5 py-1.5 text-xs font-medium text-[#10B981] bg-[#F0FDF4] rounded-lg btn-press shrink-0"
                    >
                      定时间
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 时间轴 */}
          <div className="px-4 pt-4 relative">
            <div className="relative" style={{ height: (HOUR_END - HOUR_START) * HOUR_HEIGHT }}>
              {/* 小时格 */}
              {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i).map((h) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 flex items-start border-t border-slate-100"
                  style={{ top: (h - HOUR_START) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                >
                  <span className="text-[10px] text-[#CBD5E1] w-9 -mt-1.5 shrink-0">{String(h).padStart(2, "0")}:00</span>
                </div>
              ))}

              {/* 当前时间线 */}
              {isSameLocalDay(new Date(selectedDate + "T12:00:00"), new Date()) && mounted && <CurrentTimeLine />}

              {/* 时间块 */}
              {timedTasks.map(({ task, startHour, endHour }) => {
                const top = (startHour - HOUR_START) * HOUR_HEIGHT;
                const height = Math.max((endHour - startHour) * HOUR_HEIGHT - 2, 30);
                if (top < 0) return null;
                const color = blockColor(task);
                const st = task.start_time ? new Date(task.start_time) : new Date(task.due_date!);
                return (
                  <button
                    key={task.id}
                    onClick={() => task.is_manual ? setPlanSheet({ open: true, task }) : null}
                    className="absolute left-10 right-1 rounded-lg px-2.5 py-1.5 text-left text-white overflow-hidden btn-press"
                    style={{ top, height, backgroundColor: color + "E6" }}
                  >
                    <div className="text-[13px] font-semibold leading-tight truncate">{task.title}</div>
                    <div className="text-[10px] opacity-90 mt-0.5">
                      {String(st.getHours()).padStart(2, "0")}:{String(st.getMinutes()).padStart(2, "0")}
                      {task.location ? ` · ${task.location}` : ""}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 快速新增按钮 */}
          <button
            onClick={() => setPlanSheet({ open: true })}
            className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-[#10B981] text-white shadow-lg flex items-center justify-center z-30 btn-press"
            style={{ left: "auto", right: "max(16px, calc(50% - 224px))" }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </>
      )}

      {/* 计划编辑 */}
      {planSheet.open && (
        <PlanEditSheet
          initial={planSheet.task}
          date={selectedDate}
          onClose={() => setPlanSheet({ open: false })}
          onSubmit={handleSavePlan}
          onDelete={planSheet.task ? () => deleteTask(planSheet.task!.id) : undefined}
        />
      )}

      {/* 指定时间弹层 */}
      {assignTask && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAssignTask(null)} />
          <div className="relative w-full max-w-[480px] bg-white rounded-t-3xl p-5 animate-slide-up">
            <h3 className="text-base font-bold text-[#1E293B] mb-1">给「{assignTask.title}」指定时间</h3>
            <p className="text-xs text-[#94A3B8] mb-4">选择开始时段（默认 1 小时）</p>
            <div className="grid grid-cols-4 gap-2 max-h-[50vh] overflow-y-auto">
              {Array.from({ length: 18 }, (_, i) => 6 + i).map((h) => (
                <button
                  key={h}
                  onClick={() => handleAssignTime(assignTask, h)}
                  className="py-3 rounded-lg bg-[#F0FDF4] text-[#10B981] text-sm font-medium btn-press"
                >
                  {String(h).padStart(2, "0")}:00
                </button>
              ))}
            </div>
            <button onClick={() => setAssignTask(null)} className="w-full mt-4 py-3 text-[#64748B] btn-press">取消</button>
          </div>
        </div>
      )}
    </div>
  );
}

function CurrentTimeLine() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const hour = now.getHours() + now.getMinutes() / 60;
  if (hour < HOUR_START || hour > HOUR_END) return null;
  const top = (hour - HOUR_START) * HOUR_HEIGHT;
  return (
    <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{ top }}>
      <div className="relative flex items-center">
        <span className="w-9 text-[10px] text-[#EF4444] font-semibold -ml-0.5">
          {String(now.getHours()).padStart(2, "0")}:{String(now.getMinutes()).padStart(2, "0")}
        </span>
        <div className="flex-1 h-0.5 bg-[#EF4444] relative">
          <span className="absolute -left-1 -top-[3px] w-2 h-2 rounded-full bg-[#EF4444]" />
        </div>
      </div>
    </div>
  );
}
