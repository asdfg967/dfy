# AGENTS.md

## 项目概览

「Deep 大肥鱼」学生生活管理台 H5：多用户注册/登录，移动端优先，面向中学生（微信内置浏览器/iOS Safari）。底部 4 Tab：①待办（通知 AI 提取 + 时间管理）②周历（周视图 + 时间轴 + 内嵌记账）③习惯（打卡 + 连胜）④日记（朋友圈式图文流 + AI 陪伴分析）。吉祥物 DeepFish（蓝色肥鱼 SVG）。

部署目标：Render（`npm install && npm run build` + `npm start`），同时兼容沙箱预览（pnpm）。

## 技术栈

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript 5
- **UI**: shadcn/ui + Tailwind CSS 4
- **数据库**: Supabase PostgreSQL（`@supabase/supabase-js` 直连，RLS 行级隔离）
- **认证**: Supabase Auth（后端 /api/auth 代理，httpOnly cookie：sb_access_token / sb_refresh_token）
- **AI**: DeepSeek 标准 fetch（OpenAI 兼容），沙箱兜底 coze-coding-dev-sdk
- **图片**: 有 COZE_BUCKET_* → 对象存储；否则 sharp 压缩 base64 入库（jsonb）
- **邮件**: nodemailer + QQ 邮箱 SMTP
- **图表**: recharts（记账饼图）

## 多用户隔离架构（核心）

- 6 张业务表均有 `user_id uuid NOT NULL`，全部 ENABLE RLS + policy `user_isolation`：`FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`
- 登录：POST /api/auth {action:'login'|'register'} → Supabase Auth，token 写 httpOnly cookie；注册用 admin.createUser(email_confirm:true) 免验证（需 SUPABASE_SERVICE_ROLE_KEY）
- 每个业务路由：`getAuthUser(request)`（lib/server-auth.ts）→ `getSupabaseClient(auth.token)`，查询自动受 RLS 限制；**INSERT 必须显式带 `user_id: auth.id`**
- middleware.ts 仅做凭证存在性快检（放行 /api/auth、/api/reminders/check）
- 前端统一 `apiFetch`（lib/api-client.ts）：401 自动 PUT /api/auth 刷新重试，失败广播 `auth:expired` 事件 → AuthGate 切回登录页
- 前端用 cookie，**不要**在 localStorage 存 token

## 目录结构

```
src/
├── app/
│   ├── page.tsx                  # 主页（品牌头 + 4 Tab 懒渲染）
│   ├── add/page.tsx              # 录入通知页
│   ├── layout.tsx                # AuthGate 包裹
│   └── api/
│       ├── auth/route.ts             # POST 登录/注册，GET 校验，PUT 刷新，DELETE 登出
│       ├── tasks/route.ts + tasks/[id]/route.ts
│       ├── extract/route.ts          # 通知 AI 提取（text/images）
│       ├── ledger/route.ts + ledger/[id]/route.ts  # 保存时自动归类 major_category
│       ├── settings/route.ts
│       ├── diaries/route.ts + diaries/[id]/route.ts
│       ├── diaries/upload/route.ts   # S3 或 base64 双模式
│       ├── diaries/image/route.ts    # base64 图片代理输出（长缓存）
│       ├── habits/route.ts + habits/[id]/route.ts + habits/[id]/checkin/route.ts
│       ├── ai/diary-feedback/route.ts    # 日记 AI 分析（情绪/安慰/生活/社交建议）
│       ├── ai/ledger-advice/route.ts     # 记账 AI 建议 + 饼图聚合数据
│       └── reminders/check/route.ts  # 到期邮件提醒（cookie/?secret=/Bearer 三种鉴权）
├── components/
│   ├── auth-gate.tsx             # 登录/注册门（替代旧 password-gate）
│   ├── deep-fish.tsx             # 吉祥物 SVG
│   ├── ledger-insights.tsx       # AI 账单分析（饼图+建议）
│   ├── bottom-nav / todo-tab / week-tab / ledger-panel / ledger-sheet /
│   │   habit-tab / habit-edit-sheet / habit-stats-sheet /
│   │   diary-tab / diary-edit-sheet / plan-edit-sheet /
│   │   task-card / task-edit-sheet / confirm-sheet
├── hooks/                        # use-tasks / use-ledger
├── lib/
│   ├── api-client.ts             # apiFetch + logout（401 自动刷新）
│   ├── server-auth.ts            # getAuthUser / unauthorized
│   ├── ai-client.ts              # aiChat 统一入口（DeepSeek→沙箱兜底）+ parseJsonFromAI
│   ├── ledger-categories.ts      # mapToMajorCategory 衣食住行等 6 大类
│   ├── date-utils / habit-types / diary-types
└── storage/
    ├── database/supabase-client.ts   # getSupabaseClient(token)/getSupabaseAdmin()
    ├── database/shared/schema.ts     # drizzle schema（仅类型参考，改表用 SQL）
    └── s3.ts                         # 对象存储（仅沙箱）
```

