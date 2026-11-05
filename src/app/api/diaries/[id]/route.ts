import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { getAuthUser, unauthorized } from "@/lib/server-auth";
import { getStorage } from "@/storage/s3";

// PUT /api/diaries/[id] - 编辑日记
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorized();

    const { id } = await params;
    const body = await request.json();
    const { diary_date, content, image_keys, location, mood, weather, ai_feedback } = body;

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (diary_date !== undefined) updateData.diary_date = diary_date;
    if (content !== undefined) updateData.content = content;
    if (image_keys !== undefined) updateData.image_keys = Array.isArray(image_keys) ? image_keys : [];
    if (location !== undefined) updateData.location = location || null;
    if (mood !== undefined) updateData.mood = mood || null;
    if (weather !== undefined) updateData.tags = weather ? `weather:${weather}` : null;
    if (ai_feedback !== undefined) updateData.ai_feedback = ai_feedback;

    const client = getSupabaseClient(auth.token);
    const { data, error } = await client
      .from("diaries")
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

// DELETE /api/diaries/[id] - 删除日记，尽力清理对象存储图片
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorized();

    const { id } = await params;
    const client = getSupabaseClient(auth.token);

    const { data } = await client
      .from("diaries")
      .select("image_keys")
      .eq("id", id)
      .eq("user_id", auth.id)
      .single();
    // base64 内嵌图片（data: 前缀）随行删除即可，仅需清理对象存储中的 key
    const keys = ((data?.image_keys as string[]) || []).filter(
      (k) => !k.startsWith("data:"),
    );

    const { error } = await client.from("diaries").delete().eq("id", id).eq("user_id", auth.id);
    if (error) throw new Error(`删除失败: ${error.message}`);

    if (keys.length > 0 && process.env.COZE_BUCKET_ENDPOINT_URL) {
      const storage = getStorage();
      await Promise.all(
        keys.map(async (key) => {
          try {
            await storage.deleteFile({ fileKey: key });
          } catch {
            // ignore
          }
        })
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
