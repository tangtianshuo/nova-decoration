import { Hono } from "hono"
import { getAuthUser } from "../lib/auth"
import { fail, ok } from "../lib/response"

type Bindings = {
	DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

app.post("/", async (c) => {
	const authUser = await getAuthUser(c)
	const { eventType, pageId, shareLinkId, eventData } = await c.req.json()
	if (!eventType) return fail(c, 4001, "缺少事件类型", 400)

	const db = c.env.DB
	const id = crypto.randomUUID()
	const now = new Date().toISOString()
	let tenantId: string | null = authUser?.tenantId || null
	if (!tenantId && shareLinkId) {
		const link = await db
			.prepare("SELECT tenant_id FROM share_links WHERE id = ? LIMIT 1")
			.bind(shareLinkId)
			.first()
		tenantId = (link?.tenant_id as string) || null
	}

	await db
		.prepare(
			"INSERT INTO events (id, tenant_id, page_id, share_link_id, event_type, event_data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
		)
		.bind(
			id,
			tenantId,
			pageId || null,
			shareLinkId || null,
			eventType,
			eventData ? JSON.stringify(eventData) : null,
			now,
		)
		.run()

	return ok(c, { id })
})

app.get("/summary", async (c) => {
	const user = await getAuthUser(c)
	if (!user) return fail(c, 4003, "未登录", 401)
	if (!user.tenantId) return fail(c, 4003, "无租户权限", 403)

	const daysRaw = Number(c.req.query("days") || 7)
	const days = Number.isFinite(daysRaw) ? Math.min(Math.max(daysRaw, 1), 30) : 7
	const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

	const db = c.env.DB
	const total = await db
		.prepare(
			"SELECT COUNT(1) as count FROM events WHERE tenant_id = ? AND created_at >= ?",
		)
		.bind(user.tenantId, since)
		.first()

	const byType = await db
		.prepare(
			"SELECT event_type, COUNT(1) as count FROM events WHERE tenant_id = ? AND created_at >= ? GROUP BY event_type ORDER BY count DESC",
		)
		.bind(user.tenantId, since)
		.all()

	const errorReasons = await db
		.prepare(
			"SELECT json_extract(event_data, '$.reason') as reason, COUNT(1) as count FROM events WHERE tenant_id = ? AND event_type = 'error' AND created_at >= ? GROUP BY reason ORDER BY count DESC",
		)
		.bind(user.tenantId, since)
		.all()

	return ok(c, {
		days,
		total: Number(total?.count || 0),
		byType: (byType.results || []).map((row: any) => ({
			eventType: row.event_type,
			count: Number(row.count || 0),
		})),
		errorReasons: (errorReasons.results || []).map((row: any) => ({
			reason: row.reason || "unknown",
			count: Number(row.count || 0),
		})),
	})
})

export default app
