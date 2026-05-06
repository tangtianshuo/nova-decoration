import { Hono } from "hono"
import { getAuthUser } from "../lib/auth"
import { fail, ok } from "../lib/response"

type Bindings = {
	DB: D1Database
	BUCKET: R2Bucket
	JWT_SECRET: string
	APP_WEB_URL: string
}

const app = new Hono<{ Bindings: Bindings }>()

function generateId(): string {
	return crypto.randomUUID()
}

const ALLOWED_IMAGE_TYPES = [
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/gif",
]
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"]
const MAX_IMAGE_SIZE = 20 * 1024 * 1024
const MAX_VIDEO_SIZE = 500 * 1024 * 1024

function mapAssetRow(asset: any) {
	return {
		id: asset.id,
		tenantId: asset.tenant_id,
		companyId: asset.tenant_id,
		sourceType: asset.source_type,
		assetType: asset.asset_type,
		url: asset.url,
		coverUrl: asset.cover_url,
		bilibiliBvid: asset.bilibili_bvid,
		title: asset.title,
		sizeBytes: asset.size_bytes,
		durationSec: asset.duration_sec,
		status: asset.status,
		createdAt: asset.created_at,
		updatedAt: asset.updated_at,
	}
}

app.post("/upload/sign", async (c) => {
	const user = await getAuthUser(c)
	if (!user) return fail(c, 4003, "未登录", 401)
	if (!user.tenantId) return fail(c, 4003, "无租户权限", 403)

	const { assetType, fileName, contentType, sizeBytes } = await c.req.json()
	if (!assetType || !fileName) {
		return fail(c, 4001, "参数错误", 400)
	}

	const allowedTypes =
		assetType === "image" ? ALLOWED_IMAGE_TYPES : ALLOWED_VIDEO_TYPES
	const maxSize = assetType === "image" ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE

	if (!allowedTypes.includes(contentType)) {
		return fail(c, 4001, `不支持的文件类型: ${contentType}`, 400)
	}
	if (sizeBytes > maxSize) {
		return fail(c, 4001, `文件大小超过限制 (${maxSize / 1024 / 1024}MB)`, 400)
	}

	const ext =
		fileName.split(".").pop() || (assetType === "image" ? "jpg" : "mp4")
	const datePath = new Date().toISOString().slice(0, 10).replace(/-/g, "/")
	const objectKey = `tenant/${user.tenantId}/${datePath}/${generateId()}.${ext}`

	return ok(c, {
		objectKey,
		uploadUrl: `/api/upload/direct/${objectKey}`,
		headers: { "Content-Type": contentType },
		expireAt: new Date(Date.now() + 3600000).toISOString(),
	})
})

app.put("/upload/direct/:key{.+}", async (c) => {
	const user = await getAuthUser(c)
	if (!user) return fail(c, 4003, "未登录", 401)
	if (!user.tenantId) return fail(c, 4003, "无租户权限", 403)

	const objectKey = c.req.param("key")
	if (!objectKey.startsWith(`tenant/${user.tenantId}/`)) {
		return fail(c, 4003, "无权限", 403)
	}

	const body = await c.req.arrayBuffer()
	const contentType = c.req.header("Content-Type") || "application/octet-stream"

	await c.env.BUCKET.put(objectKey, body, {
		httpMetadata: { contentType },
		customMetadata: { tenantId: user.tenantId, uploadedBy: user.userId },
	})

	return ok(c, { objectKey })
})

