# 数据模型与 DDL 草案（D1 / SQLite 方言）

## 1. 命名约定

- 主键统一 `id`（TEXT，使用 UUID/ULID）。
- 时间字段统一 `created_at`、`updated_at`（ISO8601 字符串或 Unix 时间戳，二选一保持一致）。
- 所有业务表包含 `company_id`（多租户隔离）。

## 2. 表结构草案

```sql
-- 公司表
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  intro TEXT,
  contact_phone TEXT,
  contact_wechat TEXT,
  contact_address TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active|disabled
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin', -- admin|editor
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 素材表
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  source_type TEXT NOT NULL, -- upload|bilibili
  asset_type TEXT NOT NULL,  -- image|video
  url TEXT NOT NULL,
  cover_url TEXT,
  bilibili_bvid TEXT,
  title TEXT,
  size_bytes INTEGER,
  duration_sec INTEGER,
  status TEXT NOT NULL DEFAULT 'ready', -- uploading|ready|disabled
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 展示页
CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT,
  publish_status TEXT NOT NULL DEFAULT 'draft', -- draft|published|offline
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 页面模块（顺序化内容块）
CREATE TABLE IF NOT EXISTS page_blocks (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  block_type TEXT NOT NULL, -- text|image|video|product
  ref_asset_id TEXT,
  content_json TEXT, -- 富文本/产品信息 JSON
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 短链表（二维码核心）
CREATE TABLE IF NOT EXISTS share_links (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  page_id TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE, -- 例如 AB12CD
  status TEXT NOT NULL DEFAULT 'active', -- active|disabled|expired
  expire_at TEXT, -- 可空，空表示长期有效
  fallback_url TEXT, -- 可空，空则使用系统默认兜底页
  scan_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 事件日志
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  page_id TEXT,
  share_link_id TEXT,
  event_type TEXT NOT NULL, -- scan|visit|play|error
  event_data TEXT, -- JSON
  created_at TEXT NOT NULL
);
```

## 3. 索引建议

```sql
CREATE INDEX IF NOT EXISTS idx_assets_company ON assets(company_id);
CREATE INDEX IF NOT EXISTS idx_pages_company ON pages(company_id);
CREATE INDEX IF NOT EXISTS idx_blocks_page ON page_blocks(page_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_share_page ON share_links(page_id);
CREATE INDEX IF NOT EXISTS idx_events_company_time ON events(company_id, created_at);
```

## 4. 短链状态机

- `active`：可正常扫码访问目标展示页。
- `disabled`：手动停用，扫码跳转兜底页。
- `expired`：到期自动失效，扫码跳转兜底页。

状态转换：

- `active -> disabled`（运营手动操作）
- `active -> expired`（到期任务或访问时判定）
- `disabled -> active`（恢复）

## 5. 数据保留策略

- `share_links`：长期保留，不做自动删除。
- `events`：建议保留 180 天，归档后聚合统计。
- `assets`：若页面仍引用则禁止删除，避免历史二维码断链。
