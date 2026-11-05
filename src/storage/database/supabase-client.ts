import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase 数据库客户端（标准架构）
 *
 * 环境变量（部署到 Render / Vercel 等平台时配置）：
 * - NEXT_PUBLIC_SUPABASE_URL      Supabase 项目 URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY Supabase 匿名公钥（可暴露，配合 RLS 使用）
 * - SUPABASE_SERVICE_ROLE_KEY     服务端管理密钥（保密，仅后端跨用户场景使用）
 *
 * 沙箱预览环境自动兜底读取 COZE_SUPABASE_* 变量，无需配置。
 */

function getSupabaseUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.COZE_SUPABASE_URL;
  if (!url) {
    throw new Error(
      '缺少环境变量 NEXT_PUBLIC_SUPABASE_URL（Supabase 项目地址）',
    );
  }
  return url;
}

function getSupabaseAnonKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.COZE_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error(
      '缺少环境变量 NEXT_PUBLIC_SUPABASE_ANON_KEY（Supabase 匿名公钥）',
    );
  }
  return key;
}

function getSupabaseServiceRoleKey(): string | undefined {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.COZE_SUPABASE_SERVICE_ROLE_KEY
  );
}

/**
 * 创建携带用户身份的客户端。
 * 传入用户的 access_token 后，所有查询自动受 RLS 策略限制（仅本人数据）。
 */
function getSupabaseClient(userToken: string): SupabaseClient {
  return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    global: {
      headers: { Authorization: `Bearer ${userToken}` },
    },
    db: { timeout: 60000 },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * 管理员客户端（service role，绕过 RLS）。
 * 仅用于服务端跨用户场景（如定时提醒遍历全部用户），绝不可下发到前端。
 */
function getSupabaseAdmin(): SupabaseClient {
  const serviceKey = getSupabaseServiceRoleKey();
  if (!serviceKey) {
    throw new Error('缺少环境变量 SUPABASE_SERVICE_ROLE_KEY（服务端管理密钥）');
  }
  return createClient(getSupabaseUrl(), serviceKey, {
    db: { timeout: 60000 },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export {
  getSupabaseUrl,
  getSupabaseAnonKey,
  getSupabaseServiceRoleKey,
  getSupabaseClient,
  getSupabaseAdmin,
};
