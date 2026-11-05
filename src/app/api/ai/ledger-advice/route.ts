import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { getAuthUser, unauthorized } from "@/lib/server-auth";
import { aiChat, parseJsonFromAI } from "@/lib/ai-client";
import {
  mapToMajorCategory,
  MAJOR_CATEGORY_COLORS,
  MAJOR_CATEGORY_ORDER,
} from "@/lib/ledger-categories";

/**
 * GET /api/ai/ledger-advice?days=30
 * 基于近 N 天账单：
 * 1. 按 AI 大类（衣食住行/学习用品/生活用品等）聚合支出，返回饼图数据
 * 2. AI 生成花钱建议
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorized();

    const { searchParams } = new URL(request.url);
    const days = Math.min(Math.max(Number(searchParams.get("days")) || 30, 7), 90);

    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().slice(0, 10);

    const client = getSupabaseClient(auth.token);
    const { data: records, error } = await client
      .from("ledger_records")
      .select("kind, amount, category, major_category, record_date, notes")
      .eq("user_id", auth.id)
      .gte("record_date", sinceStr)
      .order("record_date", { ascending: false });

    if (error) throw new Error(`查询失败: ${error.message}`);

    type Row = {
      kind: string;
      amount: string;
      category: string;
      major_category: string | null;
      record_date: string;
      notes: string | null;
    };
    const rows = (records || []) as Row[];

    const expenses = rows.filter((r) => r.kind === "expense");
    if (expenses.length === 0) {
      return NextResponse.json({
        success: false,
        error: `近 ${days} 天还没有支出记录，先记几笔账吧`,
      });
    }

    // ---------- 按大类聚合（饼图数据） ----------
    const majorMap = new Map<string, number>();
    expenses.forEach((r) => {
      // 旧数据无大类时现场归类
      const major = r.major_category || mapToMajorCategory(r.category, r.notes);
      const amt = Number(r.amount) || 0;
      majorMap.set(major, (majorMap.get(major) || 0) + amt);
    });

    const totalExpense = expenses.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const totalIncome = rows
      .filter((r) => r.kind === "income")
      .reduce((s, r) => s + (Number(r.amount) || 0), 0);

    const pieData = MAJOR_CATEGORY_ORDER.filter((c) => majorMap.has(c)).map(
      (c) => ({
        name: c,
        value: Math.round((majorMap.get(c) || 0) * 100) / 100,
        color: MAJOR_CATEGORY_COLORS[c] || "#6B7280",
        percent:
          totalExpense > 0
            ? Math.round(((majorMap.get(c) || 0) / totalExpense) * 1000) / 10
            : 0,
      }),
    );

    // ---------- AI 建议 ----------
    // 提供给模型的明细（限制条数，控制 token）
    const detailLines = expenses.slice(0, 60).map((r) => {
      const amt = Number(r.amount) || 0;
      return `- ${r.record_date} ${r.category} ¥${amt.toFixed(2)}${r.notes ? `（${r.notes}）` : ""}`;
    });

    const systemPrompt = `你是一位贴心的学生理财顾问。用户是一名中学生，请根据TA近期的消费记录给出花钱建议，以 JSON 对象输出：

{
  "summary": "一句话概括TA近期的消费情况（含总支出、主要去向）",
  "suggestions": ["建议1", "建议2", "建议3"]
}

要求：
1. 建议具体、可执行，贴合学生生活（如食堂、文具、零食、交通等场景）
2. 语气亲切，不说教，每条建议40字以内
3. 如果某项支出占比明显偏高，针对性提醒
4. 只输出 JSON 对象，不要输出其他文字`;

    let advice: { summary?: string; suggestions?: string[] } | null = null;
    try {
      const content = await aiChat(
        [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `近 ${days} 天总支出 ¥${totalExpense.toFixed(2)}，总收入 ¥${totalIncome.toFixed(2)}。\n\n支出明细：\n${detailLines.join("\n")}`,
          },
        ],
        { temperature: 0.6 },
      );
      advice = parseJsonFromAI(content);
    } catch (e) {
      console.error("AI 建议生成失败:", e);
    }

    return NextResponse.json({
      success: true,
      data: {
        days,
        total_expense: Math.round(totalExpense * 100) / 100,
        total_income: Math.round(totalIncome * 100) / 100,
        pie_data: pieData,
        summary: advice?.summary || "",
        suggestions: Array.isArray(advice?.suggestions)
          ? advice!.suggestions.slice(0, 5)
          : [],
        ai_available: !!advice,
      },
    });
  } catch (error) {
    console.error("记账建议失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "分析失败，请稍后重试",
      },
      { status: 500 },
    );
  }
}
