"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import ConfirmSheet from "@/components/confirm-sheet";
import { Task } from "@/hooks/use-tasks";
import { apiFetch } from "@/lib/api-client";

type InputMode = "text" | "image";

export default function AddPage() {
  const router = useRouter();
  const [mode, setMode] = useState<InputMode>("text");
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractedItems, setExtractedItems] = useState<Array<{
    title: string;
    type: string;
    due_date: string | null;
    location: string | null;
    notes: string | null;
  }> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 10 * 1024 * 1024) {
        setExtractError("图片大小不能超过 10MB");
        continue;
      }
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      newImages.push(base64);
    }
    setImages(prev => [...prev, ...newImages]);
    setExtractError(null);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleExtract = async () => {
    if (mode === "text" && !text.trim()) {
      setExtractError("请输入通知内容");
      return;
    }
    if (mode === "image" && images.length === 0) {
      setExtractError("请上传截图");
      return;
    }

    setExtracting(true);
    setExtractError(null);

    try {
      const res = await apiFetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: mode === "text" ? text : undefined,
          images: mode === "image" ? images : undefined,
        }),
      });
      const json = await res.json();

      if (json.success) {
        if (json.items.length === 0) {
          setExtractError("未识别到待办事项，请检查内容后重试");
        } else {
          setExtractedItems(json.items);
        }
      } else {
        setExtractError(json.error || "识别失败，请重试");
      }
    } catch {
      setExtractError("网络错误，请重试");
    } finally {
      setExtracting(false);
    }
  };

  const handleConfirm = async (items: Array<Partial<Task>>) => {
    const res = await apiFetch("/api/tasks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tasks: items }),
    });
    const json = await res.json();
    if (json.success) {
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFB] pb-8">
      {/* Header */}
      <div className="bg-white sticky top-0 z-30 safe-top">
        <div className="px-5 pt-4 pb-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 btn-press"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-[#1E293B]">录入通知</h1>
        </div>
      </div>

      <div className="px-5 pt-4">
        {/* Mode Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode("text")}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all btn-press ${
              mode === "text"
                ? "bg-[#3B82F6] text-white shadow-sm"
                : "bg-white text-[#64748B] border border-[#E2E8F0]"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              文字粘贴
            </div>
          </button>
          <button
            onClick={() => setMode("image")}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all btn-press ${
              mode === "image"
                ? "bg-[#3B82F6] text-white shadow-sm"
                : "bg-white text-[#64748B] border border-[#E2E8F0]"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              截图识别
            </div>
          </button>
        </div>

        {/* Text Input */}
        {mode === "text" && (
          <div className="mb-4">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="将群通知内容粘贴到这里...&#10;&#10;支持识别：&#10;• 作业布置（科目、提交时间）&#10;• 考试安排（时间、地点）&#10;• 会议通知（时间、地点）&#10;• 缴费提醒（金额、截止时间）&#10;• 其他待办事项"
              className="w-full px-4 py-4 rounded-xl border border-[#E2E8F0] text-[15px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30 focus:border-[#3B82F6] resize-none bg-white min-h-[240px]"
            />
          </div>
        )}

        {/* Image Upload */}
        {mode === "image" && (
          <div className="mb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
            <div className="grid grid-cols-3 gap-2 mb-3">
              {images.map((img, index) => (
                <div key={index} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                  <img src={img} alt={`截图 ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-[#CBD5E1] flex flex-col items-center justify-center gap-1 hover:border-[#3B82F6] hover:bg-green-50/50 transition-colors btn-press"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span className="text-[11px] text-[#94A3B8]">添加图片</span>
              </button>
            </div>
            <p className="text-xs text-[#94A3B8]">支持多张图片，AI 会自动识别截图中的通知内容</p>
          </div>
        )}

        {/* Error */}
        {extractError && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
            {extractError}
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleExtract}
          disabled={extracting}
          className="w-full py-4 rounded-xl bg-[#3B82F6] text-white font-semibold text-[16px] btn-press disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-2"
        >
          {extracting ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              AI 识别中...
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              AI 智能提取
            </>
          )}
        </button>

        {/* Tips */}
        <div className="mt-6 px-4 py-3 bg-[#F1F5F9] rounded-xl">
          <p className="text-xs text-[#64748B] font-medium mb-1">使用提示</p>
          <ul className="text-xs text-[#94A3B8] space-y-1">
            <li>• 直接复制群通知文字粘贴，效果最佳</li>
            <li>• 截图请确保文字清晰可读</li>
            <li>• AI 会自动识别相对时间（如&quot;本周五&quot;）</li>
            <li>• 提取结果可以修改后再保存</li>
          </ul>
        </div>
      </div>

      {/* Confirm Sheet */}
      {extractedItems && (
        <ConfirmSheet
          items={extractedItems}
          onConfirm={handleConfirm}
          onClose={() => setExtractedItems(null)}
        />
      )}
    </div>
  );
}