## 环境变量（Render 必配）

| 变量 | 说明 |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL | Supabase 项目 URL（沙箱自动兜底 COZE_SUPABASE_URL） |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | anon key（兜底 COZE_SUPABASE_ANON_KEY） |
| SUPABASE_SERVICE_ROLE_KEY | service key（兜底 COZE_SUPABASE_SERVICE_ROLE_KEY；注册免验证、提醒遍历） |
| LLM_API_KEY | DeepSeek 密钥（不配则沙箱预览用内置模型，Render 上 AI 不可用） |
| LLM_API_BASE_URL / LLM_MODEL / LLM_VISION_MODEL | 可选，默认 https://api.deepseek.com / deepseek-chat / 同 LLM_MODEL |
| EMAIL_USER / EMAIL_PASS / NOTIFY_EMAIL | QQ 邮箱 + SMTP 授权码（不配则跳过发信） |
| CRON_SECRET / REMINDER_SECRET | 外部 cron 调 /api/reminders/check 的鉴权 |

沙箱预览：以上全部自动兜底（COZE_SUPABASE_* 已注入，AI 用内置模型），无需配置。

## 数据库表

| 表 | 关键点 |
|---|---|
| tasks | user_id + 待办；due_date/start_time/end_time/is_manual/create_type/color/reminder_sent_at |
| ledger_records | user_id + kind/category/amount/record_date + major_category（保存时自动归类） |
| app_settings | 复合主键 (user_id, key)，upsert onConflict 'user_id,key' |
| diaries | user_id + diary_date 唯一索引 (user_id,diary_date)；image_keys jsonb（S3 key 或 data:URI 混合）；ai_feedback jsonb；tags 存 weather:emoji |
| habit_defs / habit_checkins | user_id；checkins (habit_id, checkin_date) 唯一 |

**改表纪律**：ALTER 加列必须同时加 user_id 以外的列直接 ALTER；新表必须 user_id NOT NULL + ENABLE RLS + user_isolation policy，缺一不可（否则 anon 查询静默为空或数据泄漏）。

## 开发命令

```bash
pnpm dev        # 沙箱开发（.coze dev）
pnpm build      # next build --webpack（Render 同用）
pnpm start      # next start（自动读 PORT 环境变量，Render 注入）
```

## API 约定

- 除 /api/auth、/api/reminders/check 外全部需登录（cookie 或 Bearer）
- 日期筛选：tasks/ledger GET 支持 start_date/end_date
- 习惯字段：DB 列名 freq_type、reminder_time
- 打卡：POST /api/habits/:id/checkin?date=YYYY-MM-DD（toggle）
- 日记图片：先 POST multipart /api/diaries/upload 拿 key，保存提交 image_keys
- AI 日记分析：POST /api/ai/diary-feedback {diary_id}，结果存 diaries.ai_feedback
- AI 记账建议：GET /api/ai/ledger-advice?days=30，返回 pie_data + summary + suggestions

## 设计规范

- 主色 #3B82F6（清新蓝），渐变 #3B82F6→#2563EB；背景 #F8FAFB
- 品牌头含 DeepFish 吉祥物；AI 卡片淡蓝渐变 #EFF6FF→#DBEAFE
- 移动端 max-width 480px，大按钮 ≥48px，中文界面，禁深色模式
- 详见 DESIGN.md
