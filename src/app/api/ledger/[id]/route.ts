import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { getAuthUser, unauthorized } from "@/lib/server-auth";
import { mapToMajorCategory } from "@/lib/ledger-categories";

// PUT /api/ledger/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorized();

    const { id } = await params;
    const body = await request.json();
    const { kind, amount, category, record_date, notes } = body;

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (kind !== undefined) updateData.kind = kind;
    if (amount !== undefined) updateData.amount = Number(amount).toFixed(2);
    if (category !== undefined) updateData.category = category;
    if (record_date !== undefined) updateData.record_date = record_date;
    if (notes !== undefined) updateData.notes = notes || null;
    // 分类或备注变化时重新自动归类大类
    if (category !== undefined || notes !== undefined) {
      updateData.major_category = mapToMajorCategory(
        category ?? "",
        notes ?? null,
      );
    }

    const client = getSupabaseClient(auth.token);
    const { data, error } = await client
      .from("ledger_records")
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

// DELETE /api/ledger/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorized();

    const { id } = await params;
    const client = getSupabaseClient(auth.token);
    const { error } = await client.from("ledger_records").delete().eq("id", id).eq("user_id", auth.id);
    if (error) throw new Error(`删除失败: ${error.message}`);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
