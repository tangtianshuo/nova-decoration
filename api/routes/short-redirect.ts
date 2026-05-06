import type { Context } from "hono"

type Bindings = {
	DB: D1Database
	JWT_SECRET: string
	DEFAULT_FALLBACK_URL: string
	APP_WEB_URL: string
	QRCODE_BASE_URL: string
}

function buildFallbackUrl(
	c: Context<{ Bindings: Bindings }>,
	code: string,
	reason: string,
	customFallback?: string,
) {
	return (
		customFallback ||
		c.env.DEFAULT_FALLBACK_URL ||
		`${c.env.APP_WEB_URL}/fallback?code=${code}&reason=${reason}`
	)
}

async function logEvent(
	c: Context<{ Bindings: Bindings }>,
	params: {
		tenantId?: string | null
		pageId?: string | null
		shareLinkId?: string | null
		eventType: string
		eventData?: Record<string, unknown>
	},
) {
	const id = crypto.randomUUID()
	await c.env.DB.prepare(
		"INSERT INTO events (id, tenant_id, page_id, share_link_id, event_type, event_data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
	)
		.bind(
			id,
			params.tenantId ?? null,
			params.pageId ?? null,
			params.shareLinkId ?? null,
			params.eventType,
			params.eventData ? JSON.stringify(params.eventData) : null,
			new Date().toISOString(),
		)
		.run()
}

export async function redirectByCode(c: Context<{ Bindings: Bindings }>) {
	const code = c.req.param("code")
	if (!code) {
		return c.redirect(buildFallbackUrl(c, "", "notfound"))
	}

	const db = c.env.DB
	const link = await db
		.prepare("SELECT * FROM share_links WHERE code = ?")
		.bind(code)
		.first()

	if (!link) {
		await logEvent(c, {
			eventType: "error",
			eventData: { reason: "short_notfound", code },
		})
		return c.redirect(buildFallbackUrl(c, code, "notfound"))
	}

	if (link.status !== "active") {
		await logEvent(c, {
			tenantId: String(link.tenant_id),
			pageId: String(link.page_id),
			shareLinkId: String(link.id),
			eventType: "error",
			eventData: { reason: "short_inactive", code, status: link.status },
		})
		return c.redirect(
			buildFallbackUrl(
				c,
				code,
				String(link.status),
				(link.fallback_url as string) || undefined,
			),
		)
	}

	if (link.expire_at && new Date(link.expire_at as string) < new Date()) {
		await db
			.prepare("UPDATE share_links SET status = ?, updated_at = ? WHERE id = ?")
			.bind("expired", new Date().toISOString(), link.id)
			.run()
		await logEvent(c, {
			tenantId: String(link.tenant_id),
			pageId: String(link.page_id),
			shareLinkId: String(link.id),
			eventType: "error",
			eventData: { reason: "short_expired", code },
		})
		return c.redirect(
			buildFallbackUrl(
				c,
				code,
				"expired",
				(link.fallback_url as string) || undefined,
			),
		)
	}

	const page = await db
		.prepare("SELECT * FROM pages WHERE id = ?")
		.bind(link.page_id)
		.first()

	if (!page || page.publish_status !== "published") {
		await logEvent(c, {
			tenantId: String(link.tenant_id),
			pageId: String(link.page_id),
			shareLinkId: String(link.id),
			eventType: "error",
			eventData: { reason: "page_unpublished_or_missing", code },
		})
		return c.redirect(
			buildFallbackUrl(
				c,
				code,
				"disabled",
				(link.fallback_url as string) || undefined,
			),
		)
	}

	await db
		.prepare(
			"UPDATE share_links SET scan_count = scan_count + 1, updated_at = ? WHERE id = ?",
		)
		.bind(new Date().toISOString(), link.id)
		.run()
	await logEvent(c, {
		tenantId: String(link.tenant_id),
		pageId: String(link.page_id),
		shareLinkId: String(link.id),
		eventType: "scan",
		eventData: { code },
	})

	const webUrl = c.env.APP_WEB_URL || ""
	return c.redirect(`${webUrl}/s/${page.slug}`)
}
