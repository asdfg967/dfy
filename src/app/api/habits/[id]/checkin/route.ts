import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { getAuthUser, unauthorized } from "@/lib/server-auth";

// POST /api/habits/[id]/checkin?date=YYYY-MM-DD  打卡（幂等）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorized();

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    let date = searchParams.get("date");
    if (!date) {
      let body: { date?: string } = {};
      try {
        body = await request.json();
      } catch {
        body = {};
      }
      date = body.date || new Date().toISOString().slice(0, 10);
    }

    const client = getSupabaseClient(auth.token);
    const { data: existing } = await client
      .from("habit_checkins")
      .select("id")
      .eq("habit_id", id)
      .eq("checkin_date", date)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true, data: { date, checked: true } });
    }

    const { error } = await client
      .from("habit_checkins")
      .insert({ user_id: auth.id, habit_id: id, checkin_date: date });
    if (error) throw new Error(`打卡失败: ${error.message}`);

    return NextResponse.json({ success: true, data: { date, checked: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// DELETE /api/habits/[id]/checkin?date=YYYY-MM-DD  取消打卡
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorized();

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);

    const client = getSupabaseClient(auth.token);
    const { error } = await client
      .from("habit_checkins")
      .delete()
      .eq("habit_id", id)
      .eq("checkin_date", date)
      .eq("user_id", auth.id);
    if (error) throw new Error(`取消失败: ${error.message}`);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// GET /api/habits/[id]/checkin?month=YYYY-MM  月度打卡日期集合（统计热力图）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorized();

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || new Date().toISOString().slice(0, 7);

    const client = getSupabaseClient(auth.token);
    const { data: habit, error: he } = await client
      .from("habit_defs")
      .select("*")
      .eq("id", id)
      .eq("user_id", auth.id)
      .single();
    if (he) throw new Error(`查询失败: ${he.message}`);

    const [yy, mm] = month.split("-").map(Number);
    const lastDay = new Date(yy, mm, 0).getDate();
    const { data: checkins, error } = await client
      .from("habit_checkins")
      .select("checkin_date")
      .eq("habit_id", id)
      .gte("checkin_date", `${month}-01`)
      .lte("checkin_date", `${month}-${String(lastDay).padStart(2, "0")}`)
      .order("checkin_date", { ascending: true });
    if (error) throw new Error(`查询失败: ${error.message}`);

    // 全部打卡用于连胜/累计统计
    const { data: allCheckins } = await client
      .from("habit_checkins")
      .select("checkin_date")
      .eq("habit_id", id)
      .order("checkin_date", { ascending: true });

    const allDates = ((allCheckins as { checkin_date: string }[]) || []).map((c) => c.checkin_date);
    const monthDates = ((checkins as { checkin_date: string }[]) || []).map((c) => c.checkin_date);

    return NextResponse.json({
      success: true,
      data: {
        habit,
        month_dates: monthDates,
        all_dates: allDates,
        total: allDates.length,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
