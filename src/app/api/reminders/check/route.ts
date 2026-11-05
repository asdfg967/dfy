import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/storage/database/supabase-client";
import { getAuthUser } from "@/lib/server-auth";
import nodemailer from "nodemailer";

// ============================================================
// 到期提醒检查接口（多用户版）
// 触发方式（任一即可）：
//   1. 已登录用户在应用内打开页面时自动调用（cookie 鉴权）
//   2. 外部定时器带 secret 参数调用：/api/reminders/check?secret=<REMINDER_SECRET>
//   3. Cron 调用（Authorization: Bearer ${CRON_SECRET}）
// 邮件通过 QQ 邮箱 SMTP 发送，需要环境变量：
//   EMAIL_USER   发件邮箱（QQ 邮箱，如 12345@qq.com；兼容旧变量 QQ_EMAIL）
//   EMAIL_PASS   QQ 邮箱 SMTP 授权码（兼容旧变量 QQ_EMAIL_AUTH_CODE）
//   NOTIFY_EMAIL 全局收件邮箱（可选；配置后所有提醒聚合发到该邮箱，
//                否则按用户注册邮箱分别发送）
// ============================================================

interface TaskRow {
  id: string;
  user_id: string;
  title: string;
  type: string;
  due_date: string | null;
  location: string | null;
  notes: string | null;
  reminder_sent_at: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  homework: "作业",
  exam: "考试",
  meeting: "会议",
  payment: "缴费",
  checkin: "打卡",
  other: "其他",
  plan: "计划",
};

function formatDue(dueIso: string): string {
  const d = new Date(dueIso);
  return d.toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  });
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = process.env.EMAIL_USER || process.env.QQ_EMAIL;
  const pass = process.env.EMAIL_PASS || process.env.QQ_EMAIL_AUTH_CODE;

  if (!user || !pass) {
    return { ok: false, error: "未配置 EMAIL_USER / EMAIL_PASS 环境变量" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.qq.com",
      port: 465,
      secure: true,
      auth: { user, pass },
    });
    await transporter.sendMail({
      from: `"Deep 学生生活管理台" <${user}>`,
      to,
      subject,
      html,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "邮件发送失败" };
  }
}

const renderList = (list: TaskRow[], badge: string, color: string) =>
  list
    .map(
      (t) => `
    <div style="margin:8px 0;padding:12px 14px;background:#fff;border-left:4px solid ${color};border-radius:8px;">
      <div style="font-size:15px;font-weight:600;color:#1E293B;">
        <span style="display:inline-block;background:${color};color:#fff;font-size:12px;padding:1px 8px;border-radius:10px;margin-right:6px;">${badge}</span>
        ${t.title}
      </div>
      <div style="font-size:13px;color:#64748B;margin-top:6px;">
        ${TYPE_LABELS[t.type] || "其他"} · 截止：${t.due_date ? formatDue(t.due_date) : "未定"}
        ${t.location ? ` · 地点：${t.location}` : ""}
        ${t.notes ? `<br/>备注：${t.notes}` : ""}
      </div>
    </div>`,
    )
    .join("");

function buildHtml(tasks: TaskRow[], now: number): string {
  const urgent = tasks.filter(
    (t) => t.due_date && new Date(t.due_date).getTime() <= now + 3600 * 1000,
  );
  const soon = tasks.filter((t) => {
    if (!t.due_date) return false;
    const ts = new Date(t.due_date).getTime();
    return ts > now + 3600 * 1000;
  });

  return `
  <div style="max-width:480px;margin:0 auto;padding:16px;background:#EFF6FF;font-family:PingFang SC,Microsoft YaHei,sans-serif;">
    <h2 style="color:#2563EB;font-size:18px;margin:8px 0 12px;">⏰ 你有 ${tasks.length} 个事项即将到期</h2>
    ${urgent.length > 0 ? `<h3 style="color:#EF4444;font-size:14px;margin:12px 0 4px;">紧急（1 小时内到期）</h3>${renderList(urgent, "紧急", "#EF4444")}` : ""}
    ${soon.length > 0 ? `<h3 style="color:#F97316;font-size:14px;margin:12px 0 4px;">临期（24 小时内到期）</h3>${renderList(soon, "临期", "#F97316")}` : ""}
    <p style="font-size:12px;color:#94A3B8;margin-top:16px;">来自「Deep 学生生活管理台」的自动提醒，请及时处理。</p>
  </div>`;
}

