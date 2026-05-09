export type QuotaLimits = {
	maxMembers: number
	maxAssets: number
	maxPages: number
	maxStorageBytes: number
	maxMonthlyUploadBytes: number
}

export type CommercialGuard = {
	canWrite: boolean
	reason?: string
	subscriptionStatus?: string
}

export type TenantUsage = {
	members: number
	assets: number
	pages: number
	storageBytes: number
	monthlyUploadedBytes: number
	month: string
}

function monthKey(date = new Date()): string {
	const y = date.getUTCFullYear()
	const m = String(date.getUTCMonth() + 1).padStart(2, "0")
	return `${y}-${m}`
}

export async function getTenantSubscription(db: D1Database, tenantId: string) {
	return db
		.prepare(
			`SELECT
         s.id, s.tenant_id, s.plan_id, s.status, s.billing_cycle,
         s.trial_ends_at, s.current_period_start, s.current_period_end,
         p.code AS plan_code, p.name AS plan_name,
         p.price_monthly_cents, p.price_yearly_cents,
         p.max_members, p.max_assets, p.max_pages, p.max_storage_bytes, p.max_monthly_upload_bytes
       FROM tenant_subscriptions s
       JOIN plans p ON p.id = s.plan_id
       WHERE s.tenant_id = ?
       LIMIT 1`,
		)
		.bind(tenantId)
		.first()
}

export async function assertTenantWritable(
	db: D1Database,
	tenantId: string,
): Promise<CommercialGuard> {
	const subscription = await getTenantSubscription(db, tenantId)
	if (!subscription) {
		return { canWrite: true, subscriptionStatus: "unknown" }
	}

	const status = String(subscription.status || "")
	if (status === "active" || status === "trialing") {
		return { canWrite: true, subscriptionStatus: status }
	}
	if (status === "past_due") {
		return {
			canWrite: false,
			reason: "订阅欠费，当前租户为只读状态，请先续费",
			subscriptionStatus: status,
		}
	}
	if (status === "canceled") {
		return {
			canWrite: false,
			reason: "订阅已取消，当前租户已停写，请联系管理员",
			subscriptionStatus: status,
		}
	}
	return {
		canWrite: false,
		reason: "订阅状态异常，当前租户不可写",
		subscriptionStatus: status,
	}
}

export async function resolveQuotaLimits(
	db: D1Database,
	tenantId: string,
): Promise<QuotaLimits> {
	const subscription = await getTenantSubscription(db, tenantId)
	if (!subscription) {
		return {
			maxMembers: 3,
			maxAssets: 200,
			maxPages: 50,
			maxStorageBytes: 10 * 1024 * 1024 * 1024,
			maxMonthlyUploadBytes: 20 * 1024 * 1024 * 1024,
		}
	}

	const overrides = await db
		.prepare(
			`SELECT
         COALESCE(SUM(extra_members), 0) AS extra_members,
         COALESCE(SUM(extra_assets), 0) AS extra_assets,
         COALESCE(SUM(extra_pages), 0) AS extra_pages,
         COALESCE(SUM(extra_storage_bytes), 0) AS extra_storage_bytes,
         COALESCE(SUM(extra_monthly_upload_bytes), 0) AS extra_monthly_upload_bytes
       FROM tenant_quota_overrides
       WHERE tenant_id = ?`,
		)
		.bind(tenantId)
		.first()

	return {
		maxMembers:
			Number(subscription.max_members || 0) + Number(overrides?.extra_members || 0),
		maxAssets:
			Number(subscription.max_assets || 0) + Number(overrides?.extra_assets || 0),
		maxPages:
			Number(subscription.max_pages || 0) + Number(overrides?.extra_pages || 0),
		maxStorageBytes:
			Number(subscription.max_storage_bytes || 0) +
			Number(overrides?.extra_storage_bytes || 0),
		maxMonthlyUploadBytes:
			Number(subscription.max_monthly_upload_bytes || 0) +
			Number(overrides?.extra_monthly_upload_bytes || 0),
	}
}

export async function getTenantUsage(
	db: D1Database,
	tenantId: string,
): Promise<TenantUsage> {
	const month = monthKey()
	const [members, assets, pages, storage, monthly] = await Promise.all([
		db
			.prepare("SELECT COUNT(1) AS count FROM users WHERE tenant_id = ? AND status = ?")
			.bind(tenantId, "active")
			.first(),
		db
			.prepare("SELECT COUNT(1) AS count FROM assets WHERE tenant_id = ?")
			.bind(tenantId)
			.first(),
		db
			.prepare("SELECT COUNT(1) AS count FROM pages WHERE tenant_id = ?")
			.bind(tenantId)
			.first(),
		db
			.prepare("SELECT COALESCE(SUM(size_bytes), 0) AS bytes FROM assets WHERE tenant_id = ?")
			.bind(tenantId)
			.first(),
		db
			.prepare(
				"SELECT uploaded_bytes FROM usage_monthly_snapshots WHERE tenant_id = ? AND month = ?",
			)
			.bind(tenantId, month)
			.first(),
	])

	return {
		members: Number(members?.count || 0),
		assets: Number(assets?.count || 0),
		pages: Number(pages?.count || 0),
		storageBytes: Number(storage?.bytes || 0),
		monthlyUploadedBytes: Number(monthly?.uploaded_bytes || 0),
		month,
	}
}

export async function addMonthlyUploadBytes(
	db: D1Database,
	tenantId: string,
	bytes: number,
) {
	const month = monthKey()
	const now = new Date().toISOString()
	await db
		.prepare(
			`INSERT INTO usage_monthly_snapshots (
         id, tenant_id, month, uploaded_bytes, created_assets, created_pages, created_at
       )
       VALUES (?, ?, ?, ?, 0, 0, ?)
       ON CONFLICT(tenant_id, month)
       DO UPDATE SET uploaded_bytes = uploaded_bytes + excluded.uploaded_bytes`,
		)
		.bind(`${tenantId}-${month}`, tenantId, month, Math.max(0, bytes), now)
		.run()
}

export async function getTenantTransactions(
	db: D1Database,
	tenantId: string,
	limit = 20,
) {
	const safeLimit = Math.max(1, Math.min(100, limit))
	const rows = await db
		.prepare(
			`SELECT id, event_type, amount_cents, currency, provider, provider_txn_id, status, created_at
       FROM billing_transactions
       WHERE tenant_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
		)
		.bind(tenantId, safeLimit)
		.all()
	return rows.results || []
}
