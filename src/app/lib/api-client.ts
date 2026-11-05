'use client';

/**
 * 前端 API 请求封装（cookie + Bearer 双通道）：
 * - 优先携带 httpOnly cookie；同时若 localStorage 有 token，附带 Authorization: Bearer
 *   （iframe/第三方 cookie 被浏览器拦截的场景下，Bearer 头兜底，保证登录态可用）
 * - 401 时自动用 refresh_token 静默刷新并重试一次
 * - 刷新失败广播 auth:expired 事件，由 AuthGate 切回登录页
 */

const ACCESS_KEY = 'sb_access_token';
const REFRESH_KEY = 'sb_refresh_token';

export function saveTokens(accessToken: string, refreshToken: string): void {
  try {
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
  } catch {
    // 隐私模式等写入失败时忽略，退化为纯 cookie 模式
  }
}

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_KEY);
  } catch {
    return null;
  }
}

function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export function clearTokens(): void {
  try {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch {
    // ignore
  }
}

/** 给请求附加 Bearer 头（不覆盖调用方已有的 Authorization） */
function withAuthHeader(init?: RequestInit): RequestInit {
  const token = getAccessToken();
  if (!token) return init ?? {};
  const headers = new Headers(init?.headers);
  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return { ...init, headers };
}

let refreshing: Promise<boolean> | null = null;

/** 用 refresh_token 静默刷新会话（cookie/localStorage 双通道，并发去重） */
export function refreshSession(): Promise<boolean> {
  if (!refreshing) {
    const rt = getRefreshToken();
    refreshing = fetch('/api/auth', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      // body 携带 refresh_token（iframe 场景）；cookie 模式下服务端也会自己读 cookie
      body: JSON.stringify({ refresh_token: rt }),
    })
      .then(async (r) => {
        if (!r.ok) return false;
        const json = (await r.json()) as {
          tokens?: { access_token?: string; refresh_token?: string };
        };
        if (json.tokens?.access_token && json.tokens?.refresh_token) {
          saveTokens(json.tokens.access_token, json.tokens.refresh_token);
        }
        return true;
      })
      .catch(() => false)
      .finally(() => {
        // 防止并发请求重复刷新，1s 后允许再次刷新
        setTimeout(() => {
          refreshing = null;
        }, 1000);
      });
  }
  return refreshing;
}

export async function apiFetch(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(input, withAuthHeader(init));
  // 登录/注册接口自身的 401（如密码错误）不触发静默刷新
  if (res.status !== 401 || input.startsWith('/api/auth')) return res;

  const ok = await refreshSession();
  if (ok) {
    return fetch(input, withAuthHeader(init));
  }

  // 刷新失败，通知全局回到登录页
  if (typeof window !== 'undefined') {
    clearTokens();
    window.dispatchEvent(new CustomEvent('auth:expired'));
  }
  return res;
}

/** 登出 */
export async function logout(): Promise<void> {
  try {
    await fetch('/api/auth', withAuthHeader({ method: 'DELETE' }));
  } finally {
    clearTokens();
    window.dispatchEvent(new CustomEvent('auth:expired'));
  }
}
