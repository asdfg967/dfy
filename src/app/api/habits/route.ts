import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { getAuthUser, unauthorized } from "@/lib/server-auth";

// GET /api/habits?date=YYYY-MM-DD - 返回习惯定义 + 今日是否打卡 + 最近7天打卡
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorized();

    const { searchParams } = new URL(request.url);
    const today = searchParams.get("date") || new Date().toISOString().slice(0, 10);

    const client = getSupabaseClient(auth.token);
    const { data: habits, error } = await client
      .from("habit_defs")
      .select("*")
      .eq("user_id", auth.id)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) throw new Error(`查询失败: ${error.message}`);

    // 取最近 30 天打卡记录用于前端展示
    const start = new Date();
    start.setDate(start.getDate() - 40);
    const startStr = start.toISOString().slice(0, 10);
    const { data: checkins, error: ce } = await client
      .from("habit_checkins")
      .select("habit_id, checkin_date")
      .eq("user_id", auth.id)
      .gte("checkin_date", startStr);
    if (ce) throw new Error(`查询打卡失败: ${ce.message}`);

    const checkinMap: Record<string, Set<string>> = {};
    (checkins as { habit_id: string; checkin_date: string }[]).forEach((c) => {
      if (!checkinMap[c.habit_id]) checkinMap[c.habit_id] = new Set();
      checkinMap[c.habit_id].add(c.checkin_date);
    });

    // 最近 7 天日期（含今天，本地时区）
    const last7: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today + "T12:00:00");
      d.setDate(d.getDate() - i);
      last7.push(d.toISOString().slice(0, 10));
    }

    const result = (habits as Record<string, unknown>[]).map((h) => {
      const set = checkinMap[h.id as string] || new Set<string>();
      return {
        ...h,
        checked_today: set.has(today),
        recent_7: last7.map((d) => ({ date: d, checked: set.has(d) })),
        checkin_dates: Array.from(set),
      };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/habits - 新建习惯
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorized();

    const body = await request.json();
    const {
      name,
      icon,
      color,
      freq_type,
      weekly_target,
      weekly_days,
      reminder_time,
      start_date,
    } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: "习惯名称不能为空" }, { status: 400 });
    }

    const client = getSupabaseClient(auth.token);
    const { data, error } = await client
      .from("habit_defs")
      .insert({
        user_id: auth.id,
        name,
        icon: icon || "⭐",
        color: color || "#3B82F6",
        freq_type: freq_type || "daily",
        weekly_target: weekly_target ?? 7,
        weekly_days: Array.isArray(weekly_days) ? weekly_days : [],
        reminder_time: reminder_time || null,
        start_date: start_date || new Date().toISOString().slice(0, 10),
      })
      .select()
      .single();

    if (error) throw new Error(`创建失败: ${error.message}`);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
