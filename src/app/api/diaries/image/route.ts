import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { getAuthUser, unauthorized } from "@/lib/server-auth";

/**
 * GET /api/diaries/image?id=<diary_id>&idx=<图片序号>
 * 日记内嵌 base64 图片的代理输出（无对象存储时使用）。
 * RLS 保证只能读到本人日记，图片内容不可变，输出带长缓存。
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorized();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const idx = Number(searchParams.get("idx") || "0");
    if (!id || !Number.isInteger(idx) || idx < 0 || idx > 20) {
      return NextResponse.json({ success: false, error: "参数错误" }, { status: 400 });
    }

    const client = getSupabaseClient(auth.token);
    const { data, error } = await client
      .from("diaries")
      .select("image_keys")
      .eq("id", id)
      .eq("user_id", auth.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ success: false, error: "日记不存在" }, { status: 404 });
    }

    const keys = (data.image_keys as string[] | null) || [];
    const key = keys[idx];
    if (!key || !key.startsWith("data:")) {
      return NextResponse.json({ success: false, error: "图片不存在" }, { status: 404 });
    }

    const match = key.match(/^data:([^;]+);base64,([A-Za-z0-9+/=\r\n]+)$/);
    if (!match) {
      return NextResponse.json({ success: false, error: "图片格式错误" }, { status: 500 });
    }

    const buffer = Buffer.from(match[2], "base64");
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": match[1],
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
