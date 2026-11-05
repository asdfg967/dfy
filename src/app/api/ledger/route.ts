import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { getAuthUser, unauthorized } from "@/lib/server-auth";
import { mapToMajorCategory } from "@/lib/ledger-categories";

// GET /api/ledger?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD - 区间流水（按时间倒序）
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorized();

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    const client = getSupabaseClient(auth.token);
    let query = client
      .from("ledger_records")
      .select("*")
      .eq("user_id", auth.id)
      .order("record_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (startDate) query = query.gte("record_date", startDate);
    if (endDate) query = query.lte("record_date", endDate);

    const { data, error } = await query;
    if (error) throw new Error(`查询失败: ${error.message}`);

    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/ledger - 记一笔
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorized();

    const body = await request.json();
    const { kind, amount, category, record_date, notes } = body;

    if (!kind || !["income", "expense"].includes(kind)) {
      return NextResponse.json({ success: false, error: "类型无效" }, { status: 400 });
    }
    const amt = Number(amount);
    if (Number.isNaN(amt) || amt <= 0) {
      return NextResponse.json({ success: false, error: "金额无效" }, { status: 400 });
    }
    if (!category) {
      return NextResponse.json({ success: false, error: "分类不能为空" }, { status: 400 });
    }
    const date = record_date || new Date().toISOString().slice(0, 10);

    const client = getSupabaseClient(auth.token);
    const { data, error } = await client
      .from("ledger_records")
      .insert({
        user_id: auth.id,
        kind,
        amount: amt.toFixed(2),
        category,
        // 自动归类大类（衣食住行/学习用品/生活用品等）
        major_category: mapToMajorCategory(category, notes),
        record_date: date,
        notes: notes || null,
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
