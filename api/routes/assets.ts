import { Hono } from "hono"
import { getAuthUser } from "../lib/auth"
import { fail, ok } from "../lib/response"

type Bindings = {
	DB: D1Database
	BUCKET: R2Bucket
	JWT_SECRET: string
	APP_WEB_URL: string
	MEDIA_BASE_URL?: string
	DEV_UPLOAD_LOCAL?: string
	LOCAL_UPLOAD_DIR?: string
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

function isLocalUploadEnabled(c: any): boolean {
	return String(c.env.DEV_UPLOAD_LOCAL || "false").toLowerCase() === "true"
}

function normalizeObjectKey(objectKey: string): string {
	return objectKey.replace(/\\/g, "/").replace(/\.\./g, "").replace(/^\/+/, "")
}

function joinUrl(base: string, path: string): string {
	return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`
}

function buildAssetUrl(c: any, normalizedKey: string): string {
	const mediaBase = c.env.MEDIA_BASE_URL || c.env.APP_WEB_URL || ""
	if (!mediaBase) {
		return `/media/${normalizedKey}`
	}
	// 本地上传文件默认由前端静态目录 /media 承载；R2 自定义域名直链使用根路径对象 key。
	if (isLocalUploadEnabled(c)) {
		return joinUrl(mediaBase, `media/${normalizedKey}`)
	}
	return joinUrl(mediaBase, normalizedKey)
}

function extractObjectKeyFromAssetUrl(assetUrl: string): string | null {
	try {
		const parsed = new URL(assetUrl)
		const path = parsed.pathname.replace(/^\/+/, "")
		if (!path) return null
		return normalizeObjectKey(
			path.startsWith("media/") ? path.slice("media/".length) : path,
		)
	} catch {
		const cleaned = assetUrl.replace(/^\/+/, "")
		if (!cleaned) return null
		return normalizeObjectKey(
			cleaned.startsWith("media/") ? cleaned.slice("media/".length) : cleaned,
		)
	}
}

async function resolveLocalTarget(objectKey: string, baseDir?: string) {
	const pathMod = await import("node:path")
	const cwd =
		typeof process !== "undefined" && process.cwd ? process.cwd() : "."
	const rootDir = pathMod.resolve(cwd, baseDir || "public/media")
	const safeKey = normalizeObjectKey(objectKey)
	const fullPath = pathMod.resolve(rootDir, safeKey)
	if (!fullPath.startsWith(rootDir + pathMod.sep) && fullPath !== rootDir) {
		throw new Error("invalid object key path")
	}
	return { rootDir, fullPath, safeKey }
}

async function writeLocalObject(c: any, objectKey: string, body: ArrayBuffer) {
	const fs = await import("node:fs/promises")
	const { fullPath } = await resolveLocalTarget(
		objectKey,
		c.env.LOCAL_UPLOAD_DIR,
	)
	const pathMod = await import("node:path")
	await fs.mkdir(pathMod.dirname(fullPath), { recursive: true })
	await fs.writeFile(fullPath, new Uint8Array(body))
}

async function statLocalObject(
	c: any,
	objectKey: string,
): Promise<{ size: number } | null> {
	try {
		const fs = await import("node:fs/promises")
		const { fullPath } = await resolveLocalTarget(
			objectKey,
			c.env.LOCAL_UPLOAD_DIR,
		)
		const stat = await fs.stat(fullPath)
		return { size: Number(stat.size || 0) }
	} catch {
		return null
	}
}

async function deleteLocalObject(c: any, objectKey: string) {
	try {
		const fs = await import("node:fs/promises")
		const { fullPath } = await resolveLocalTarget(
			objectKey,
			c.env.LOCAL_UPLOAD_DIR,
		)
		await fs.unlink(fullPath)
	} catch {
		// 文件不存在时忽略
	}
}

function isFsNotImplementedError(error: unknown): boolean {
	const msg = String(error || "")
	return msg.includes("[unenv]") && msg.includes("not implemented")
}

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

async function findAssetUsagePageTitles(c: any, assetId: string, tenantId: string) {
	const db = c.env.DB
	const usage = await db
		.prepare(
			`SELECT DISTINCT p.title
       FROM page_blocks pb
       JOIN pages p ON p.id = pb.page_id
       WHERE pb.tenant_id = ?
         AND p.tenant_id = ?
         AND (
           pb.ref_asset_id = ?
           OR (json_valid(pb.content_json) AND json_extract(pb.content_json, '$.assetId') = ?)
           OR pb.content_json LIKE ?
         )`,
		)
		.bind(tenantId, tenantId, assetId, assetId, `%${assetId}%`)
		.all()
	return (usage.results || []).map((row: any) => String(row.title || "未命名展示页"))
}

app.post("/sign", async (c) => {
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

app.put("/direct/:key{.+}", async (c) => {
	const user = await getAuthUser(c)
	if (!user) return fail(c, 4003, "未登录", 401)
	if (!user.tenantId) return fail(c, 4003, "无租户权限", 403)

	const objectKey = c.req.param("key")
	if (!objectKey.startsWith(`tenant/${user.tenantId}/`)) {
		return fail(c, 4003, "无权限", 403)
	}

	const body = await c.req.arrayBuffer()
	const contentType = c.req.header("Content-Type") || "application/octet-stream"

	if (isLocalUploadEnabled(c)) {
		try {
			await writeLocalObject(c, objectKey, body)
		} catch (error) {
			if (!isFsNotImplementedError(error)) throw error
			console.warn("[upload_local_fallback_r2]", {
				reason: String(error),
				objectKey,
			})
			await c.env.BUCKET.put(objectKey, body, {
				httpMetadata: { contentType },
				customMetadata: { tenantId: user.tenantId, uploadedBy: user.userId },
			})
		}
	} else {
		await c.env.BUCKET.put(objectKey, body, {
			httpMetadata: { contentType },
			customMetadata: { tenantId: user.tenantId, uploadedBy: user.userId },
		})
	}

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
	const normalizedKey = normalizeObjectKey(objectKey)
	const url = buildAssetUrl(c, normalizedKey)
	let object: { size: number } | null = null
	if (isLocalUploadEnabled(c)) {
		object = await statLocalObject(c, normalizedKey)
		if (!object) {
			const r2Obj = await c.env.BUCKET.head(normalizedKey)
			object = r2Obj ? { size: Number(r2Obj.size || 0) } : null
		}
	} else {
		const r2Obj = await c.env.BUCKET.head(normalizedKey)
		object = r2Obj ? { size: Number(r2Obj.size || 0) } : null
	}
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

	const usedByPages = await findAssetUsagePageTitles(c, id, user.tenantId)
	if (usedByPages.length > 0) {
		return fail(
			c,
			4091,
			`素材正在被展示页使用，无法删除。请先删除相关展示页：${usedByPages.join("、")}`,
			409,
		)
	}

	if (asset.source_type === "upload" && asset.url) {
		const objectKey = extractObjectKeyFromAssetUrl(String(asset.url))
		if (objectKey) {
			if (isLocalUploadEnabled(c)) {
				await deleteLocalObject(c, objectKey)
			}
			await c.env.BUCKET.delete(objectKey)
		}
	}

	await db
		.prepare("DELETE FROM assets WHERE id = ? AND tenant_id = ?")
		.bind(id, user.tenantId)
		.run()

	return ok(c, null)
})

app.post("/:id/replace", async (c) => {
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

	const body = await c.req.json()
	const now = new Date().toISOString()

	if (asset.source_type === "upload") {
		const objectKey = normalizeObjectKey(String(body.objectKey || ""))
		if (!objectKey) return fail(c, 4001, "缺少 objectKey", 400)
		if (!objectKey.startsWith(`tenant/${user.tenantId}/`)) {
			return fail(c, 4003, "无权限", 403)
		}

		let object: { size: number } | null = null
		if (isLocalUploadEnabled(c)) {
			object = await statLocalObject(c, objectKey)
			if (!object) {
				const r2Obj = await c.env.BUCKET.head(objectKey)
				object = r2Obj ? { size: Number(r2Obj.size || 0) } : null
			}
		} else {
			const r2Obj = await c.env.BUCKET.head(objectKey)
			object = r2Obj ? { size: Number(r2Obj.size || 0) } : null
		}
		if (!object) return fail(c, 4004, "替换素材不存在或已失效", 404)

		const oldKey = extractObjectKeyFromAssetUrl(String(asset.url || ""))
		if (oldKey && oldKey !== objectKey) {
			if (isLocalUploadEnabled(c)) {
				await deleteLocalObject(c, oldKey)
			}
			await c.env.BUCKET.delete(oldKey)
		}

		const nextUrl = buildAssetUrl(c, objectKey)
		const nextTitle = String(body.title || asset.title || "")
		await db
			.prepare(
				"UPDATE assets SET url = ?, title = ?, size_bytes = ?, updated_at = ? WHERE id = ? AND tenant_id = ?",
			)
			.bind(nextUrl, nextTitle, Number(object.size || 0), now, id, user.tenantId)
			.run()
	} else if (asset.source_type === "bilibili") {
		const url = String(body.url || "")
		if (!url) return fail(c, 4001, "请输入Bilibili链接", 400)
		const bvMatch = url.match(/BV[\w]+/)
		if (!bvMatch) return fail(c, 4001, "无法识别Bilibili视频链接", 400)
		const nextTitle = String(body.title || asset.title || bvMatch[0])
		await db
			.prepare(
				"UPDATE assets SET url = ?, bilibili_bvid = ?, title = ?, updated_at = ? WHERE id = ? AND tenant_id = ?",
			)
			.bind(url, bvMatch[0], nextTitle, now, id, user.tenantId)
			.run()
	} else {
		return fail(c, 4001, "不支持的素材类型", 400)
	}

	const updated = await db
		.prepare("SELECT * FROM assets WHERE id = ? AND tenant_id = ?")
		.bind(id, user.tenantId)
		.first()
	return ok(c, mapAssetRow(updated))
})

export default app
