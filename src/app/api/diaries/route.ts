import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { getAuthUser, unauthorized } from "@/lib/server-auth";
import { signImageUrls } from "@/storage/s3";

interface DiaryRow {
  id: string;
  diary_date: string;
  content: string;
  image_keys: string[] | null;
  location: string | null;
  mood: string | null;
  tags: string | null;
  ai_feedback: unknown | null;
  created_at: string;
  updated_at: string;
}

// tags 字段当前用于存储天气，前缀 weather:
function decodeWeather(tags: string | null): { weather: string | null } {
  if (tags && tags.startsWith("weather:")) {
    return { weather: tags.slice("weather:".length) || null };
  }
  return { weather: null };
}

async function normalize(row: DiaryRow) {
  const keys = row.image_keys || [];
  // base64 内嵌图片（data: 前缀）不签名，走代理路由按需输出，避免列表返回大体积 base64
  const s3Keys = keys.filter((k) => !k.startsWith("data:"));
  const urlMap = await signImageUrls(s3Keys);
  return {
    ...row,
    image_keys: keys,
    images: keys.map((k, i) =>
      k.startsWith("data:")
        ? `/api/diaries/image?id=${row.id}&idx=${i}`
        : urlMap[k] || "",
    ),
    ...decodeWeather(row.tags),
  };
}

// GET /api/diaries?date=YYYY-MM-DD  指定日期；不传则全部倒序
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorized();

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    const client = getSupabaseClient(auth.token);
    let query = client.from("diaries").select("*").eq("user_id", auth.id);
    if (date) {
      query = query.eq("diary_date", date);
    } else {
      query = query.order("diary_date", { ascending: false });
    }

    const { data, error } = await query;
    if (error) throw new Error(`查询失败: ${error.message}`);

    const rows = data as DiaryRow[];
    if (date) {
      const row = rows[0] || null;
      return NextResponse.json({ success: true, data: row ? await normalize(row) : null });
    }
    return NextResponse.json({ success: true, data: await Promise.all(rows.map(normalize)) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/diaries - 创建或更新某天日记（一天一篇，upsert）
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorized();

    const body = await request.json();
    const { diary_date, content, image_keys, location, mood, weather } = body;

    if (!diary_date) {
      return NextResponse.json({ success: false, error: "日期不能为空" }, { status: 400 });
    }

    const client = getSupabaseClient(auth.token);
    const { data, error } = await client
      .from("diaries")
      .upsert(
        {
          user_id: auth.id,
          diary_date,
          content: content || "",
          image_keys: Array.isArray(image_keys) ? image_keys : [],
          location: location || null,
          mood: mood || null,
          tags: weather ? `weather:${weather}` : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,diary_date" }
      )
      .select()
      .single();

    if (error) throw new Error(`保存失败: ${error.message}`);
    return NextResponse.json({ success: true, data: await normalize(data as DiaryRow) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
