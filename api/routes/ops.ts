import { Hono } from "hono"
import { getAuthUser } from "../lib/auth"
import { fail, ok } from "../lib/response"

type Bindings = {
	DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

app.get("/metrics/overview", async (c) => {
	const user = await getAuthUser(c)
	if (!user) return fail(c, 4003, "未登录", 401)
	if (user.role !== "super_admin") return fail(c, 4003, "无权限", 403)

	const db = c.env.DB
	const [tenantCount, activeSubs, pastDueSubs, mrr, storageTop] =
		await Promise.all([
			db.prepare("SELECT COUNT(1) AS count FROM tenants").first(),
			db
				.prepare(
					"SELECT COUNT(1) AS count FROM tenant_subscriptions WHERE status IN (?, ?)",
				)
				.bind("active", "trialing")
				.first(),
			db
				.prepare(
					"SELECT COUNT(1) AS count FROM tenant_subscriptions WHERE status = ?",
				)
				.bind("past_due")
				.first(),
			db
				.prepare(
					`SELECT COALESCE(SUM(
             CASE
               WHEN s.billing_cycle = 'yearly' THEN p.price_yearly_cents / 12
               ELSE p.price_monthly_cents
             END
           ), 0) AS mrr_cents
           FROM tenant_subscriptions s
           JOIN plans p ON p.id = s.plan_id
           WHERE s.status IN ('active', 'trialing')`,
				)
				.first(),
			db
				.prepare(
					`SELECT t.id AS tenant_id, t.name AS tenant_name, COALESCE(SUM(a.size_bytes), 0) AS used_bytes
           FROM tenants t
           LEFT JOIN assets a ON a.tenant_id = t.id
           GROUP BY t.id, t.name
           ORDER BY used_bytes DESC
           LIMIT 10`,
				)
				.all(),
		])

	return ok(c, {
		tenantCount: Number(tenantCount?.count || 0),
		activeSubscriptions: Number(activeSubs?.count || 0),
		pastDueSubscriptions: Number(pastDueSubs?.count || 0),
		mrrCents: Number(mrr?.mrr_cents || 0),
		topStorageTenants: (storageTop.results || []).map((row) => ({
			tenantId: String((row as Record<string, unknown>).tenant_id || ""),
			tenantName: String((row as Record<string, unknown>).tenant_name || ""),
			usedBytes: Number((row as Record<string, unknown>).used_bytes || 0),
		})),
	})
})

export default app
