import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getSupabaseUrl,
  getSupabaseAnonKey,
  getSupabaseAdmin,
} from '@/storage/database/supabase-client';

/**
 * 认证接口（登录 / 注册 / 刷新 / 登出）
 * 成功后把 access_token / refresh_token 写入 httpOnly cookie（防 XSS 窃取）。
 * 前端无需手动管理 token，业务请求自动携带 cookie。
 */

const ACCESS_TOKEN_AGE = 60 * 60; // 1 小时
const REFRESH_TOKEN_AGE = 60 * 60 * 24 * 30; // 30 天

function setAuthCookies(
  request: NextRequest,
  response: NextResponse,
  accessToken: string,
  refreshToken: string,
) {
  // secure 按请求协议判定：https 才加 Secure 属性；
  // http（本地/沙箱预览）不加，否则浏览器与 curl 都不会回传 cookie
  const proto =
    request.headers.get('x-forwarded-proto') ||
    request.nextUrl.protocol.replace(':', '');
  const secure = proto === 'https';
  response.cookies.set('sb_access_token', accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_TOKEN_AGE,
    secure,
  });
  response.cookies.set('sb_refresh_token', refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_TOKEN_AGE,
    secure,
  });
}

// POST /api/auth —— 登录 / 注册
// body: { action: 'login' | 'register', email, password }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: '请输入邮箱和密码' },
        { status: 400 },
      );
    }
    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { success: false, error: '密码至少 6 位' },
        { status: 400 },
      );
    }

    const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (action === 'register') {
      // 优先用 admin 接口创建用户并直接确认邮箱（免验证流程）
      try {
        const admin = getSupabaseAdmin();
        const { data, error } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
        if (error) {
          const msg = error.message?.includes('already been registered')
            ? '该邮箱已注册，请直接登录'
            : '注册失败：' + (error.message || '未知错误');
          return NextResponse.json(
            { success: false, error: msg },
            { status: 400 },
          );
        }
        if (!data.user) {
          return NextResponse.json(
            { success: false, error: '注册失败' },
            { status: 500 },
          );
        }
      } catch (e) {
        // 无 service key 时退化为标准注册（需部署方关闭邮箱验证）
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: {} },
        });
        if (error && !error.message?.includes('already')) {
          return NextResponse.json(
            { success: false, error: '注册失败：' + error.message },
            { status: 400 },
          );
        }
      }
      // 注册成功后直接登录
    }

    // 登录（注册后也走这里拿 session）
    const { data: session, error: loginError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (loginError || !session.session) {
      const msg =
        action === 'register'
          ? '注册成功，请登录'
          : '邮箱或密码错误';
      return NextResponse.json(
        { success: false, error: msg },
        { status: 401 },
      );
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: session.user.id,
        email: session.user.email,
      },
      // 返回 token 供前端 localStorage 兜底（iframe 预览等第三方 cookie 被拦截场景）
      tokens: {
        access_token: session.session.access_token,
        refresh_token: session.session.refresh_token,
      },
    });
    setAuthCookies(
      request,
      response,
      session.session.access_token,
      session.session.refresh_token,
    );
    return response;
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { success: false, error: '服务异常，请稍后重试' },
      { status: 500 },
    );
  }
}

// GET /api/auth —— 校验当前登录态（cookie 或 Bearer）
export async function GET(request: NextRequest) {
  const bearer = request.headers
    .get('authorization')
    ?.replace(/^Bearer\s+/i, '');
  const token = request.cookies.get('sb_access_token')?.value || bearer;
  if (!token) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }
  try {
    const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      return NextResponse.json({ valid: false }, { status: 401 });
    }
    return NextResponse.json({
      valid: true,
      user: { id: data.user.id, email: data.user.email },
    });
  } catch {
    return NextResponse.json({ valid: false }, { status: 401 });
  }
}

// PUT /api/auth —— 用 refresh_token 刷新 access_token（cookie 或 JSON body）
export async function PUT(request: NextRequest) {
  let bodyToken: string | undefined;
  try {
    const body = (await request.json()) as { refresh_token?: string };
    bodyToken = body?.refresh_token;
  } catch {
    // 无 body 时仅依赖 cookie
  }
  const refreshToken =
    request.cookies.get('sb_refresh_token')?.value || bodyToken;
  if (!refreshToken) {
    return NextResponse.json(
      { success: false, error: '登录已过期' },
      { status: 401 },
    );
  }
  try {
    const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });
    if (error || !data.session) {
      return NextResponse.json(
        { success: false, error: '登录已过期' },
        { status: 401 },
      );
    }
    const response = NextResponse.json({
      success: true,
      tokens: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
    });
    setAuthCookies(
      request,
      response,
      data.session.access_token,
      data.session.refresh_token,
    );
    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: '刷新失败' },
      { status: 401 },
    );
  }
}

// DELETE /api/auth —— 登出
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('sb_access_token', '', { path: '/', maxAge: 0 });
  response.cookies.set('sb_refresh_token', '', { path: '/', maxAge: 0 });
  return response;
}
