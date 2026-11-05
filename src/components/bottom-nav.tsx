"use client";

import { useEffect, useState } from "react";

export type TabKey = "todo" | "week" | "habit" | "diary";

const TABS: { key: TabKey; label: string; icon: (active: boolean) => React.ReactNode }[] = [
  {
    key: "todo",
    label: "待办",
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? "#3B82F6" : "#94A3B8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    key: "week",
    label: "周历",
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? "#3B82F6" : "#94A3B8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    key: "habit",
    label: "习惯",
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "#3B82F6" : "none"} stroke={active ? "#3B82F6" : "#94A3B8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
      </svg>
    ),
  },
  {
    key: "diary",
    label: "日记",
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? "#3B82F6" : "#94A3B8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
];

function getTabFromHash(): TabKey {
  if (typeof window === "undefined") return "todo";
  const h = window.location.hash.replace("#", "");
  const valid: TabKey[] = ["todo", "week", "habit", "diary"];
  return (valid.includes(h as TabKey) ? h : "todo") as TabKey;
}

export function useTab() {
  const [tab, setTabState] = useState<TabKey>("todo");

  useEffect(() => {
    setTabState(getTabFromHash());
    const onChange = () => setTabState(getTabFromHash());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const setTab = (t: TabKey) => {
    window.location.hash = t;
  };

  return { tab, setTab };
}

export default function BottomNav({ active, onChange }: { active: TabKey; onChange: (t: TabKey) => void }) {
  const [, force] = useState(0);
  useEffect(() => {
    force(1);
  }, []);

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-slate-100 z-40 safe-bottom">
      <div className="grid grid-cols-4">
        {TABS.map((t) => {
          const isActive = active === t.key;
          return (
            <button
              key={t.key}
              onClick={() => onChange(t.key)}
              className="flex flex-col items-center justify-center py-2 gap-0.5 btn-press"
            >
              {t.icon(isActive)}
              <span className={`text-[11px] ${isActive ? "text-[#3B82F6] font-semibold" : "text-[#94A3B8]"}`}>
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
