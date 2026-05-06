import { Hono } from "hono"
import { getAuthUser } from "../lib/auth"
import { fail, ok } from "../lib/response"

type Bindings = {
	DB: D1Database
	JWT_SECRET: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.get("/me", async (c) => {
	const user = await getAuthUser(c)
	if (!user) return fail(c, 4003, "未登录", 401)
	if (!user.tenantId) return fail(c, 4003, "无租户权限", 403)

	const db = c.env.DB
	const company = await db
		.prepare(
			"SELECT id, tenant_id, name, logo_url, intro, contact_phone, contact_wechat, contact_address, status FROM companies WHERE tenant_id = ?",
		)
		.bind(user.tenantId)
		.first()

	if (!company) return fail(c, 4004, "公司不存在", 404)

	return ok(c, {
		id: company.id,
		tenantId: company.tenant_id,
		name: company.name,
		logoUrl: company.logo_url,
		intro: company.intro,
		contactPhone: company.contact_phone,
		contactWechat: company.contact_wechat,
		contactAddress: company.contact_address,
		status: company.status,
	})
})

app.put("/me", async (c) => {
	const user = await getAuthUser(c)
	if (!user) return fail(c, 4003, "未登录", 401)
	if (!user.tenantId) return fail(c, 4003, "无租户权限", 403)

	const body = await c.req.json()
	const { name, intro, contactPhone, contactWechat, contactAddress } = body
	const now = new Date().toISOString()

	const db = c.env.DB
	await db
		.prepare(
			"UPDATE companies SET name = COALESCE(?, name), intro = COALESCE(?, intro), contact_phone = COALESCE(?, contact_phone), contact_wechat = COALESCE(?, contact_wechat), contact_address = COALESCE(?, contact_address), updated_at = ? WHERE tenant_id = ?",
		)
		.bind(
			name || null,
			intro || null,
			contactPhone || null,
			contactWechat || null,
			contactAddress || null,
			now,
			user.tenantId,
		)
		.run()

	const company = await db
		.prepare(
			"SELECT id, tenant_id, name, logo_url, intro, contact_phone, contact_wechat, contact_address, status FROM companies WHERE tenant_id = ?",
		)
		.bind(user.tenantId)
		.first()

	return ok(c, {
		id: company.id,
		tenantId: company.tenant_id,
		name: company.name,
		logoUrl: company.logo_url,
		intro: company.intro,
		contactPhone: company.contact_phone,
		contactWechat: company.contact_wechat,
		contactAddress: company.contact_address,
		status: company.status,
	})
})

export default app
