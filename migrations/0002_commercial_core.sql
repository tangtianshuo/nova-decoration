CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price_monthly_cents INTEGER NOT NULL DEFAULT 0,
  price_yearly_cents INTEGER NOT NULL DEFAULT 0,
  max_members INTEGER NOT NULL DEFAULT 3,
  max_assets INTEGER NOT NULL DEFAULT 200,
  max_pages INTEGER NOT NULL DEFAULT 50,
  max_storage_bytes INTEGER NOT NULL DEFAULT 10737418240,
  max_monthly_upload_bytes INTEGER NOT NULL DEFAULT 21474836480,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tenant_subscriptions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL UNIQUE,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'trialing',
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  trial_ends_at TEXT,
  current_period_start TEXT,
  current_period_end TEXT,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
  canceled_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS billing_transactions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  subscription_id TEXT,
  event_type TEXT NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'CNY',
  provider TEXT NOT NULL DEFAULT 'manual',
  provider_txn_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  payload_json TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tenant_quota_overrides (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  extra_members INTEGER NOT NULL DEFAULT 0,
  extra_assets INTEGER NOT NULL DEFAULT 0,
  extra_pages INTEGER NOT NULL DEFAULT 0,
  extra_storage_bytes INTEGER NOT NULL DEFAULT 0,
  extra_monthly_upload_bytes INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS usage_monthly_snapshots (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  month TEXT NOT NULL,
  uploaded_bytes INTEGER NOT NULL DEFAULT 0,
  created_assets INTEGER NOT NULL DEFAULT 0,
  created_pages INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS release_audits (
  id TEXT PRIMARY KEY,
  env TEXT NOT NULL,
  release_version TEXT NOT NULL,
  commit_sha TEXT NOT NULL,
  triggered_by TEXT NOT NULL,
  quality_gate TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON tenant_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_tenant_time ON billing_transactions(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_quota_overrides_tenant ON tenant_quota_overrides(tenant_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_tenant_month ON usage_monthly_snapshots(tenant_id, month);

INSERT OR IGNORE INTO plans (
  id,
  code,
  name,
  price_monthly_cents,
  price_yearly_cents,
  max_members,
  max_assets,
  max_pages,
  max_storage_bytes,
  max_monthly_upload_bytes,
  status,
  created_at,
  updated_at
)
VALUES
  (
    'plan-free',
    'free',
    '免费版',
    0,
    0,
    3,
    200,
    50,
    10737418240,
    21474836480,
    'active',
    datetime('now'),
    datetime('now')
  ),
  (
    'plan-pro',
    'pro',
    '专业版',
    19900,
    199000,
    20,
    5000,
    1000,
    214748364800,
    536870912000,
    'active',
    datetime('now'),
    datetime('now')
  ),
  (
    'plan-enterprise',
    'enterprise',
    '企业版',
    99900,
    999000,
    200,
    30000,
    10000,
    1099511627776,
    2199023255552,
    'active',
    datetime('now'),
    datetime('now')
  );

INSERT OR IGNORE INTO tenant_subscriptions (
  id,
  tenant_id,
  plan_id,
  status,
  billing_cycle,
  trial_ends_at,
  current_period_start,
  current_period_end,
  cancel_at_period_end,
  created_at,
  updated_at
)
SELECT
  'sub-' || t.id,
  t.id,
  'plan-free',
  'trialing',
  'monthly',
  datetime('now', '+14 day'),
  datetime('now'),
  datetime('now', '+1 month'),
  0,
  datetime('now'),
  datetime('now')
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1
  FROM tenant_subscriptions s
  WHERE s.tenant_id = t.id
);
