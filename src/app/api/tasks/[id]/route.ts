import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { getAuthUser, unauthorized } from "@/lib/server-auth";

// PUT /api/tasks/[id] - Update a task
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorized();

    const { id } = await params;
    const body = await request.json();
    const { title, type, due_date, start_time, end_time, is_manual, create_type, color, location, notes, status, completed_at } = body;

    const client = getSupabaseClient(auth.token);
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (title !== undefined) updateData.title = title;
    if (type !== undefined) updateData.type = type;
    if (due_date !== undefined) updateData.due_date = due_date || null;
    if (start_time !== undefined) updateData.start_time = start_time || null;
    if (end_time !== undefined) updateData.end_time = end_time || null;
    if (is_manual !== undefined) updateData.is_manual = Boolean(is_manual);
    if (create_type !== undefined) updateData.create_type = create_type || null;
    if (color !== undefined) updateData.color = color || null;
    if (location !== undefined) updateData.location = location || null;
    if (notes !== undefined) updateData.notes = notes || null;
    if (status !== undefined) {
      updateData.status = status;
      if (status === "completed" && !completed_at) {
        updateData.completed_at = new Date().toISOString();
      }
      if (status === "pending") {
        updateData.completed_at = null;
      }
    }

    const { data, error } = await client
      .from("tasks")
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

// DELETE /api/tasks/[id] - Delete a task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorized();

    const { id } = await params;

    const client = getSupabaseClient(auth.token);
    const { error } = await client.from("tasks").delete().eq("id", id).eq("user_id", auth.id);
    if (error) throw new Error(`删除失败: ${error.message}`);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
