import { Hono } from "hono"
import { hashPassword, signJWT } from "../lib/auth"
import { fail, ok } from "../lib/response"

type Bindings = {
	DB: D1Database
	JWT_SECRET: string
}

const app = new Hono<{ Bindings: Bindings }>()

function generateId(): string {
	return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

app.post("/login", async (c) => {
	const { email, password } = await c.req.json()
	if (!email || !password) {
		return fail(c, 4001, "请输入邮箱和密码", 400)
	}

	const db = c.env.DB
	const user = await db
		.prepare(
			"SELECT id, company_id, email, role, status, password_hash FROM users WHERE email = ? AND status = ?",
		)
		.bind(email, "active")
		.first()

	if (!user) {
		return fail(c, 4003, "邮箱或密码错误", 401)
	}

	const hash = await hashPassword(password, c.env.JWT_SECRET)
	if (hash !== user.password_hash) {
		return fail(c, 4003, "邮箱或密码错误", 401)
	}

	const company = await db
		.prepare(
			"SELECT id, name, logo_url, intro, contact_phone, contact_wechat, contact_address, status FROM companies WHERE id = ?",
		)
		.bind(user.company_id)
		.first()

	const token = await signJWT(
		{ userId: user.id, companyId: user.company_id, role: user.role },
		c.env.JWT_SECRET,
	)

	return ok(c, {
		token,
		user: {
			id: user.id,
			companyId: user.company_id,
			email: user.email,
			role: user.role,
			status: user.status,
		},
		company: company
			? {
					id: company.id,
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

	const companyId = `cp_${generateId()}`
	const userId = `u_${generateId()}`
	const now = new Date().toISOString()
	const hash = await hashPassword(password, c.env.JWT_SECRET)

	await db.batch([
		db
			.prepare(
				"INSERT INTO companies (id, name, logo_url, intro, contact_phone, contact_wechat, contact_address, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
			)
			.bind(companyId, companyName, "", "", "", "", "", "active", now, now),
		db
			.prepare(
				"INSERT INTO users (id, company_id, email, password_hash, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
			)
			.bind(userId, companyId, email, hash, "admin", "active", now, now),
	])

	const token = await signJWT(
		{ userId, companyId, role: "admin" },
		c.env.JWT_SECRET,
	)

	return ok(c, {
		token,
		user: { id: userId, companyId, email, role: "admin", status: "active" },
		company: {
			id: companyId,
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
