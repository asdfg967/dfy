"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import BottomNav, { TabKey } from "@/components/bottom-nav";
import { apiFetch, logout } from "@/lib/api-client";
import DeepFish from "@/components/deep-fish";

const TodoTab = dynamic(() => import("@/components/todo-tab"), { ssr: false });
const WeekTab = dynamic(() => import("@/components/week-tab"), { ssr: false });
const HabitTab = dynamic(() => import("@/components/habit-tab"), { ssr: false });
const DiaryTab = dynamic(() => import("@/components/diary-tab"), { ssr: false });

const TAB_SUBTITLES: Record<TabKey, string> = {
  todo: "今天也要元气满满哦",
  week: "规划好每一天的时间",
  habit: "坚持打卡，遇见更好的自己",
  diary: "记录生活的小确幸",
};

export default function Home() {
  const [tab, setTab] = useState<TabKey>("todo");

  // 打开应用时静默触发一次到期提醒检查（兜底机制）
  // 有即将到期的事项时，服务端会自动发送 QQ 邮箱提醒
  useEffect(() => {
    apiFetch("/api/reminders/check").catch(() => {
      // 静默失败，不影响应用使用
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFB]">
      {/* 品牌头部：Deep 大肥鱼 */}
      <header className="bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white safe-top">
        <div className="px-4 pt-3 pb-3 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
            <DeepFish size={34} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[17px] font-bold leading-tight">
              Deep 大肥鱼
            </h1>
            <p className="text-[11px] text-white/70 mt-0.5 truncate">
              {TAB_SUBTITLES[tab]}
            </p>
          </div>
          <button
            onClick={() => {
              if (confirm("确定退出登录吗？")) logout();
            }}
            className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center btn-press shrink-0"
            aria-label="退出登录"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      {tab === "todo" && <TodoTab />}
      {tab === "week" && <WeekTab />}
      {tab === "habit" && <HabitTab />}
      {tab === "diary" && <DiaryTab />}
      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}
