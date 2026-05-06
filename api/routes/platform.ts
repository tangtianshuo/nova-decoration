import { Hono, type Context } from "hono"
import { getAuthUser, hashPassword } from "../lib/auth"
import { fail, ok } from "../lib/response"

type Bindings = {
	DB: D1Database
	PASSWORD_PEPPER?: string
}

const app = new Hono<{ Bindings: Bindings }>()

function generateId(): string {
	return crypto.randomUUID()
}

const TENANT_ROLES = ["tenant_admin", "tenant_editor", "tenant_viewer"] as const
const TENANT_USER_STATUSES = ["active", "disabled"] as const

async function requireSuperAdmin(c: Context<{ Bindings: Bindings }>) {
	const user = await getAuthUser(c)
	if (!user) return { user: null, error: fail(c, 4003, "未登录", 401) }
	if (user.role !== "super_admin") {
		return { user: null, error: fail(c, 4003, "无权限", 403) }
	}
	return { user, error: null }
}

app.post("/tenants", async (c) => {
	const auth = await requireSuperAdmin(c)
	if (auth.error) return auth.error

	const { tenantName, adminEmail, adminPassword, companyName } = await c.req.json()
	if (!tenantName || !adminEmail || !adminPassword) {
		return fail(c, 4001, "请填写租户名称、管理员邮箱和密码", 400)
	}

	const db = c.env.DB
	const existedEmail = await db
		.prepare("SELECT id FROM users WHERE email = ?")
		.bind(adminEmail)
		.first()
	if (existedEmail) return fail(c, 4090, "管理员邮箱已存在", 409)

	const existedTenant = await db
		.prepare("SELECT id FROM tenants WHERE name = ?")
		.bind(tenantName)
		.first()
	if (existedTenant) return fail(c, 4090, "租户名称已存在", 409)

	const tenantId = generateId()
	const companyId = generateId()
	const adminUserId = generateId()
	const now = new Date().toISOString()
	const passwordHash = await hashPassword(adminPassword, c.env.PASSWORD_PEPPER ?? "")

	await db.batch([
		db
			.prepare(
				"INSERT INTO tenants (id, name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
			)
			.bind(tenantId, tenantName, "active", now, now),
		db
			.prepare(
				"INSERT INTO companies (id, tenant_id, name, logo_url, intro, contact_phone, contact_wechat, contact_address, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
			)
			.bind(
				companyId,
				tenantId,
				companyName || tenantName,
				"",
				"",
				"",
				"",
				"",
				"active",
				now,
				now,
			),
		db
			.prepare(
				"INSERT INTO users (id, tenant_id, email, password_hash, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
			)
			.bind(
				adminUserId,
				tenantId,
				adminEmail,
				passwordHash,
				"tenant_admin",
				"active",
				now,
				now,
			),
	])

	return ok(c, {
		tenant: { id: tenantId, name: tenantName, status: "active", createdAt: now },
		company: { id: companyId, tenantId, name: companyName || tenantName },
		adminUser: { id: adminUserId, tenantId, email: adminEmail, role: "tenant_admin" },
	})
})

app.get("/tenants", async (c) => {
	const auth = await requireSuperAdmin(c)
	if (auth.error) return auth.error

	const keyword = (c.req.query("keyword") || "").trim()
	const pageRaw = Number(c.req.query("page") || 1)
	const pageSizeRaw = Number(c.req.query("pageSize") || 10)
	const page = Number.isFinite(pageRaw) ? Math.max(1, Math.floor(pageRaw)) : 1
	const pageSize = Number.isFinite(pageSizeRaw)
		? Math.min(50, Math.max(1, Math.floor(pageSizeRaw)))
		: 10
	const offset = (page - 1) * pageSize

	const db = c.env.DB
	const keywordLike = `%${keyword}%`
	const whereSql = keyword
		? "WHERE t.name LIKE ? OR t.id LIKE ? OR c.name LIKE ?"
		: ""

	const totalRow = keyword
		? await db
				.prepare(
					`SELECT COUNT(1) as count
           FROM tenants t
           LEFT JOIN companies c ON c.tenant_id = t.id
           ${whereSql}`,
				)
				.bind(keywordLike, keywordLike, keywordLike)
				.first()
		: await db.prepare("SELECT COUNT(1) as count FROM tenants").first()

	const list = await db
		.prepare(
			`SELECT t.id, t.name, t.status, t.created_at, t.updated_at,
              c.id as company_id, c.name as company_name
       FROM tenants t
       LEFT JOIN companies c ON c.tenant_id = t.id
       ${whereSql}
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`,
		)
		.bind(...(keyword ? [keywordLike, keywordLike, keywordLike] : []), pageSize, offset)
		.all()

	const items = (list.results || []).map((row: any) => ({
		id: row.id,
		name: row.name,
		status: row.status,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		company: row.company_id
			? {
					id: row.company_id,
					name: row.company_name,
				}
			: null,
	}))

	return ok(c, {
		items,
		page,
		pageSize,
		keyword,
		total: Number(totalRow?.count || 0),
	})
})

