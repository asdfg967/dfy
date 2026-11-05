import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { getAuthUser, unauthorized } from "@/lib/server-auth";

type TaskRecord = Record<string, unknown>;

// GET /api/tasks - List all tasks with optional filters
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorized();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const manual = searchParams.get("manual"); // "1" 仅手动计划, "0" 仅通知待办

    const client = getSupabaseClient(auth.token);
    let query = client
      .from("tasks")
      .select("*")
      .eq("user_id", auth.id)
      .order("due_date", { ascending: true, nullsFirst: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }
    if (type && type !== "all") {
      query = query.eq("type", type);
    }
    if (manual === "1") {
      query = query.eq("is_manual", true);
    } else if (manual === "0") {
      query = query.eq("is_manual", false);
    }
    // 周历按日期范围查询（截止日期在范围内，或开始时间在范围内）
    if (startDate && endDate) {
      query = query
        .gte("due_date", `${startDate}T00:00:00`)
        .lte("due_date", `${endDate}T23:59:59`);
    }

    const { data, error } = await query;
    if (error) throw new Error(`查询失败: ${error.message}`);

    return NextResponse.json({ success: true, data: data as TaskRecord[] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorized();

    const body = await request.json();
    const {
      title,
      type,
      due_date,
      start_time,
      end_time,
      is_manual,
      create_type,
      color,
      location,
      notes,
      source_text,
    } = body;

    if (!title) {
      return NextResponse.json({ success: false, error: "标题不能为空" }, { status: 400 });
    }

    const client = getSupabaseClient(auth.token);
    const { data, error } = await client
      .from("tasks")
      .insert({
        user_id: auth.id,
        title,
        type: type || "other",
        due_date: due_date || null,
        start_time: start_time || null,
        end_time: end_time || null,
        is_manual: Boolean(is_manual),
        create_type: create_type || null,
        color: color || null,
        location: location || null,
        notes: notes || null,
        source_text: source_text || null,
        status: "pending",
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

// PUT /api/tasks - Batch create tasks
export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorized();

    const body = await request.json();
    const { tasks: tasksData } = body;

    if (!Array.isArray(tasksData) || tasksData.length === 0) {
      return NextResponse.json({ success: false, error: "任务列表不能为空" }, { status: 400 });
    }

    const client = getSupabaseClient(auth.token);
    const insertData = tasksData.map(
      (t: {
        title: string;
        type?: string;
        due_date?: string;
        location?: string;
        notes?: string;
        source_text?: string;
      }) => ({
        user_id: auth.id,
        title: t.title,
        type: t.type || "other",
        due_date: t.due_date || null,
        location: t.location || null,
        notes: t.notes || null,
        source_text: t.source_text || null,
        status: "pending" as const,
      })
    );

    const { data, error } = await client.from("tasks").insert(insertData).select();
    if (error) throw new Error(`批量创建失败: ${error.message}`);

    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