app.post("/complete", async (c) => {
	const user = await getAuthUser(c)
	if (!user) return fail(c, 4003, "未登录", 401)
	if (!user.tenantId) return fail(c, 4003, "无租户权限", 403)

	const { objectKey, assetType, title } = await c.req.json()
	if (!objectKey || !assetType) {
		return fail(c, 4001, "参数错误", 400)
	}

	const db = c.env.DB
	const now = new Date().toISOString()
	const mediaBase = c.env.APP_WEB_URL || ""
	const url = `${mediaBase}/media/${objectKey}`
	const object = await c.env.BUCKET.head(objectKey)
	if (!object) {
		return fail(c, 4004, "上传对象不存在或已失效", 404)
	}

	const existed = await db
		.prepare(
			"SELECT * FROM assets WHERE tenant_id = ? AND source_type = ? AND url = ? LIMIT 1",
		)
		.bind(user.tenantId, "upload", url)
		.first()
	if (existed) {
		return ok(c, mapAssetRow(existed))
	}

	const id = generateId()
	const objectSize = Number(object.size || 0)
	const safeTitle = title || objectKey.split("/").pop() || "未命名素材"

	await db
		.prepare(
			"INSERT INTO assets (id, tenant_id, source_type, asset_type, url, cover_url, bilibili_bvid, title, size_bytes, duration_sec, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		)
		.bind(
			id,
			user.tenantId,
			"upload",
			assetType,
			url,
			"",
			"",
			safeTitle,
			objectSize,
			0,
			"ready",
			now,
			now,
		)
		.run()

	const asset = await db
		.prepare("SELECT * FROM assets WHERE id = ?")
		.bind(id)
		.first()

	return ok(c, mapAssetRow(asset))
})

app.post("/bilibili", async (c) => {
	const user = await getAuthUser(c)
	if (!user) return fail(c, 4003, "未登录", 401)
	if (!user.tenantId) return fail(c, 4003, "无租户权限", 403)

	const { url, title } = await c.req.json()
	if (!url) return fail(c, 4001, "请输入Bilibili链接", 400)

	const bvMatch = url.match(/BV[\w]+/)
	if (!bvMatch) return fail(c, 4001, "无法识别Bilibili视频链接", 400)

	const bvid = bvMatch[0]
	const db = c.env.DB
	const id = generateId()
	const now = new Date().toISOString()

	await db
		.prepare(
			"INSERT INTO assets (id, tenant_id, source_type, asset_type, url, cover_url, bilibili_bvid, title, size_bytes, duration_sec, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		)
		.bind(
			id,
			user.tenantId,
			"bilibili",
			"video",
			url,
			"",
			bvid,
			title || bvid,
			0,
			0,
			"ready",
			now,
			now,
		)
		.run()

	const asset = await db
		.prepare("SELECT * FROM assets WHERE id = ?")
		.bind(id)
		.first()

	return ok(c, mapAssetRow(asset))
})

app.get("/", async (c) => {
	const user = await getAuthUser(c)
	if (!user) return fail(c, 4003, "未登录", 401)
	if (!user.tenantId) return fail(c, 4003, "无租户权限", 403)

	const db = c.env.DB
	const assets = await db
		.prepare(
			"SELECT * FROM assets WHERE tenant_id = ? ORDER BY created_at DESC",
		)
		.bind(user.tenantId)
		.all()

	return ok(c, (assets.results || []).map(mapAssetRow))
})

app.delete("/:id", async (c) => {
	const user = await getAuthUser(c)
	if (!user) return fail(c, 4003, "未登录", 401)
	if (!user.tenantId) return fail(c, 4003, "无租户权限", 403)

	const id = c.req.param("id")
	const db = c.env.DB

	const asset = await db
		.prepare("SELECT * FROM assets WHERE id = ? AND tenant_id = ?")
		.bind(id, user.tenantId)
		.first()
	if (!asset) return fail(c, 4004, "素材不存在", 404)

	if (asset.source_type === "upload" && asset.url) {
		const objectKey = (asset.url as string).split("/media/")[1]
		if (objectKey) await c.env.BUCKET.delete(objectKey)
	}

	await db
		.prepare("DELETE FROM assets WHERE id = ? AND tenant_id = ?")
		.bind(id, user.tenantId)
		.run()

	return ok(c, null)
})

export default app
