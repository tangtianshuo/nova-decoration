import { Hono } from "hono"
import { getAuthUser } from "../lib/auth"
import { fail, ok } from "../lib/response"

type Bindings = {
	DB: D1Database
	JWT_SECRET: string
}

const app = new Hono<{ Bindings: Bindings }>()

function generateId(): string {
	return crypto.randomUUID()
}

function generateSlug(title: string): string {
	return (
		title
			.toLowerCase()
			.replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
			.replace(/^-|-$/g, "")
			.slice(0, 60) || `page-${Date.now().toString(36)}`
	)
}

function mapPageBlockRow(block: any) {
	return {
		id: block.id,
		pageId: block.page_id,
		tenantId: block.tenant_id,
		companyId: block.tenant_id,
		blockType: block.block_type,
		refAssetId: block.ref_asset_id,
		contentJson: block.content_json,
		sortOrder: block.sort_order,
		createdAt: block.created_at,
		updatedAt: block.updated_at,
	}
}

function mapPageRow(page: any, blocks?: any[]) {
	return {
		id: page.id,
		tenantId: page.tenant_id,
		companyId: page.tenant_id,
		slug: page.slug,
		title: page.title,
		summary: page.summary,
		publishStatus: page.publish_status,
		publishedAt: page.published_at,
		createdAt: page.created_at,
		updatedAt: page.updated_at,
		blocks: blocks ? blocks.map(mapPageBlockRow) : undefined,
	}
}

app.get("/", async (c) => {
	const user = await getAuthUser(c)
	if (!user) return fail(c, 4003, "未登录", 401)
	if (!user.tenantId) return fail(c, 4003, "无租户权限", 403)

	const db = c.env.DB
	const pages = await db
		.prepare(
			"SELECT id, tenant_id, slug, title, summary, publish_status, published_at, created_at, updated_at FROM pages WHERE tenant_id = ? ORDER BY updated_at DESC",
		)
		.bind(user.tenantId)
		.all()

	return ok(
		c,
		(pages.results || []).map((page) => mapPageRow(page)),
	)
})

app.post("/", async (c) => {
	const user = await getAuthUser(c)
	if (!user) return fail(c, 4003, "未登录", 401)
	if (!user.tenantId) return fail(c, 4003, "无租户权限", 403)

	const { title, summary, publishStatus, blocks } = await c.req.json()
	if (!title) return fail(c, 4001, "请输入页面标题", 400)

	const db = c.env.DB
	const id = generateId()
	const slug = generateSlug(title)
	const now = new Date().toISOString()
	const status = publishStatus || "draft"
	const publishedAt = status === "published" ? now : null

	await db
		.prepare(
			"INSERT INTO pages (id, tenant_id, slug, title, summary, publish_status, published_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
		)
		.bind(
			id,
			user.tenantId,
			slug,
			title,
			summary || "",
			status,
			publishedAt,
			now,
			now,
		)
		.run()

	if (blocks && Array.isArray(blocks)) {
		for (let i = 0; i < blocks.length; i++) {
			const block = blocks[i]
			const blockId = crypto.randomUUID()
			await db
				.prepare(
					"INSERT INTO page_blocks (id, page_id, tenant_id, block_type, ref_asset_id, content_json, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
				)
				.bind(
					blockId,
					id,
					user.tenantId,
					block.blockType,
					block.refAssetId || "",
					JSON.stringify(block.contentJson || block.content_json || ""),
					i,
					now,
					now,
				)
				.run()
		}
	}

	const page = await db
		.prepare("SELECT * FROM pages WHERE id = ?")
		.bind(id)
		.first()
	const pageBlocks = await db
		.prepare("SELECT * FROM page_blocks WHERE page_id = ? ORDER BY sort_order")
		.bind(id)
		.all()

	return ok(c, mapPageRow(page, pageBlocks.results || []))
})

app.get("/:id", async (c) => {
	const user = await getAuthUser(c)
	if (!user) return fail(c, 4003, "未登录", 401)
	if (!user.tenantId) return fail(c, 4003, "无租户权限", 403)

	const id = c.req.param("id")
	const db = c.env.DB

	const page = await db
		.prepare("SELECT * FROM pages WHERE id = ? AND tenant_id = ?")
		.bind(id, user.tenantId)
		.first()
	if (!page) return fail(c, 4004, "页面不存在", 404)

	const blocks = await db
		.prepare("SELECT * FROM page_blocks WHERE page_id = ? ORDER BY sort_order")
		.bind(id)
		.all()

	return ok(c, mapPageRow(page, blocks.results || []))
})

