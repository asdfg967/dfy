"use client";

import { useState, useMemo, useEffect } from "react";
import { useTasks, Task, TYPE_LABELS, getUrgency } from "@/hooks/use-tasks";
import TaskCard from "@/components/task-card";
import TaskEditSheet from "@/components/task-edit-sheet";
import Link from "next/link";

type StatusFilter = "all" | "pending" | "completed";
type TypeFilter = string;

export default function TodoTab() {
  const { tasks, loading, updateTask, deleteTask } = useTasks();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showNotifBanner, setShowNotifBanner] = useState(false);
  const [hasNotificationAPI, setHasNotificationAPI] = useState(false);
  const [notifPermission, setNotifPermission] = useState<string>("denied");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setHasNotificationAPI(true);
      setNotifPermission(Notification.permission);
    }
  }, []);

  const stats = useMemo(() => {
    const pending = tasks.filter(t => t.status === "pending");
    const now = new Date();
    const todayCount = pending.filter(t => {
      if (!t.due_date) return false;
      const due = new Date(t.due_date);
      return due.getFullYear() === now.getFullYear() && due.getMonth() === now.getMonth() && due.getDate() === now.getDate();
    });
    const expired = pending.filter(t => t.due_date && new Date(t.due_date) < new Date());
    return {
      pending: pending.length,
      today: todayCount.length,
      expired: expired.length,
    };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let result = [...tasks];
    if (statusFilter !== "all") {
      result = result.filter(t => t.status === statusFilter);
    }
    if (typeFilter !== "all") {
      result = result.filter(t => t.type === typeFilter);
    }
    result.sort((a, b) => {
      if (a.status === "completed" && b.status !== "completed") return 1;
      if (a.status !== "completed" && b.status === "completed") return -1;
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
    return result;
  }, [tasks, statusFilter, typeFilter]);

  const urgentTasks = useMemo(() => {
    return tasks.filter(t => t.status === "pending" && (getUrgency(t.due_date) === "expired" || getUrgency(t.due_date) === "today"));
  }, [tasks]);

  const handleToggleComplete = async (task: Task) => {
    const newStatus = task.status === "completed" ? "pending" : "completed";
    await updateTask(task.id, { status: newStatus });
  };

  const handleDelete = async (task: Task) => {
    if (confirm("确定删除这个事项吗？")) {
      await deleteTask(task.id);
    }
  };

  const handleEditSave = async (id: string, data: Partial<Task>) => {
    await updateTask(id, data);
  };

  const requestNotification = async () => {
    if (hasNotificationAPI) {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        new Notification("班级通知管理", { body: "通知提醒已开启，临期事项会及时提醒你！" });
        setNotifPermission("granted");
        setShowNotifBanner(false);
      }
    }
  };

  const statusTabs: { value: StatusFilter; label: string }[] = [
    { value: "pending", label: "待办" },
    { value: "all", label: "全部" },
    { value: "completed", label: "已完成" },
  ];

  const typeOptions = Object.entries(TYPE_LABELS);

  return (
    <div className="min-h-screen bg-[#F8FAFB] pb-24">
      <div className="bg-white sticky top-0 z-30 safe-top">
        <div className="px-5 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-[#1E293B]">时间管理表</h1>
            <Link
              href="/add"
              className="flex items-center gap-1.5 px-4 py-2.5 bg-[#3B82F6] text-white rounded-xl text-sm font-semibold btn-press shadow-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              录入通知
            </Link>
          </div>

          <div className="flex gap-3">
            <div className="flex-1 bg-[#EFF6FF] rounded-xl px-3 py-2.5 text-center">
              <div className="text-xl font-bold text-[#3B82F6]">{stats.pending}</div>
              <div className="text-[11px] text-[#64748B]">待办</div>
            </div>
            <div className="flex-1 bg-[#FFF7ED] rounded-xl px-3 py-2.5 text-center">
              <div className="text-xl font-bold text-[#F97316]">{stats.today}</div>
              <div className="text-[11px] text-[#64748B]">今日到期</div>
            </div>
            <div className="flex-1 bg-[#FEF2F2] rounded-xl px-3 py-2.5 text-center">
              <div className="text-xl font-bold text-[#EF4444]">{stats.expired}</div>
              <div className="text-[11px] text-[#64748B]">已过期</div>
            </div>
          </div>
        </div>

        {urgentTasks.length > 0 && statusFilter !== "completed" && (
          <div className="px-5 pb-3">
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span className="text-sm font-semibold text-red-700">
                  {stats.expired > 0 ? `${stats.expired} 项已过期` : ""}
                  {stats.expired > 0 && urgentTasks.filter(t => getUrgency(t.due_date) === "today").length > 0 ? "，" : ""}
                  {urgentTasks.filter(t => getUrgency(t.due_date) === "today").length > 0
                    ? `${urgentTasks.filter(t => getUrgency(t.due_date) === "today").length} 项即将到期`
                    : ""}
                </span>
              </div>
              <p className="text-xs text-red-600">请尽快处理！</p>
            </div>
          </div>
        )}

        {showNotifBanner && hasNotificationAPI && notifPermission === "default" && (
          <div className="px-5 pb-3">
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">开启通知提醒</p>
                <p className="text-xs text-blue-600">临期事项会及时提醒你</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowNotifBanner(false)} className="px-3 py-1.5 text-xs text-blue-600">
                  稍后
                </button>
                <button onClick={requestNotification} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg font-medium btn-press">
                  开启
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="px-5 pb-3">
          <div className="flex gap-2 mb-2">
            {statusTabs.map(tab => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all btn-press ${
                  statusFilter === tab.value
                    ? "bg-[#3B82F6] text-white"
                    : "bg-[#F1F5F9] text-[#64748B]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
            <button
              onClick={() => setTypeFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all btn-press ${
                typeFilter === "all"
                  ? "bg-[#1E293B] text-white"
                  : "bg-[#F1F5F9] text-[#64748B]"
              }`}
            >
              全部类型
            </button>
            {typeOptions.map(([value, label]) => (
              <button
                key={value}
                onClick={() => setTypeFilter(value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all btn-press ${
                  typeFilter === value
                    ? "bg-[#1E293B] text-white"
                    : "bg-[#F1F5F9] text-[#64748B]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 pt-3">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-[3px] border-[#3B82F6]/30 border-t-[#3B82F6] rounded-full animate-spin" />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 bg-[#F1F5F9] rounded-full flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <p className="text-[#94A3B8] text-[15px] mb-2">
              {statusFilter === "completed" ? "还没有已完成的事项" : "暂无待办事项"}
            </p>
            {statusFilter !== "completed" && (
              <Link href="/add" className="text-[#3B82F6] text-sm font-medium">
                去录入通知 →
              </Link>
            )}
          </div>
        ) : (
          <>
            {statusFilter !== "completed" && filteredTasks.filter(t => t.status === "pending").length > 0 && (
              <div className="mb-2">
                {filteredTasks.filter(t => t.status === "pending").map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggleComplete={handleToggleComplete}
                    onEdit={setEditingTask}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}

            {(statusFilter === "all" || statusFilter === "completed") && filteredTasks.filter(t => t.status === "completed").length > 0 && (
              <div>
                {statusFilter === "all" && filteredTasks.some(t => t.status === "pending") && (
                  <div className="flex items-center gap-3 py-3">
                    <div className="flex-1 h-px bg-[#E2E8F0]" />
                    <span className="text-xs text-[#94A3B8] font-medium">已完成</span>
                    <div className="flex-1 h-px bg-[#E2E8F0]" />
                  </div>
                )}
                {filteredTasks.filter(t => t.status === "completed").map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggleComplete={handleToggleComplete}
                    onEdit={setEditingTask}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {hasNotificationAPI && notifPermission === "default" && !showNotifBanner && tasks.length > 0 && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-[calc(100%-40px)] max-w-[440px]">
          <button
            onClick={() => setShowNotifBanner(true)}
            className="w-full py-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700 font-medium btn-press"
          >
            🔔 开启临期提醒通知
          </button>
        </div>
      )}

      {editingTask && (
        <TaskEditSheet
          task={editingTask}
          onSave={handleEditSave}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
}
