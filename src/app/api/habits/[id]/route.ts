import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { getAuthUser, unauthorized } from "@/lib/server-auth";

// PUT /api/habits/[id] - 编辑习惯
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorized();

    const { id } = await params;
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
      is_active,
    } = body;

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (icon !== undefined) updateData.icon = icon;
    if (color !== undefined) updateData.color = color;
    if (freq_type !== undefined) updateData.freq_type = freq_type;
    if (weekly_target !== undefined) updateData.weekly_target = weekly_target;
    if (weekly_days !== undefined) updateData.weekly_days = weekly_days;
    if (reminder_time !== undefined) updateData.reminder_time = reminder_time || null;
    if (start_date !== undefined) updateData.start_date = start_date;
    if (is_active !== undefined) updateData.is_active = Boolean(is_active);

    const client = getSupabaseClient(auth.token);
    const { data, error } = await client
      .from("habit_defs")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", auth.id)
      .select()
      .single();

    if (error) throw new Error(`更新失败: ${error.message}`);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// DELETE /api/habits/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorized();

    const { id } = await params;
    const client = getSupabaseClient(auth.token);
    const { error } = await client.from("habit_defs").delete().eq("id", id).eq("user_id", auth.id);
    if (error) throw new Error(`删除失败: ${error.message}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
