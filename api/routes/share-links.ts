import { Hono } from "hono"
import { getAuthUser } from "../lib/auth"
import { fail, ok } from "../lib/response"

type Bindings = {
	DB: D1Database
	JWT_SECRET: string
	DEFAULT_FALLBACK_URL: string
	QRCODE_BASE_URL: string
	APP_WEB_URL: string
}

const app = new Hono<{ Bindings: Bindings }>()
const CODE_RETRY_MAX = 5

function generateCode(): string {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	let code = ""
	for (let i = 0; i < 6; i++) {
		code += chars[Math.floor(Math.random() * chars.length)]
	}
	return code
}

function mapShareLinkRow(link: any, qrcodeBaseUrl?: string) {
	const shortUrl = qrcodeBaseUrl ? `${qrcodeBaseUrl}/q/${link.code}` : undefined
	return {
		id: link.id,
		tenantId: link.tenant_id,
		companyId: link.tenant_id,
		pageId: link.page_id,
		code: link.code,
		status: link.status,
		expireAt: link.expire_at,
		fallbackUrl: link.fallback_url,
		scanCount: link.scan_count,
		createdAt: link.created_at,
		updatedAt: link.updated_at,
		shortUrl,
	}
}

app.post("/", async (c) => {
	const user = await getAuthUser(c)
	if (!user) return fail(c, 4003, "未登录", 401)
	if (!user.tenantId) return fail(c, 4003, "无租户权限", 403)

	const { pageId, expireAt, fallbackUrl } = await c.req.json()
	if (!pageId) return fail(c, 4001, "请指定页面", 400)

	const db = c.env.DB

	const page = await db
		.prepare("SELECT * FROM pages WHERE id = ? AND tenant_id = ?")
		.bind(pageId, user.tenantId)
		.first()
	if (!page) return fail(c, 4004, "页面不存在", 404)

	const existing = await db
		.prepare(
			"SELECT * FROM share_links WHERE page_id = ? AND tenant_id = ? AND status = ?",
		)
		.bind(pageId, user.tenantId, "active")
		.first()
	if (existing) return ok(c, mapShareLinkRow(existing, c.env.QRCODE_BASE_URL))

	const id = crypto.randomUUID()
	const now = new Date().toISOString()
	let created = false
	let createdCode = ""
	for (let i = 0; i < CODE_RETRY_MAX; i++) {
		const code = generateCode()
		try {
			await db
				.prepare(
					"INSERT INTO share_links (id, tenant_id, page_id, code, status, expire_at, fallback_url, scan_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
				)
				.bind(
					id,
					user.tenantId,
					pageId,
					code,
					"active",
					expireAt || null,
					fallbackUrl || null,
					0,
					now,
					now,
				)
				.run()
			created = true
			createdCode = code
			break
		} catch (error) {
			const msg = String(error)
			if (!msg.includes("UNIQUE constraint failed: share_links.code")) {
				throw error
			}
		}
	}
	if (!created) return fail(c, 5000, "短链生成失败，请重试", 500)

	const link = await db
		.prepare("SELECT * FROM share_links WHERE id = ? AND code = ?")
		.bind(id, createdCode)
		.first()

	return ok(c, mapShareLinkRow(link, c.env.QRCODE_BASE_URL))
})

app.get("/", async (c) => {
	const user = await getAuthUser(c)
	if (!user) return fail(c, 4003, "未登录", 401)
	if (!user.tenantId) return fail(c, 4003, "无租户权限", 403)

	const db = c.env.DB
	const links = await db
		.prepare(
			"SELECT * FROM share_links WHERE tenant_id = ? ORDER BY created_at DESC",
		)
		.bind(user.tenantId)
		.all()

	return ok(
		c,
		(links.results || []).map((link) =>
			mapShareLinkRow(link, c.env.QRCODE_BASE_URL),
		),
	)
})

app.get("/:id", async (c) => {
	const user = await getAuthUser(c)
	if (!user) return fail(c, 4003, "未登录", 401)
	if (!user.tenantId) return fail(c, 4003, "无租户权限", 403)

	const id = c.req.param("id")
	const db = c.env.DB

	const link = await db
		.prepare("SELECT * FROM share_links WHERE id = ? AND tenant_id = ?")
		.bind(id, user.tenantId)
		.first()
	if (!link) return fail(c, 4004, "链接不存在", 404)

	return ok(c, mapShareLinkRow(link, c.env.QRCODE_BASE_URL))
})

app.put("/:id/disable", async (c) => {
	const user = await getAuthUser(c)
	if (!user) return fail(c, 4003, "未登录", 401)
	if (!user.tenantId) return fail(c, 4003, "无租户权限", 403)

	const id = c.req.param("id")
	const db = c.env.DB
	const now = new Date().toISOString()

	await db
		.prepare(
			"UPDATE share_links SET status = ?, updated_at = ? WHERE id = ? AND tenant_id = ?",
		)
		.bind("disabled", now, id, user.tenantId)
		.run()

	const link = await db
		.prepare("SELECT * FROM share_links WHERE id = ?")
		.bind(id)
		.first()
	return ok(c, mapShareLinkRow(link, c.env.QRCODE_BASE_URL))
})

app.put("/:id/enable", async (c) => {
	const user = await getAuthUser(c)
	if (!user) return fail(c, 4003, "未登录", 401)
	if (!user.tenantId) return fail(c, 4003, "无租户权限", 403)

	const id = c.req.param("id")
	const db = c.env.DB
	const now = new Date().toISOString()

	await db
		.prepare(
			"UPDATE share_links SET status = ?, updated_at = ? WHERE id = ? AND tenant_id = ?",
		)
		.bind("active", now, id, user.tenantId)
		.run()

	const link = await db
		.prepare("SELECT * FROM share_links WHERE id = ?")
		.bind(id)
		.first()
	return ok(c, mapShareLinkRow(link, c.env.QRCODE_BASE_URL))
})

export default app
