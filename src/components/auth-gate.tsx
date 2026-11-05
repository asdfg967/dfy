'use client';

import { useState, useEffect, useCallback } from 'react';
import DeepFish from './deep-fish';
import { apiFetch, saveTokens, refreshSession } from "@/lib/api-client";

interface AuthGateProps {
  children: React.ReactNode;
}

type Mode = 'login' | 'register';

export default function AuthGate({ children }: AuthGateProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 校验登录态
  const checkAuth = useCallback(async () => {
    try {
      const res = await apiFetch('/api/auth');
      if (res.ok) {
        setIsAuthenticated(true);
        return;
      }
      // access_token 过期则尝试静默刷新（内部会带 localStorage 的 refresh_token）
      const ok = await refreshSession();
      if (ok) {
        setIsAuthenticated(true);
        return;
      }
    } catch (err) {
      console.error('Auth check failed:', err);
    }
    setIsAuthenticated(false);
  }, []);

  useEffect(() => {
    checkAuth().finally(() => setIsLoading(false));

    // 登录过期时切回登录页
    const onExpired = () => setIsAuthenticated(false);
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [checkAuth]);

  // 提交登录/注册
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const res = await apiFetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: mode, email, password }),
      });
      const data = await res.json();

      if (data.success) {
        // iframe/第三方 cookie 被拦截场景下，用 localStorage Bearer 兜底
        if (data.tokens?.access_token && data.tokens?.refresh_token) {
          saveTokens(data.tokens.access_token, data.tokens.refresh_token);
        }
        setIsAuthenticated(true);
      } else {
        setError(data.error || (mode === 'login' ? '登录失败' : '注册失败'));
      }
    } catch {
      setError('网络异常，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 加载中
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#EFF6FF]">
        <div className="text-[#64748B]">加载中...</div>
      </div>
    );
  }

  // 已认证，显示主内容
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // 未认证，显示登录/注册界面
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#EFF6FF] px-4">
      <div className="w-full max-w-[400px]">
        {/* 大肥鱼形象 */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-2">
            <DeepFish size={110} className="drop-shadow-sm" />
          </div>
          <h1 className="text-xl font-semibold text-[#1E293B] mb-1">
            Deep 学生生活管理台
          </h1>
          <p className="text-sm text-[#64748B]">
            {mode === 'login' ? '欢迎回来，登录继续管理你的生活' : '注册账号，开启有序生活'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          {/* 登录/注册切换 */}
          <div className="flex bg-[#EFF6FF] rounded-xl p-1 mb-5">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 h-10 rounded-lg text-sm font-medium transition-all ${
                mode === 'login'
                  ? 'bg-white text-[#2563EB] shadow-sm'
                  : 'text-[#64748B]'
              }`}
            >
              登录
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); }}
              className={`flex-1 h-10 rounded-lg text-sm font-medium transition-all ${
                mode === 'register'
                  ? 'bg-white text-[#2563EB] shadow-sm'
                  : 'text-[#64748B]'
              }`}
            >
              注册
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="邮箱"
                required
                autoComplete="email"
                className="w-full h-12 px-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#3B82F6] focus:bg-white transition-colors"
              />
            </div>
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? '密码（至少 6 位）' : '密码'}
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full h-12 px-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#3B82F6] focus:bg-white transition-colors"
              />
            </div>

            {error && (
              <div className="text-sm text-[#EF4444] bg-[#FEF2F2] rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-[#3B82F6] hover:bg-[#2563EB] active:scale-[0.98] text-white font-medium rounded-xl transition-all disabled:opacity-50"
            >
              {isSubmitting
                ? '请稍候...'
                : mode === 'login'
                  ? '登录'
                  : '注册并登录'}
            </button>
          </form>

          <p className="text-xs text-[#94A3B8] text-center mt-4">
            你的日程、习惯、账单、日记仅自己可见
          </p>
        </div>
      </div>
    </div>
  );
}
