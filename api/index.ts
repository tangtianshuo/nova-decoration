import { Hono } from "hono"
import { cors } from "hono/cors"
import authRoutes from "./routes/auth"
import companyRoutes from "./routes/company"
import assetRoutes from "./routes/assets"
import pageRoutes from "./routes/pages"
import shareLinkRoutes from "./routes/share-links"
import publicRoutes from "./routes/public"
import eventRoutes from "./routes/events"
import { redirectByCode } from "./routes/short-redirect"
import { fail, ok } from "./lib/response"

type Bindings = {
	DB: D1Database
	BUCKET: R2Bucket
	JWT_SECRET: string
	DEFAULT_FALLBACK_URL: string
	APP_WEB_URL: string
	QRCODE_BASE_URL: string
}

const app = new Hono<{ Bindings: Bindings; Variables: { requestId: string } }>()

app.use("*", async (c, next) => {
	const requestId = crypto.randomUUID()
	c.set("requestId", requestId)
	c.header("x-request-id", requestId)
	await next()
})

app.use(
	"*",
	cors({
		origin: ["http://localhost:5173", "http://localhost:3000"],
		allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		maxAge: 86400,
	}),
)

app.route("/api/auth", authRoutes)
app.route("/api/company", companyRoutes)
app.route("/api/upload", assetRoutes)
app.route("/api/assets", assetRoutes)
app.route("/api/pages", pageRoutes)
app.route("/api/share-links", shareLinkRoutes)
app.route("/api/public", publicRoutes)
app.route("/api/events", eventRoutes)

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