app.post("/tenants/:tenantId/users", async (c) => {
	const auth = await requireSuperAdmin(c)
	if (auth.error) return auth.error

	const tenantId = c.req.param("tenantId")
	const { email, password, role } = await c.req.json()
	if (!email || !password || !role) {
		return fail(c, 4001, "请填写邮箱、密码和角色", 400)
	}
	if (!TENANT_ROLES.includes(role)) {
		return fail(c, 4001, "角色不合法", 400)
	}

	const db = c.env.DB
	const tenant = await db
		.prepare("SELECT id FROM tenants WHERE id = ?")
		.bind(tenantId)
		.first()
	if (!tenant) return fail(c, 4004, "租户不存在", 404)

	const existed = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first()
	if (existed) return fail(c, 4090, "邮箱已存在", 409)

	const now = new Date().toISOString()
	const userId = generateId()
	const passwordHash = await hashPassword(password, c.env.PASSWORD_PEPPER ?? "")

	await db
		.prepare(
			"INSERT INTO users (id, tenant_id, email, password_hash, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
		)
		.bind(userId, tenantId, email, passwordHash, role, "active", now, now)
		.run()

	return ok(c, {
		id: userId,
		tenantId,
		email,
		role,
		status: "active",
		createdAt: now,
		updatedAt: now,
	})
})

app.get("/tenants/:tenantId/users", async (c) => {
	const auth = await requireSuperAdmin(c)
	if (auth.error) return auth.error

	const tenantId = c.req.param("tenantId")
	const db = c.env.DB
	const users = await db
		.prepare(
			"SELECT id, email, role, status, created_at, updated_at FROM users WHERE tenant_id = ? ORDER BY created_at DESC",
		)
		.bind(tenantId)
		.all()

	return ok(
		c,
		(users.results || []).map((u: any) => ({
			id: u.id,
			email: u.email,
			role: u.role,
			status: u.status,
			createdAt: u.created_at,
			updatedAt: u.updated_at,
		})),
	)
})

app.put("/tenants/:tenantId/users/:userId/status", async (c) => {
	const auth = await requireSuperAdmin(c)
	if (auth.error) return auth.error

	const tenantId = c.req.param("tenantId")
	const userId = c.req.param("userId")
	const { status } = await c.req.json()
	if (!status || !TENANT_USER_STATUSES.includes(status)) {
		return fail(c, 4001, "状态不合法", 400)
	}

	const db = c.env.DB
	const target = await db
		.prepare("SELECT id, tenant_id, role FROM users WHERE id = ? AND tenant_id = ?")
		.bind(userId, tenantId)
		.first()
	if (!target) return fail(c, 4004, "租户账号不存在", 404)

	await db
		.prepare("UPDATE users SET status = ?, updated_at = ? WHERE id = ? AND tenant_id = ?")
		.bind(status, new Date().toISOString(), userId, tenantId)
		.run()

	const user = await db
		.prepare(
			"SELECT id, tenant_id, email, role, status, created_at, updated_at FROM users WHERE id = ? AND tenant_id = ?",
		)
		.bind(userId, tenantId)
		.first()

	return ok(c, {
		id: user?.id,
		tenantId: user?.tenant_id,
		email: user?.email,
		role: user?.role,
		status: user?.status,
		createdAt: user?.created_at,
		updatedAt: user?.updated_at,
	})
})

app.put("/tenants/:tenantId/users/:userId/password", async (c) => {
	const auth = await requireSuperAdmin(c)
	if (auth.error) return auth.error

	const tenantId = c.req.param("tenantId")
	const userId = c.req.param("userId")
	const { newPassword } = await c.req.json()
	if (!newPassword || String(newPassword).length < 6) {
		return fail(c, 4001, "新密码长度至少6位", 400)
	}

	const db = c.env.DB
	const target = await db
		.prepare("SELECT id FROM users WHERE id = ? AND tenant_id = ?")
		.bind(userId, tenantId)
		.first()
	if (!target) return fail(c, 4004, "租户账号不存在", 404)

	const hash = await hashPassword(String(newPassword), c.env.PASSWORD_PEPPER ?? "")
	await db
		.prepare(
			"UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ? AND tenant_id = ?",
		)
		.bind(hash, new Date().toISOString(), userId, tenantId)
		.run()

	return ok(c, { id: userId, tenantId })
})

app.get("/tenants/:tenantId", async (c) => {
	const auth = await requireSuperAdmin(c)
	if (auth.error) return auth.error

	const tenantId = c.req.param("tenantId")
	const db = c.env.DB

	const tenant = await db
		.prepare("SELECT id, name, status, created_at, updated_at FROM tenants WHERE id = ?")
		.bind(tenantId)
		.first()
	if (!tenant) return fail(c, 4004, "租户不存在", 404)

	const company = await db
		.prepare(
			"SELECT id, tenant_id, name, logo_url, intro, contact_phone, contact_wechat, contact_address, status, created_at, updated_at FROM companies WHERE tenant_id = ?",
		)
		.bind(tenantId)
		.first()

	const users = await db
		.prepare(
			"SELECT id, email, role, status, created_at, updated_at FROM users WHERE tenant_id = ? ORDER BY created_at DESC",
		)
		.bind(tenantId)
		.all()

	return ok(c, {
		tenant: {
			id: tenant.id,
			name: tenant.name,
			status: tenant.status,
			createdAt: tenant.created_at,
			updatedAt: tenant.updated_at,
		},
		company: company
			? {
					id: company.id,
					tenantId: company.tenant_id,
					name: company.name,
					logoUrl: company.logo_url,
					intro: company.intro,
					contactPhone: company.contact_phone,
					contactWechat: company.contact_wechat,
					contactAddress: company.contact_address,
					status: company.status,
					createdAt: company.created_at,
					updatedAt: company.updated_at,
				}
			: null,
		users: (users.results || []).map((u: any) => ({
			id: u.id,
			email: u.email,
			role: u.role,
			status: u.status,
			createdAt: u.created_at,
			updatedAt: u.updated_at,
		})),
	})
})

export default app
