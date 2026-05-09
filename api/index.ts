import { Hono } from "hono"
import { cors } from "hono/cors"
import authRoutes from "./routes/auth"
import companyRoutes from "./routes/company"
import assetRoutes from "./routes/assets"
import pageRoutes from "./routes/pages"
import shareLinkRoutes from "./routes/share-links"
import publicRoutes from "./routes/public"
import eventRoutes from "./routes/events"
import platformRoutes from "./routes/platform"
import billingRoutes from "./routes/billing"
import quotaRoutes from "./routes/quotas"
import opsRoutes from "./routes/ops"
import { redirectByCode } from "./routes/short-redirect"
import { fail, ok } from "./lib/response"

type Bindings = {
	DB: D1Database
	BUCKET: R2Bucket
	JWT_SECRET: string
	PASSWORD_PEPPER?: string
	DEFAULT_FALLBACK_URL: string
	APP_WEB_URL: string
	QRCODE_BASE_URL: string
	DEV_UPLOAD_LOCAL?: string
	LOCAL_UPLOAD_DIR?: string
	BILLING_WEBHOOK_SECRET?: string
}

const app = new Hono<{ Bindings: Bindings; Variables: { requestId: string } }>()
const rateLimitBucket = new Map<string, { count: number; resetAt: number }>()

function hitRateLimit(key: string, limit: number, windowMs: number): boolean {
	const now = Date.now()
	const current = rateLimitBucket.get(key)
	if (!current || now > current.resetAt) {
		rateLimitBucket.set(key, { count: 1, resetAt: now + windowMs })
		return false
	}
	current.count += 1
	return current.count > limit
}

app.use("*", async (c, next) => {
	const requestId = crypto.randomUUID()
	c.set("requestId", requestId)
	c.header("x-request-id", requestId)
	await next()
})

app.use(
	"*",
	cors({
		origin: [
			"http://localhost:5173",
			"http://localhost:3000",
			"http://decoration.novai.net.cn",
			"https://decoration.novai.net.cn",
		],
		allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		maxAge: 86400,
	}),
)

app.use("*", async (c, next) => {
	const path = c.req.path
	const ip =
		c.req.header("CF-Connecting-IP") || c.req.header("x-forwarded-for") || "unknown"
	const isSensitive =
		path.startsWith("/api/auth/login") ||
		path.startsWith("/api/upload") ||
		path.startsWith("/api/billing/webhooks")
	if (isSensitive && hitRateLimit(`${ip}:${path}`, 120, 60 * 1000)) {
		return fail(c, 4290, "请求过于频繁，请稍后再试", 429)
	}
	await next()
})

app.route("/api/auth", authRoutes)
app.route("/api/company", companyRoutes)
app.route("/api/upload", assetRoutes)
app.route("/api/assets", assetRoutes)
app.route("/api/pages", pageRoutes)
app.route("/api/share-links", shareLinkRoutes)
app.route("/api/public", publicRoutes)
app.route("/api/events", eventRoutes)
app.route("/api/platform", platformRoutes)
app.route("/api/billing", billingRoutes)
app.route("/api/quotas", quotaRoutes)
app.route("/api/ops", opsRoutes)

app.get("/q/:code", redirectByCode)

app.get("/api/health", (c) =>
	ok(c, {
		status: "healthy",
		time: new Date().toISOString(),
		requestId: c.get("requestId"),
	}),
)

app.notFound((c) => fail(c, 4004, "接口不存在", 404))

app.onError((err, c) => {
	console.error("[api_error]", {
		requestId: c.get("requestId"),
		path: c.req.path,
		method: c.req.method,
		message: err.message,
		stack: err.stack,
	})
	return fail(c, 5000, "系统异常", 500)
})

export default app
