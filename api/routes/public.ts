import { Hono } from "hono"
import { fail, ok } from "../lib/response"

type Bindings = {
	DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

function mapCompanyRow(company: any) {
	return {
		id: company.id,
		tenantId: company.tenant_id,
		name: company.name,
		logoUrl: company.logo_url,
		intro: company.intro,
		contactPhone: company.contact_phone,
		contactWechat: company.contact_wechat,
		contactAddress: company.contact_address,
		status: company.status,
		createdAt: "",
		updatedAt: "",
	}
}

function mapPageBlockRow(block: any) {
	return {
		id: block.id,
		pageId: block.page_id,
		blockType: block.block_type,
		refAssetId: block.ref_asset_id,
		contentJson: block.content_json,
		sortOrder: block.sort_order,
	}
}

function mapPageRow(page: any, blocks: any[]) {
	return {
		id: page.id,
		tenantId: page.tenant_id,
		companyId: page.tenant_id,
		slug: page.slug,
		title: page.title,
		summary: page.summary,
		publishStatus: page.publish_status,
		publishedAt: page.published_at,
		blocks: (blocks || []).map(mapPageBlockRow),
		createdAt: page.created_at,
		updatedAt: page.updated_at,
	}
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

app.get("/pages/:slug", async (c) => {
	const slug = c.req.param("slug")
	if (!slug) return fail(c, 4001, "参数错误", 400)

	const db = c.env.DB

	const page = await db
		.prepare("SELECT * FROM pages WHERE slug = ? AND publish_status = ?")
		.bind(slug, "published")
		.first()
	if (!page) return fail(c, 4004, "页面不存在或未发布", 404)

	const company = await db
		.prepare(
			"SELECT id, tenant_id, name, logo_url, intro, contact_phone, contact_wechat, contact_address, status FROM companies WHERE tenant_id = ?",
		)
		.bind(page.tenant_id)
		.first()
	if (!company) return fail(c, 4004, "公司信息不存在", 404)

	const blocks = await db
		.prepare("SELECT * FROM page_blocks WHERE page_id = ? ORDER BY sort_order")
		.bind(page.id)
		.all()

	const assets = await db
		.prepare("SELECT * FROM assets WHERE tenant_id = ? AND status = ?")
		.bind(page.tenant_id, "ready")
		.all()

	return ok(c, {
		company: mapCompanyRow(company),
		page: mapPageRow(page, blocks.results || []),
		assets: (assets.results || []).map(mapAssetRow),
	})
})

export default app