app.put("/:id", async (c) => {
	const user = await getAuthUser(c)
	if (!user) return fail(c, 4003, "未登录", 401)
	if (!user.tenantId) return fail(c, 4003, "无租户权限", 403)

	const id = c.req.param("id")
	const db = c.env.DB

	const existing = await db
		.prepare("SELECT * FROM pages WHERE id = ? AND tenant_id = ?")
		.bind(id, user.tenantId)
		.first()
	if (!existing) return fail(c, 4004, "页面不存在", 404)

	const body = await c.req.json()
	const now = new Date().toISOString()

	await db
		.prepare(
			"UPDATE pages SET title = COALESCE(?, title), summary = COALESCE(?, summary), updated_at = ? WHERE id = ?",
		)
		.bind(body.title || null, body.summary || null, now, id)
		.run()

	if (body.blocks && Array.isArray(body.blocks)) {
		await db.prepare("DELETE FROM page_blocks WHERE page_id = ?").bind(id).run()
		for (let i = 0; i < body.blocks.length; i++) {
			const block = body.blocks[i]
			const blockId = crypto.randomUUID()
			await db
				.prepare(
					"INSERT INTO page_blocks (id, page_id, tenant_id, block_type, ref_asset_id, content_json, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
				)
				.bind(
					blockId,
					id,
					user.tenantId,
					block.blockType,
					block.refAssetId || "",
					JSON.stringify(block.contentJson || block.content_json || ""),
					i,
					now,
					now,
				)
				.run()
		}
	}

	const page = await db
		.prepare("SELECT * FROM pages WHERE id = ?")
		.bind(id)
		.first()
	const blocks = await db
		.prepare("SELECT * FROM page_blocks WHERE page_id = ? ORDER BY sort_order")
		.bind(id)
		.all()

	return ok(c, mapPageRow(page, blocks.results || []))
})

app.post("/:id/publish", async (c) => {
	const user = await getAuthUser(c)
	if (!user) return fail(c, 4003, "未登录", 401)
	if (!user.tenantId) return fail(c, 4003, "无租户权限", 403)

	const id = c.req.param("id")
	const db = c.env.DB

	const existing = await db
		.prepare("SELECT * FROM pages WHERE id = ? AND tenant_id = ?")
		.bind(id, user.tenantId)
		.first()
	if (!existing) return fail(c, 4004, "页面不存在", 404)

	const now = new Date().toISOString()
	await db
		.prepare(
			"UPDATE pages SET publish_status = ?, published_at = ?, updated_at = ? WHERE id = ?",
		)
		.bind("published", now, now, id)
		.run()

	const page = await db
		.prepare("SELECT * FROM pages WHERE id = ?")
		.bind(id)
		.first()
	return ok(c, mapPageRow(page))
})

app.post("/:id/offline", async (c) => {
	const user = await getAuthUser(c)
	if (!user) return fail(c, 4003, "未登录", 401)
	if (!user.tenantId) return fail(c, 4003, "无租户权限", 403)

	const id = c.req.param("id")
	const db = c.env.DB

	const existing = await db
		.prepare("SELECT * FROM pages WHERE id = ? AND tenant_id = ?")
		.bind(id, user.tenantId)
		.first()
	if (!existing) return fail(c, 4004, "页面不存在", 404)

	const now = new Date().toISOString()
	await db
		.prepare("UPDATE pages SET publish_status = ?, updated_at = ? WHERE id = ?")
		.bind("offline", now, id)
		.run()

	const page = await db
		.prepare("SELECT * FROM pages WHERE id = ?")
		.bind(id)
		.first()
	return ok(c, mapPageRow(page))
})

app.delete("/:id", async (c) => {
	const user = await getAuthUser(c)
	if (!user) return fail(c, 4003, "未登录", 401)
	if (!user.tenantId) return fail(c, 4003, "无租户权限", 403)

	const id = c.req.param("id")
	const db = c.env.DB

	const existing = await db
		.prepare("SELECT * FROM pages WHERE id = ? AND tenant_id = ?")
		.bind(id, user.tenantId)
		.first()
	if (!existing) return fail(c, 4004, "页面不存在", 404)

	await db.batch([
		db.prepare("DELETE FROM page_blocks WHERE page_id = ?").bind(id),
		db
			.prepare("UPDATE share_links SET status = ? WHERE page_id = ?")
			.bind("disabled", id),
		db.prepare("DELETE FROM pages WHERE id = ?").bind(id),
	])

	return ok(c, null)
})

export default app
