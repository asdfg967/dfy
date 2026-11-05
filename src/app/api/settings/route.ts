import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { getAuthUser, unauthorized } from "@/lib/server-auth";

// GET /api/settings - 获取当前用户全部设置
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorized();

    const client = getSupabaseClient(auth.token);
    const { data, error } = await client
      .from("app_settings")
      .select("key, value")
      .eq("user_id", auth.id);
    if (error) throw new Error(`查询失败: ${error.message}`);

    const settings: Record<string, string> = {};
    (data as { key: string; value: string | null }[]).forEach((row) => {
      settings[row.key] = row.value ?? "";
    });
    return NextResponse.json({ success: true, data: settings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// PUT /api/settings - 更新设置  body: { key, value }
export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorized();

    const body = await request.json();
    const { key, value } = body;
    if (!key) {
      return NextResponse.json({ success: false, error: "key 不能为空" }, { status: 400 });
    }

    const client = getSupabaseClient(auth.token);
    const { data, error } = await client
      .from("app_settings")
      .upsert(
        { user_id: auth.id, key, value: String(value ?? ""), updated_at: new Date().toISOString() },
        { onConflict: "user_id,key" }
      )
      .select()
      .single();

    if (error) throw new Error(`保存失败: ${error.message}`);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
