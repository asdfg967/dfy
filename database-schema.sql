-- ============================================================
-- 学生生活管理台 - 数据库建表脚本 (PostgreSQL / Supabase)
-- 在 Supabase 后台 SQL Editor 中整段执行即可
-- ============================================================

-- 扩展：gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- 待办 / 计划 ----------
CREATE TABLE IF NOT EXISTS tasks (
  id           varchar(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  title        varchar(255) NOT NULL,
  type         varchar(20)  NOT NULL DEFAULT 'other',
  due_date     timestamptz,
  start_time   timestamptz,                 -- 手动计划起始时间
  end_time     timestamptz,                 -- 手动计划结束时间
  is_manual    boolean      NOT NULL DEFAULT false,  -- 是否手动安排的计划
  create_type  varchar(20),                 -- 手动计划分类 study/life/sport...
  color        varchar(20),                 -- 手动计划颜色
  location     varchar(255),
  notes        text,
  status       varchar(20)  NOT NULL DEFAULT 'pending',
  source_text  text,
  completed_at timestamptz,
  created_at   timestamptz  NOT NULL DEFAULT now(),
  updated_at   timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tasks_status_idx    ON tasks(status);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx  ON tasks(due_date);
CREATE INDEX IF NOT EXISTS tasks_type_idx      ON tasks(type);
CREATE INDEX IF NOT EXISTS tasks_created_at_idx ON tasks(created_at);
CREATE INDEX IF NOT EXISTS tasks_is_manual_idx ON tasks(is_manual);

-- ---------- 记账流水 ----------
CREATE TABLE IF NOT EXISTS ledger_records (
  id          varchar(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        varchar(10) NOT NULL,          -- income / expense
  amount      numeric(10,2) NOT NULL,
  category    varchar(30) NOT NULL,
  record_date date NOT NULL,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ledger_records_date_idx    ON ledger_records(record_date);
CREATE INDEX IF NOT EXISTS ledger_records_kind_idx    ON ledger_records(kind);
CREATE INDEX IF NOT EXISTS ledger_records_created_idx ON ledger_records(created_at);

-- ---------- 应用设置（键值对，如初始余额）----------
CREATE TABLE IF NOT EXISTS app_settings (
  key        varchar(50) PRIMARY KEY,
  value      text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- 日记（每天一篇）----------
CREATE TABLE IF NOT EXISTS diaries (
  id         varchar(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  diary_date date NOT NULL,
  content    text NOT NULL DEFAULT '',
  image_keys jsonb NOT NULL DEFAULT '[]'::jsonb,
  location   varchar(255),
  mood       varchar(10),
  tags       varchar(255),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS diaries_date_unique_idx ON diaries(diary_date);

-- ---------- 习惯定义 ----------
CREATE TABLE IF NOT EXISTS habit_defs (
  id            varchar(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  name          varchar(50) NOT NULL,
  icon          varchar(10) NOT NULL DEFAULT '⭐',
  color         varchar(20) NOT NULL DEFAULT '#10B981',
  freq_type     varchar(20) NOT NULL DEFAULT 'daily', -- daily/weekly_count/weekly_days
  weekly_target integer DEFAULT 7,
  weekly_days   jsonb NOT NULL DEFAULT '[]'::jsonb,   -- 0=周日...6=周六
  reminder_time varchar(5),
  start_date    date NOT NULL,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS habit_defs_active_idx ON habit_defs(is_active);

-- ---------- 习惯打卡记录 ----------
CREATE TABLE IF NOT EXISTS habit_checkins (
  id           varchar(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id     varchar(36) NOT NULL REFERENCES habit_defs(id) ON DELETE CASCADE,
  checkin_date date NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS habit_checkins_habit_date_unique_idx
  ON habit_checkins(habit_id, checkin_date);
CREATE INDEX IF NOT EXISTS habit_checkins_date_idx ON habit_checkins(checkin_date);

-- ============================================================
-- 重要：单用户 MVP，所有表禁用 RLS（服务端统一访问）
-- 若只 ENABLE 而不建 policy，anon key 会被静默过滤导致查询为空
-- ============================================================
ALTER TABLE tasks           DISABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_records  DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings    DISABLE ROW LEVEL SECURITY;
ALTER TABLE diaries         DISABLE ROW LEVEL SECURITY;
ALTER TABLE habit_defs      DISABLE ROW LEVEL SECURITY;
ALTER TABLE habit_checkins  DISABLE ROW LEVEL SECURITY;