export async function GET(request: NextRequest) {
  // ---------- 鉴权 ----------
  const authUser = await getAuthUser(request);
  const secret = request.nextUrl.searchParams.get("secret");
  const cronAuth = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const reminderSecret = process.env.REMINDER_SECRET;

  const authed =
    !!authUser ||
    (reminderSecret && secret === reminderSecret) ||
    (cronSecret && cronAuth === `Bearer ${cronSecret}`);

  if (!authed) {
    return NextResponse.json({ success: false, error: "未授权" }, { status: 401 });
  }

  // ---------- 查询即将到期的未完成事项（跨用户，service role） ----------
  const client = getSupabaseAdmin();
  const now = Date.now();
  const in24h = new Date(now + 24 * 3600 * 1000).toISOString();

  const { data, error } = await client
    .from("tasks")
    .select("id, user_id, title, type, due_date, location, notes, reminder_sent_at")
    .eq("status", "pending")
    .not("due_date", "is", null)
    .lte("due_date", in24h)
    .order("due_date", { ascending: true });

  if (error) {
    return NextResponse.json(
      { success: false, error: `查询失败: ${error.message}` },
      { status: 500 },
    );
  }

  const allTasks = (data || []) as TaskRow[];

  // 防重复：无 reminder_sent_at 或距今超过 20 小时
  const toNotify = allTasks.filter((t) => {
    if (!t.reminder_sent_at) return true;
    return now - new Date(t.reminder_sent_at).getTime() > 20 * 3600 * 1000;
  });

  if (toNotify.length === 0) {
    return NextResponse.json({
      success: true,
      message: "暂无需要提醒的事项",
      sent: 0,
    });
  }

  // ---------- 按用户分组 ----------
  const byUser = new Map<string, TaskRow[]>();
  toNotify.forEach((t) => {
    const list = byUser.get(t.user_id) || [];
    list.push(t);
    byUser.set(t.user_id, list);
  });

  // ---------- 获取用户邮箱 ----------
  const { data: authUsersData, error: usersError } =
    await client.auth.admin.listUsers({ perPage: 1000 });
  if (usersError) {
    return NextResponse.json(
      { success: false, error: `获取用户失败: ${usersError.message}` },
      { status: 500 },
    );
  }
  const emailMap = new Map<string, string>();
  (authUsersData?.users || []).forEach((u) => {
    if (u.email) emailMap.set(u.id, u.email);
  });

  const notifyOverride = process.env.NOTIFY_EMAIL;

  // ---------- 逐用户发送 ----------
  let totalSent = 0;
  const notifiedIds: string[] = [];
  const errors: string[] = [];

  for (const [userId, tasks] of byUser.entries()) {
    const to = notifyOverride || emailMap.get(userId);
    if (!to) continue; // 该用户无邮箱，跳过

    const html = buildHtml(tasks, now);
    const subject = `⏰ 提醒：${tasks.length} 个事项即将到期`;
    const result = await sendEmail(to, subject, html);

    if (result.ok) {
      totalSent += tasks.length;
      notifiedIds.push(...tasks.map((t) => t.id));
    } else {
      errors.push(`${to}: ${result.error}`);
    }
  }

  // 邮件发送成功后才标记已提醒，避免发送失败丢提醒
  if (notifiedIds.length > 0) {
    await client
      .from("tasks")
      .update({ reminder_sent_at: new Date(now).toISOString() })
      .in("id", notifiedIds);
  }

  return NextResponse.json({
    success: errors.length === 0,
    sent: totalSent,
    users: byUser.size,
    errors: errors.length > 0 ? errors : undefined,
  });
}

// POST 与 GET 等价（方便外部定时器 POST 调用）
export { GET as POST };
