'use client';

import React from 'react';

/**
 * Deep 大肥鱼 —— 应用吉祥物
 * 一条圆滚滚的蓝色肥鱼，手绘 SVG。
 */
export default function DeepFish({
  size = 120,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Deep大肥鱼"
      role="img"
    >
      <defs>
        <linearGradient id="fishBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="55%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id="fishBelly" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#DBEAFE" />
          <stop offset="100%" stopColor="#BFDBFE" />
        </linearGradient>
      </defs>

      {/* 气泡 */}
      <circle cx="152" cy="38" r="6" fill="#BFDBFE" opacity="0.9" />
      <circle cx="166" cy="24" r="4" fill="#DBEAFE" opacity="0.9" />
      <circle cx="140" cy="20" r="3" fill="#BFDBFE" opacity="0.7" />

      {/* 尾巴 */}
      <path
        d="M34 100 C18 84 10 66 14 52 C26 58 36 68 42 80 C36 88 36 112 42 120 C36 132 26 142 14 148 C10 134 18 116 34 100 Z"
        fill="#3B82F6"
      />

      {/* 身体 */}
      <ellipse cx="102" cy="104" rx="72" ry="58" fill="url(#fishBody)" />

      {/* 肚皮 */}
      <ellipse cx="106" cy="126" rx="48" ry="28" fill="url(#fishBelly)" />

      {/* 背鳍 */}
      <path
        d="M76 52 C84 32 112 28 126 44 C112 46 96 48 76 52 Z"
        fill="#2563EB"
      />

      {/* 侧鳍 */}
      <path
        d="M84 128 C74 142 74 156 84 162 C94 154 98 140 96 130 Z"
        fill="#2563EB"
        opacity="0.9"
      />

      {/* 眼睛 */}
      <circle cx="138" cy="88" r="15" fill="#FFFFFF" />
      <circle cx="141" cy="90" r="8" fill="#1E293B" />
      <circle cx="144" cy="86" r="3" fill="#FFFFFF" />

      {/* 腮红 */}
      <ellipse cx="120" cy="110" rx="9" ry="6" fill="#93C5FD" opacity="0.8" />

      {/* 微笑嘴巴 */}
      <path
        d="M158 112 Q166 118 160 126"
        stroke="#1E3A8A"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />

      {/* 头顶水花 */}
      <path
        d="M96 40 C94 32 100 26 104 30 C108 26 114 32 112 40"
        stroke="#93C5FD"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
