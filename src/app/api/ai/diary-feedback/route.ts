import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { getAuthUser, unauthorized } from "@/lib/server-auth";
import { aiChat, parseJsonFromAI } from "@/lib/ai-client";

/**
 * POST /api/ai/diary-feedback
 * 对指定日记进行 AI 分析：情绪分析、情绪安慰、生活建议、社交建议。
 * 结果持久化到 diaries.ai_feedback，前端展示。
 * body: { diary_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorized();

    const body = await request.json();
    const diaryId: string | undefined = body.diary_id;
    if (!diaryId) {
      return NextResponse.json(
        { success: false, error: "缺少日记 ID" },
        { status: 400 },
      );
    }

    const client = getSupabaseClient(auth.token);
    const { data: diary, error: queryError } = await client
      .from("diaries")
      .select("id, diary_date, content, mood")
      .eq("id", diaryId)
      .eq("user_id", auth.id)
      .single();

    if (queryError || !diary) {
      return NextResponse.json(
        { success: false, error: "日记不存在" },
        { status: 404 },
      );
    }

    if (!diary.content || diary.content.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: "日记内容太短，先多写一点吧" },
        { status: 400 },
      );
    }

    const systemPrompt = `你是一位温暖、善解人意的心理陪伴助手，服务对象是中学生。请阅读用户的日记，给出四部分内容，以 JSON 对象输出：

{
  "mood_analysis": "情绪分析：客观描述日记反映出的情绪状态（1-2句）",
  "comfort": "情绪安慰：温暖共情的话，像好朋友一样回应（2-3句）",
  "life_advice": "生活建议：结合日记内容给出1条具体可行的学习生活建议",
  "social_advice": "社交建议：结合日记内容给出1条与人相处方面的建议"
}

要求：
1. 语气亲切自然，像同龄的好朋友，不要说教
2. 每部分控制在60字以内
3. 只输出 JSON 对象，不要输出其他文字`;

    const content = await aiChat(
      [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `这是我 ${diary.diary_date} 写的日记${diary.mood ? `（心情：${diary.mood}）` : ""}：\n\n${diary.content}`,
        },
      ],
      { temperature: 0.7 },
    );

    const feedback = parseJsonFromAI<{
      mood_analysis?: string;
      comfort?: string;
      life_advice?: string;
      social_advice?: string;
    }>(content);

    if (!feedback || (!feedback.comfort && !feedback.mood_analysis)) {
      return NextResponse.json(
        { success: false, error: "AI 分析失败，请稍后重试" },
        { status: 500 },
      );
    }

    const aiFeedback = {
      mood_analysis: feedback.mood_analysis || "",
      comfort: feedback.comfort || "",
      life_advice: feedback.life_advice || "",
      social_advice: feedback.social_advice || "",
      generated_at: new Date().toISOString(),
    };

    // 持久化到日记记录
    await client
      .from("diaries")
      .update({ ai_feedback: aiFeedback })
      .eq("id", diaryId)
      .eq("user_id", auth.id);

    return NextResponse.json({ success: true, data: aiFeedback });
  } catch (error) {
    console.error("日记 AI 分析失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "分析失败，请稍后重试",
      },
      { status: 500 },
    );
  }
}
