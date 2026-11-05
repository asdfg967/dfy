"use client";

import { Task, getUrgency, formatDueDate, TYPE_LABELS, TYPE_COLORS } from "@/hooks/use-tasks";

interface TaskCardProps {
  task: Task;
  onToggleComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export default function TaskCard({ task, onToggleComplete, onEdit, onDelete }: TaskCardProps) {
  const urgency = task.status === "completed" ? "none" : getUrgency(task.due_date);
  const isCompleted = task.status === "completed";

  return (
    <div
      className={`
        bg-white rounded-xl p-4 mb-3 shadow-sm
        ${isCompleted ? "task-completed opacity-60" : ""}
        ${!isCompleted ? `urgency-${urgency}` : "border-l-4 border-l-[#E2E8F0]"}
        animate-slide-up
      `}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={() => onToggleComplete(task)}
          className={`
            mt-0.5 w-6 h-6 rounded-full border-2 flex-shrink-0
            flex items-center justify-center btn-press transition-all
            ${isCompleted
              ? "bg-[#3B82F6] border-[#3B82F6]"
              : "border-[#CBD5E1] hover:border-[#3B82F6]"
            }
          `}
        >
          {isCompleted && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[task.type] || "type-other"}`}>
              {TYPE_LABELS[task.type] || "其他"}
            </span>
            {urgency === "expired" && !isCompleted && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">
                已过期
              </span>
            )}
            {urgency === "today" && !isCompleted && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-medium">
                即将到期
              </span>
            )}
          </div>

          <h3 className="task-title text-[15px] font-semibold text-[#1E293B] leading-snug mb-1">
            {task.title}
          </h3>

          <div className="flex items-center gap-3 text-[13px] text-[#64748B]">
            <span className="flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {formatDueDate(task.due_date)}
            </span>
            {task.location && (
              <span className="flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {task.location}
              </span>
            )}
          </div>

          {task.notes && (
            <p className="text-[13px] text-[#94A3B8] mt-1 line-clamp-2">{task.notes}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          <button
            onClick={() => onEdit(task)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#94A3B8] hover:text-[#3B82F6] hover:bg-blue-50 btn-press transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(task)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#94A3B8] hover:text-red-500 hover:bg-red-50 btn-press transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
