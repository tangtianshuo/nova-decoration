import { Hono } from "hono"
import { getAuthUser } from "../lib/auth"
import {
	assertTenantWritable,
	getTenantSubscription,
	getTenantTransactions,
} from "../lib/commercial"
import { requireRole, requireTenantScope } from "../lib/rbac"
import { fail, ok } from "../lib/response"

type Bindings = {
	DB: D1Database
	JWT_SECRET: string
	BILLING_WEBHOOK_SECRET?: string
}

const app = new Hono<{ Bindings: Bindings }>()

function mapPlan(plan: any) {
	return {
		id: plan.id,
		code: plan.code,
		name: plan.name,
		priceMonthlyCents: Number(plan.price_monthly_cents || 0),
		priceYearlyCents: Number(plan.price_yearly_cents || 0),
		maxMembers: Number(plan.max_members || 0),
		maxAssets: Number(plan.max_assets || 0),
		maxPages: Number(plan.max_pages || 0),
		maxStorageBytes: Number(plan.max_storage_bytes || 0),
		maxMonthlyUploadBytes: Number(plan.max_monthly_upload_bytes || 0),
		status: plan.status,
	}
}

app.get("/plans", async (c) => {
	const plans = await c.env.DB.prepare(
		"SELECT * FROM plans WHERE status = ? ORDER BY price_monthly_cents ASC",
	)
		.bind("active")
		.all()
	return ok(c, (plans.results || []).map(mapPlan))
})

app.get("/subscription/me", async (c) => {
	const user = await getAuthUser(c)
	if (!user) return fail(c, 4003, "未登录", 401)
	const tenantError = requireTenantScope(c, user)
	if (tenantError) return tenantError

	const subscription = await getTenantSubscription(c.env.DB, user.tenantId as string)
	if (!subscription) return fail(c, 4004, "未找到订阅信息", 404)

	return ok(c, {
		id: subscription.id,
		tenantId: subscription.tenant_id,
		planId: subscription.plan_id,
		planCode: subscription.plan_code,
		planName: subscription.plan_name,
		status: subscription.status,
		billingCycle: subscription.billing_cycle,
		trialEndsAt: subscription.trial_ends_at,
		currentPeriodStart: subscription.current_period_start,
		currentPeriodEnd: subscription.current_period_end,
		priceMonthlyCents: Number(subscription.price_monthly_cents || 0),
		priceYearlyCents: Number(subscription.price_yearly_cents || 0),
	})
})

app.get("/transactions/me", async (c) => {
	const user = await getAuthUser(c)
	if (!user) return fail(c, 4003, "未登录", 401)
	const tenantError = requireTenantScope(c, user)
	if (tenantError) return tenantError

	const limit = Number(c.req.query("limit") || 20)
	const rows = await getTenantTransactions(
		c.env.DB,
		user.tenantId as string,
		Number.isFinite(limit) ? limit : 20,
	)
	return ok(c, rows)
})

app.post("/subscription/change-plan", async (c) => {
	const user = await getAuthUser(c)
	if (!user) return fail(c, 4003, "未登录", 401)
	const tenantError = requireTenantScope(c, user)
	if (tenantError) return tenantError
	const roleError = requireRole(c, user, ["tenant_admin"])
	if (roleError) return roleError

	const { planCode, billingCycle } = await c.req.json()
	if (!planCode) return fail(c, 4001, "缺少 planCode", 400)
	const nextBillingCycle = billingCycle === "yearly" ? "yearly" : "monthly"

	const db = c.env.DB
	const plan = await db
		.prepare("SELECT id, code, price_monthly_cents, price_yearly_cents FROM plans WHERE code = ? AND status = ?")
		.bind(planCode, "active")
		.first()
	if (!plan) return fail(c, 4004, "套餐不存在或不可用", 404)

	const tenantId = user.tenantId as string
	const now = new Date().toISOString()
	const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
	const sub = await getTenantSubscription(db, tenantId)
	if (!sub) return fail(c, 4004, "订阅不存在", 404)

	await db.batch([
		db
			.prepare(
				"UPDATE tenant_subscriptions SET plan_id = ?, billing_cycle = ?, status = ?, current_period_start = ?, current_period_end = ?, updated_at = ? WHERE tenant_id = ?",
			)
			.bind(plan.id, nextBillingCycle, "active", now, periodEnd, now, tenantId),
		db
			.prepare(
				"INSERT INTO billing_transactions (id, tenant_id, subscription_id, event_type, amount_cents, currency, provider, provider_txn_id, status, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
			)
			.bind(
				crypto.randomUUID(),
				tenantId,
				sub.id,
				"subscription.plan_changed",
				Number(nextBillingCycle === "yearly" ? plan.price_yearly_cents : plan.price_monthly_cents),
				"CNY",
				"manual",
				null,
				"succeeded",
				JSON.stringify({ planCode: plan.code, billingCycle: nextBillingCycle }),
				now,
			),
	])

	return ok(c, { tenantId, planCode: plan.code, billingCycle: nextBillingCycle, status: "active" })
})

