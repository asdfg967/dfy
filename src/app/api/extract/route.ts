import { NextRequest, NextResponse } from "next/server";
import { aiChat, parseJsonFromAI, AIContentPart } from "@/lib/ai-client";
import { getAuthUser, unauthorized } from "@/lib/server-auth";

// 事项类型枚举
const TASK_TYPES = ["homework", "exam", "meeting", "payment", "checkin", "other"] as const;
type TaskType = (typeof TASK_TYPES)[number];

interface ExtractedItem {
  title: string;
  type: TaskType;
  due_date: string | null;
  location: string | null;
  notes: string | null;
}

function normalizeItem(raw: Record<string, unknown>): ExtractedItem {
  const typeRaw = String(raw.type || "other");
  const type: TaskType = (TASK_TYPES as readonly string[]).includes(typeRaw)
    ? (typeRaw as TaskType)
    : "other";
  return {
    title: String(raw.title || "未命名事项").slice(0, 100),
    type,
    due_date: typeof raw.due_date === "string" && raw.due_date ? raw.due_date : null,
    location: typeof raw.location === "string" && raw.location ? raw.location : null,
    notes: typeof raw.notes === "string" && raw.notes ? raw.notes : null,
  };
}

// POST /api/extract - AI 从通知文字/截图中提取待办事项
// body: { text?: string, images?: string[]（base64 data URI） }
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorized();

    const body = await request.json();
    const text: string | undefined = body.text;
    const images: string[] | undefined = body.images;

    if (!text && (!images || images.length === 0)) {
      return NextResponse.json(
        { success: false, error: "请提供通知文字或截图" },
        { status: 400 }
      );
    }

    // 当前时间上下文，用于相对时间（如"本周五下午3点"）换算
    const now = new Date();
    const nowStr = now.toLocaleString("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "long",
      hour12: false,
    });

    const systemPrompt = `你是一个班级通知信息提取助手。从通知内容中提取所有待办事项，输出 JSON 数组。

当前时间：${nowStr}（北京时间）。通知中的相对时间（如"本周五""明天""下周一下午3点"）必须结合当前时间换算为准确的 ISO 时间（格式如 2025-10-25T15:00:00+08:00）。

每个事项包含以下字段：
- title: 事项标题（简洁明确，不超过30字）
- type: 类型，必须是以下之一：homework(作业)、exam(考试)、meeting(会议/活动)、payment(缴费)、checkin(打卡/签到)、other(其他)
- due_date: 截止/举办时间（ISO 格式字符串），没有时间要求则为 null；只有日期没有时间时默认该日 23:59
- location: 地点，没有则为 null
- notes: 备注说明（如"交给课代表""带好文具"），没有则为 null

要求：
1. 一条通知可能包含多个事项，全部提取
2. 只输出 JSON 数组，不要输出任何其他文字、解释或代码块标记
3. 没有可提取的事项时输出空数组 []`;

    // 组装多模态消息：文本 + 图片（base64 data URI，image_url 数组格式）
    const userContent: AIContentPart[] = [];

    if (text) {
      userContent.push({ type: "text", text: `请从以下班级通知中提取所有待办事项：\n\n${text}` });
    }

    if (images && images.length > 0) {
      userContent.push({
        type: "text",
        text: "请识别以下班级通知截图中的文字，并提取所有待办事项：",
      });
      for (const img of images) {
        userContent.push({
          type: "image_url",
          image_url: { url: img, detail: "high" },
        });
      }
    }

    const content = await aiChat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      { temperature: 0.2, vision: !!(images && images.length > 0) }
    );

    const rawItems = parseJsonFromAI<unknown[]>(content) || [];
    const items = rawItems
      .filter((it): it is Record<string, unknown> => !!it && typeof it === "object")
      .map(normalizeItem);

    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error("AI 提取失败:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "识别失败，请稍后重试" },
      { status: 500 }
    );
  }
}
