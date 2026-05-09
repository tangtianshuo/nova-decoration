import { Hono } from "hono"
import {
	getTenantSubscription,
	getTenantUsage,
	resolveQuotaLimits,
} from "../lib/commercial"
import { getAuthUser } from "../lib/auth"
import { requireRole, requireTenantScope } from "../lib/rbac"
import { fail, ok } from "../lib/response"

type Bindings = {
	DB: D1Database
	JWT_SECRET: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.get("/me", async (c) => {
	const user = await getAuthUser(c)
	if (!user) return fail(c, 4003, "未登录", 401)
	const tenantError = requireTenantScope(c, user)
	if (tenantError) return tenantError

	const tenantId = user.tenantId as string
	const [subscription, limits, usage] = await Promise.all([
		getTenantSubscription(c.env.DB, tenantId),
		resolveQuotaLimits(c.env.DB, tenantId),
		getTenantUsage(c.env.DB, tenantId),
	])

	return ok(c, {
		subscription: subscription
			? {
					id: subscription.id,
					status: subscription.status,
					planCode: subscription.plan_code,
					planName: subscription.plan_name,
				}
			: null,
		limits,
		usage,
		remaining: {
			members: Math.max(0, limits.maxMembers - usage.members),
			assets: Math.max(0, limits.maxAssets - usage.assets),
			pages: Math.max(0, limits.maxPages - usage.pages),
			storageBytes: Math.max(0, limits.maxStorageBytes - usage.storageBytes),
			monthlyUploadBytes: Math.max(
				0,
				limits.maxMonthlyUploadBytes - usage.monthlyUploadedBytes,
			),
		},
	})
})

app.post("/overrides", async (c) => {
	const user = await getAuthUser(c)
	if (!user) return fail(c, 4003, "未登录", 401)
	const tenantError = requireTenantScope(c, user)
	if (tenantError) return tenantError
	const roleError = requireRole(c, user, ["tenant_admin"])
	if (roleError) return roleError

	const body = await c.req.json()
	const now = new Date().toISOString()

	await c.env.DB
		.prepare(
			`INSERT INTO tenant_quota_overrides (
         id, tenant_id, extra_members, extra_assets, extra_pages,
         extra_storage_bytes, extra_monthly_upload_bytes, reason, created_by, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			crypto.randomUUID(),
			user.tenantId as string,
			Number(body.extraMembers || 0),
			Number(body.extraAssets || 0),
			Number(body.extraPages || 0),
			Number(body.extraStorageBytes || 0),
			Number(body.extraMonthlyUploadBytes || 0),
			body.reason ? String(body.reason) : null,
			user.userId,
			now,
		)
		.run()

	return ok(c, { applied: true })
})

export default app
