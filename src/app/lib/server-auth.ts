import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getSupabaseUrl,
  getSupabaseAnonKey,
} from '@/storage/database/supabase-client';

export interface AuthUser {
  id: string;
  email: string | null;
  token: string;
}

/** 从请求中提取 access_token（优先 Authorization header，其次 cookie） */
export function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return request.cookies.get('sb_access_token')?.value ?? null;
}

/**
 * 验证请求身份，返回当前用户；未登录/无效 token 返回 null。
 * 所有业务 API 必须调用此函数，确保数据按用户隔离。
 */
export async function getAuthUser(
  request: NextRequest,
): Promise<AuthUser | null> {
  const token = extractToken(request);
  if (!token) return null;

  try {
    const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email ?? null, token };
  } catch {
    return null;
  }
}

/** 401 统一响应 */
export function unauthorized(): NextResponse {
  return NextResponse.json(
    { success: false, error: '未登录或登录已过期' },
    { status: 401 },
  );
}
