import { NextRequest, NextResponse } from 'next/server';

// ============================================================
// API 统一鉴权中间件（Edge Runtime）
// 保护所有 /api/* 业务接口：未携带登录凭证一律 401
// 真正的 token 有效性验证在各路由内通过 getAuthUser 完成
// ============================================================

/** 免鉴权的接口路径前缀 */
const PUBLIC_PATHS = ['/api/auth'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 放行公开接口（登录/注册）
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 提醒检查接口支持外部定时触发器（secret 参数 / cron header），
  // 由接口内部自行鉴权，这里放行
  if (pathname.startsWith('/api/reminders/check')) {
    return NextResponse.next();
  }

  // 快速存在性检查：无凭证直接 401（有效性由路由内 getAuthUser 验证）
  const hasAuthHeader = request.headers
    .get('authorization')
    ?.startsWith('Bearer ');
  const hasCookie = !!request.cookies.get('sb_access_token')?.value;

  if (!hasAuthHeader && !hasCookie) {
    return NextResponse.json(
      { success: false, error: '未登录或登录已过期' },
      { status: 401 },
    );
  }

  return NextResponse.next();
}

export const config = {
  // 只拦截 API 路由，页面由前端 AuthGate 保护（页面无数据）
  matcher: ['/api/:path*'],
};