app.post("/storage/purchase", async (c) => {
	const user = await getAuthUser(c)
	if (!user) return fail(c, 4003, "未登录", 401)
	const tenantError = requireTenantScope(c, user)
	if (tenantError) return tenantError
	const roleError = requireRole(c, user, ["tenant_admin"])
	if (roleError) return roleError

	const writable = await assertTenantWritable(c.env.DB, user.tenantId as string)
	if (!writable.canWrite) return fail(c, 4025, writable.reason || "租户不可写", 402)

	const { extraStorageGb, amountCents } = await c.req.json()
	const extraGb = Number(extraStorageGb || 0)
	if (!Number.isFinite(extraGb) || extraGb <= 0) {
		return fail(c, 4001, "extraStorageGb 必须大于 0", 400)
	}
	const bytes = Math.floor(extraGb * 1024 * 1024 * 1024)
	const now = new Date().toISOString()

	await c.env.DB.batch([
		c.env.DB
			.prepare(
				`INSERT INTO tenant_quota_overrides (
           id, tenant_id, extra_members, extra_assets, extra_pages,
           extra_storage_bytes, extra_monthly_upload_bytes, reason, created_by, created_at
         ) VALUES (?, ?, 0, 0, 0, ?, 0, ?, ?, ?)`,
			)
			.bind(
				crypto.randomUUID(),
				user.tenantId as string,
				bytes,
				`storage_pack_${extraGb}GB`,
				user.userId,
				now,
			),
		c.env.DB
			.prepare(
				"INSERT INTO billing_transactions (id, tenant_id, subscription_id, event_type, amount_cents, currency, provider, provider_txn_id, status, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
			)
			.bind(
				crypto.randomUUID(),
				user.tenantId as string,
				null,
				"storage.pack_purchased",
				Number(amountCents || 0),
				"CNY",
				"manual",
				null,
				"succeeded",
				JSON.stringify({ extraStorageGb: extraGb }),
				now,
			),
	])

	return ok(c, { extraStorageGb: extraGb, extraStorageBytes: bytes, applied: true })
})

app.post("/webhooks/payment", async (c) => {
	const secret = c.env.BILLING_WEBHOOK_SECRET || ""
	const incoming = c.req.header("x-billing-signature") || ""
	if (!secret || incoming !== secret) {
		return fail(c, 4003, "无效签名", 401)
	}

	const body = await c.req.json()
	const tenantId = String(body.tenantId || "")
	if (!tenantId) return fail(c, 4001, "缺少 tenantId", 400)
	const providerTxnId = body.providerTxnId ? String(body.providerTxnId) : ""
	if (providerTxnId) {
		const existed = await c.env.DB
			.prepare(
				"SELECT id FROM billing_transactions WHERE provider_txn_id = ? LIMIT 1",
			)
			.bind(providerTxnId)
			.first()
		if (existed) return ok(c, { received: true, deduplicated: true })
	}

	const now = new Date().toISOString()
	await c.env.DB
		.prepare(
			"INSERT INTO billing_transactions (id, tenant_id, subscription_id, event_type, amount_cents, currency, provider, provider_txn_id, status, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		)
		.bind(
			crypto.randomUUID(),
			tenantId,
			null,
			String(body.eventType || "payment.unknown"),
			Number(body.amountCents || 0),
			String(body.currency || "CNY"),
			String(body.provider || "manual"),
			providerTxnId || null,
			String(body.status || "succeeded"),
			JSON.stringify(body || {}),
			now,
		)
		.run()

	return ok(c, { received: true })
})

app.get("/admin/tenant/:tenantId", async (c) => {
	const user = await getAuthUser(c)
	if (!user) return fail(c, 4003, "未登录", 401)
	if (user.role !== "super_admin") return fail(c, 4003, "无权限", 403)

	const tenantId = c.req.param("tenantId")
	const [subscription, transactions] = await Promise.all([
		getTenantSubscription(c.env.DB, tenantId),
		getTenantTransactions(c.env.DB, tenantId, 50),
	])
	return ok(c, { subscription: subscription || null, transactions })
})

export default app
