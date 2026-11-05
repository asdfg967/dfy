/**
 * 统一 AI 调用客户端（仅服务端使用）
 *
 * 两种模式（自动选择）：
 * 1. 配置了 LLM_API_KEY → 标准 fetch 调用 DeepSeek（OpenAI 兼容接口）
 *    - LLM_API_KEY        DeepSeek API 密钥（必填）
 *    - LLM_API_BASE_URL   接口地址（可选，默认 https://api.deepseek.com）
 *    - LLM_MODEL          文本模型（可选，默认 deepseek-chat）
 *    - LLM_VISION_MODEL   视觉模型（可选，默认同 LLM_MODEL）
 * 2. 未配置 LLM_API_KEY → 回退到沙箱内置模型（coze-coding-dev-sdk，仅预览环境）
 */

export interface AIContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string; detail?: 'low' | 'high' | 'auto' };
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | AIContentPart[];
}

// 仅类型层面的静态导入（不影响运行时动态加载）
import type { Message as SdkMessage } from 'coze-coding-dev-sdk';

interface ChatOptions {
  temperature?: number;
  /** 是否包含图片（选择视觉模型） */
  vision?: boolean;
  /** 最大输出 token */
  maxTokens?: number;
}

/** 是否配置了 DeepSeek 标准接口 */
export function hasDeepSeekKey(): boolean {
  return !!process.env.LLM_API_KEY;
}

/** DeepSeek 标准 fetch 调用（OpenAI 兼容格式） */
async function chatViaDeepSeek(
  messages: AIMessage[],
  opts: ChatOptions = {},
): Promise<string> {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) throw new Error('未配置 LLM_API_KEY');

  const baseUrl = (process.env.LLM_API_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '');
  const model = opts.vision
    ? process.env.LLM_VISION_MODEL || process.env.LLM_MODEL || 'deepseek-chat'
    : process.env.LLM_MODEL || 'deepseek-chat';

  const resp = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 4096,
      stream: false,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`DeepSeek 接口错误 (${resp.status}): ${errText.slice(0, 200)}`);
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('DeepSeek 返回格式异常');
  }
  return content;
}

/** 沙箱内置模型兜底（coze-coding-dev-sdk） */
async function chatViaSandbox(
  messages: AIMessage[],
  opts: ChatOptions = {},
): Promise<string> {
  // 平台运行环境中可能存在已失效的 COZE_API_TOKEN，移除后 SDK 回退到有效凭证
  if (process.env.COZE_API_TOKEN) {
    delete process.env.COZE_API_TOKEN;
  }
  const sdk = await import('coze-coding-dev-sdk');
  const client = new sdk.LLMClient(new sdk.Config());
  const response = await client.invoke(
    messages as unknown as SdkMessage[],
    {
      model: 'doubao-seed-2-0-pro-260215',
      temperature: opts.temperature ?? 0.3,
    },
  );
  return typeof response.content === 'string' ? response.content : '';
}

/**
 * 统一聊天补全入口。
 * 优先 DeepSeek（LLM_API_KEY），否则沙箱内置模型兜底。
 */
export async function aiChat(
  messages: AIMessage[],
  opts: ChatOptions = {},
): Promise<string> {
  if (hasDeepSeekKey()) {
    return chatViaDeepSeek(messages, opts);
  }
  return chatViaSandbox(messages, opts);
}

/** 从模型输出中提取 JSON（对象或数组），兼容代码块包裹与多余文字 */
export function parseJsonFromAI<T = unknown>(content: string): T | null {
  const cleaned = content.replace(/```(?:json)?/gi, '').trim();
  const match = cleaned.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}
