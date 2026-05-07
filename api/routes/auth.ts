import { Hono } from "hono"
import { getAuthUser, hashPassword, signJWT } from "../lib/auth"
import { fail, ok } from "../lib/response"

type Bindings = {
	DB: D1Database
	JWT_SECRET: string
	PASSWORD_PEPPER?: string
}

const app = new Hono<{ Bindings: Bindings }>()

function generateId(): string {
	return crypto.randomUUID()
}

app.get("/me", async (c) => {
	const authUser = await getAuthUser(c)
	if (!authUser) return fail(c, 4003, "未登录", 401)

	const db = c.env.DB
	const user = await db
		.prepare(
			"SELECT id, tenant_id, email, role, status FROM users WHERE id = ? AND status = ?",
		)
		.bind(authUser.userId, "active")
		.first()

	if (!user) {
		return fail(c, 4003, "用户不存在或已禁用", 401)
	}

	const company =
		user.tenant_id &&
		(await db
			.prepare(
				"SELECT id, tenant_id, name, logo_url, intro, contact_phone, contact_wechat, contact_address, status FROM companies WHERE tenant_id = ?",
			)
			.bind(user.tenant_id)
			.first())

	return ok(c, {
		user: {
			id: user.id,
			tenantId: user.tenant_id || null,
			companyId: user.tenant_id || null,
			email: user.email,
			role: user.role,
			status: user.status,
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
				}
			: null,
	})
})

app.post("/login", async (c) => {
	const { email, password } = await c.req.json()
	if (!email || !password) {
		return fail(c, 4001, "请输入邮箱和密码", 400)
	}

	const db = c.env.DB
	const user = await db
		.prepare(
			"SELECT id, tenant_id, email, role, status, password_hash FROM users WHERE email = ? AND status = ?",
		)
		.bind(email, "active")
		.first()

	if (!user) {
		return fail(c, 4003, "邮箱或密码错误", 401)
	}

	const hash = await hashPassword(password, c.env.PASSWORD_PEPPER ?? "")
	if (hash !== user.password_hash) {
		return fail(c, 4003, "邮箱或密码错误", 401)
	}

	const token = await signJWT(
		{ userId: user.id, tenantId: user.tenant_id || undefined, role: user.role },
		c.env.JWT_SECRET,
	)

	const company =
		user.tenant_id &&
		(await db
			.prepare(
				"SELECT id, tenant_id, name, logo_url, intro, contact_phone, contact_wechat, contact_address, status FROM companies WHERE tenant_id = ?",
			)
			.bind(user.tenant_id)
			.first())

	return ok(c, {
		token,
		user: {
			id: user.id,
			tenantId: user.tenant_id || null,
			companyId: user.tenant_id || null,
			email: user.email,
			role: user.role,
			status: user.status,
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
				}
			: null,
	})
})

app.post("/register", async (c) => {
	const { companyName, email, password } = await c.req.json()
	if (!companyName || !email || !password) {
		return fail(c, 4001, "请填写完整信息", 400)
	}

	const db = c.env.DB
	const existing = await db
		.prepare("SELECT id FROM users WHERE email = ?")
		.bind(email)
		.first()
	if (existing) {
		return fail(c, 4090, "该邮箱已注册", 409)
	}

	const tenantId = generateId()
	const companyId = generateId()
	const userId = generateId()
	const now = new Date().toISOString()
	const hash = await hashPassword(password, c.env.PASSWORD_PEPPER ?? "")

	await db.batch([
		db
			.prepare(
				"INSERT INTO tenants (id, name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
			)
			.bind(tenantId, companyName, "active", now, now),
		db
			.prepare(
				"INSERT INTO companies (id, tenant_id, name, logo_url, intro, contact_phone, contact_wechat, contact_address, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
			)
			.bind(
				companyId,
				tenantId,
				companyName,
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
			.bind(userId, tenantId, email, hash, "tenant_admin", "active", now, now),
	])

	const token = await signJWT(
		{ userId, tenantId, role: "tenant_admin" },
		c.env.JWT_SECRET,
	)

	return ok(c, {
		token,
		user: {
			id: userId,
			tenantId,
			companyId: tenantId,
			email,
			role: "tenant_admin",
			status: "active",
		},
		company: {
			id: companyId,
			tenantId,
			name: companyName,
			logoUrl: "",
			intro: "",
			contactPhone: "",
			contactWechat: "",
			contactAddress: "",
			status: "active",
		},
	})
})

export default app
