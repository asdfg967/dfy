"use client";

import { useState, useEffect, useCallback } from "react";

export interface Task {
  id: string;
  title: string;
  type: string;
  due_date: string | null;
  start_time?: string | null;
  end_time?: string | null;
  is_manual?: boolean;
  create_type?: string | null;
  color?: string | null;
  location: string | null;
  notes: string | null;
  status: string;
  source_text: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type UrgencyLevel = "expired" | "today" | "soon" | "normal" | "none";

export function getUrgency(dueDate: string | null): UrgencyLevel {
  if (!dueDate) return "none";
  const now = new Date();
  const due = new Date(dueDate);
  const diff = due.getTime() - now.getTime();
  const hours24 = 24 * 60 * 60 * 1000;
  const days3 = 3 * 24 * 60 * 60 * 1000;

  if (diff < 0) return "expired";
  if (diff <= hours24) return "today";
  if (diff <= days3) return "soon";
  return "normal";
}

export function formatDueDate(dueDate: string | null): string {
  if (!dueDate) return "无截止时间";
  const now = new Date();
  const due = new Date(dueDate);
  const diff = due.getTime() - now.getTime();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const dayDiff = Math.round((dueDay.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

  const timeStr = due.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

  let dateStr: string;
  if (dayDiff === 0) {
    dateStr = "今天";
  } else if (dayDiff === 1) {
    dateStr = "明天";
  } else if (dayDiff === -1) {
    dateStr = "昨天";
  } else if (dayDiff > 1 && dayDiff <= 6) {
    dateStr = weekdays[due.getDay()];
  } else if (dayDiff < 0) {
    dateStr = `已过期${Math.abs(dayDiff)}天`;
  } else {
    dateStr = `${due.getMonth() + 1}/${due.getDate()} ${weekdays[due.getDay()]}`;
  }

  const result = `${dateStr} ${timeStr}`;

  if (diff > 0 && diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
    return `${result} (剩余${hours}时${mins}分)`;
  }
  if (diff > 24 * 60 * 60 * 1000 && diff < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    return `${result} (剩余${days}天)`;
  }

  return result;
}

export const TYPE_LABELS: Record<string, string> = {
  homework: "作业",
  exam: "考试",
  meeting: "会议",
  payment: "缴费",
  checkin: "打卡",
  other: "其他",
};

export const TYPE_COLORS: Record<string, string> = {
  homework: "type-homework",
  exam: "type-exam",
  meeting: "type-meeting",
  payment: "type-payment",
  checkin: "type-checkin",
  other: "type-other",
};

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async (statusFilter?: string, typeFilter?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter && typeFilter !== "all") params.set("type", typeFilter);
      const res = await fetch(`/api/tasks?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setTasks(json.data);
      } else {
        setError(json.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTask = useCallback(async (id: string, data: Partial<Task>) => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.success) {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...json.data } : t));
    }
    return json;
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      setTasks(prev => prev.filter(t => t.id !== id));
    }
    return json;
  }, []);

  const createTask = useCallback(async (data: Partial<Task>) => {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.success) {
      setTasks(prev => [...prev, json.data as Task]);
    }
    return json;
  }, []);

  const batchCreate = useCallback(async (items: Array<Partial<Task>>) => {
    const res = await fetch("/api/tasks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tasks: items }),
    });
    const json = await res.json();
    if (json.success) {
      await fetchTasks();
    }
    return json;
  }, [fetchTasks]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return { tasks, loading, error, fetchTasks, createTask, updateTask, deleteTask, batchCreate };
}
