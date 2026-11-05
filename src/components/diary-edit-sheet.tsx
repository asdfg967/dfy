"use client";

import { useState, useRef } from "react";
import { Diary, MOOD_OPTIONS, WEATHER_OPTIONS } from "@/lib/diary-types";
import { localDateStr } from "@/lib/date-utils";
import { apiFetch } from "@/lib/api-client";

export interface DiaryFormData {
  diary_date: string;
  content: string;
  image_keys: string[];
  mood: string | null;
  weather: string | null;
  location: string | null;
}

export default function DiaryEditSheet({
  initial,
  defaultDate,
  onClose,
  onSubmit,
}: {
  initial: Diary | null;
  defaultDate?: string;
  onClose: () => void;
  onSubmit: (data: DiaryFormData) => Promise<void>;
}) {
  const [date, setDate] = useState(initial?.diary_date || defaultDate || localDateStr(new Date()));
  const [content, setContent] = useState(initial?.content || "");
  const [imageUrls, setImageUrls] = useState<string[]>(initial?.images || []);
  const [imageKeys, setImageKeys] = useState<string[]>(initial?.image_keys || []);
  const [mood, setMood] = useState<string | null>(initial?.mood || null);
  const [weather, setWeather] = useState<string | null>(initial?.weather || null);
  const [location, setLocation] = useState(initial?.location || "");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (imageUrls.length >= 9) {
          alert("最多上传 9 张图片");
          break;
        }
        const fd = new FormData();
        fd.append("file", file);
        const res = await apiFetch("/api/diaries/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (json.success) {
          setImageUrls((prev) => [...prev, json.data.url]);
          setImageKeys((prev) => [...prev, json.data.key]);
        } else {
          alert(json.error || "上传失败");
        }
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeImage = (idx: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== idx));
    setImageKeys((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!content.trim() && imageUrls.length === 0) {
      alert("写点什么或加张图片吧");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        diary_date: date,
        content: content.trim(),
        image_keys: imageKeys,
        mood,
        weather,
        location: location.trim() || null,
      });
      onClose();
    } catch {
      // onSubmit 已处理错误提示
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={submitting ? undefined : onClose} />
      <div className="relative w-full max-w-[480px] bg-white rounded-t-3xl max-h-[92vh] overflow-y-auto animate-slide-up">
        <div className="sticky top-0 bg-white px-5 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between z-10">
          <button onClick={onClose} className="text-[#64748B] text-sm btn-press">取消</button>
          <h3 className="text-base font-bold text-[#1E293B]">{initial ? "编辑日记" : "写日记"}</h3>
          <button
            onClick={handleSave}
            disabled={submitting}
            className="text-[#3B82F6] text-sm font-bold btn-press disabled:opacity-50"
          >
            {submitting ? "保存中..." : "保存"}
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* 日期 */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#64748B] shrink-0">日期</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-[#1E293B] focus:outline-none focus:border-[#3B82F6]"
            />
          </div>

          {/* 心情 */}
          <div>
            <p className="text-sm text-[#64748B] mb-2">心情</p>
            <div className="flex flex-wrap gap-2">
              {MOOD_OPTIONS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMood(mood === m ? null : m)}
                  className="w-10 h-10 rounded-full text-xl flex items-center justify-center btn-press transition"
                  style={{
                    backgroundColor: mood === m ? "#DBEAFE" : "#F8FAFB",
                    outline: mood === m ? "2px solid #3B82F6" : "none",
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* 天气 */}
          <div>
            <p className="text-sm text-[#64748B] mb-2">天气</p>
            <div className="flex flex-wrap gap-2">
              {WEATHER_OPTIONS.map((w) => {
                const value = w.split(" ")[0];
                const active = weather === value;
                return (
                  <button
                    key={w}
                    onClick={() => setWeather(active ? null : value)}
                    className="px-3 py-1.5 rounded-full text-xs btn-press"
                    style={{
                      backgroundColor: active ? "#DBEAFE" : "#F8FAFB",
                      color: active ? "#2563EB" : "#64748B",
                      outline: active ? "1.5px solid #3B82F6" : "none",
                    }}
                  >
                    {w}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 正文 */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="今天过得怎么样？记录下此刻的心情吧..."
            rows={6}
            className="w-full border border-slate-200 rounded-xl p-3 text-[15px] text-[#1E293B] placeholder:text-[#CBD5E1] resize-none focus:outline-none focus:border-[#3B82F6] leading-relaxed"
          />

          {/* 图片九宫格 */}
          <div>
            <div className="grid grid-cols-3 gap-2">
              {imageUrls.map((url, i) => (
                <div key={i} className="relative aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover rounded-xl" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
              ))}
              {imageUrls.length < 9 && (
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="aspect-square border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-[#CBD5E1] btn-press"
                >
                  {uploading ? (
                    <div className="w-5 h-5 border-2 border-[#3B82F6]/30 border-t-[#3B82F6] rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                      <span className="text-[10px] mt-1">{imageUrls.length}/9</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
          </div>

          {/* 位置 */}
          <div className="flex items-center gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" className="shrink-0">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
            </svg>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="添加位置（选填）"
              className="flex-1 border-b border-slate-100 py-2 text-sm text-[#1E293B] placeholder:text-[#CBD5E1] focus:outline-none focus:border-[#3B82F6]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
