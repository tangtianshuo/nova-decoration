import { expect, request, test } from "@playwright/test"

const validEmail = "admin@nova.local"
const validPassword = "12345678"

test.describe("P0 AUTH + DASH", () => {
	test("AUTH-005 未登录访问后台页会跳转登录页", async ({ page }) => {
		await page.goto("/dashboard")
		await expect(page).toHaveURL(/\/login$/)
		await expect(
			page.getByRole("heading", { name: "Nova 装饰展示平台" }),
		).toBeVisible()
	})

	test("AUTH-001 登录成功并进入仪表盘（DASH-001）", async ({ page }) => {
		await page.goto("/login")
		await page.getByPlaceholder("admin@company.com").fill(validEmail)
		await page.getByPlaceholder("请输入密码").fill(validPassword)
		await page.getByRole("button", { name: "登录" }).click()

		await expect(page).toHaveURL(/\/dashboard$/)
		await expect(page.getByRole("heading", { name: /欢迎回来/ })).toBeVisible()
	})

	test("AUTH-006 已登录用户可退出登录", async ({ page }) => {
		await page.goto("/login")
		await page.getByPlaceholder("admin@company.com").fill(validEmail)
		await page.getByPlaceholder("请输入密码").fill(validPassword)
		await page.getByRole("button", { name: "登录" }).click()
		await expect(page).toHaveURL(/\/dashboard$/)

		await page.getByRole("button", { name: "退出登录" }).click()
		await expect(page).toHaveURL(/\/login$/)
	})

	test("AUTH-002 错误密码登录返回 401", async () => {
		const api = await request.newContext({
			baseURL: "http://127.0.0.1:8787",
		})
		const resp = await api.post("/api/auth/login", {
			data: {
				email: validEmail,
				password: "wrong-password",
			},
		})
		expect(resp.status()).toBe(401)

		const body = await resp.json()
		expect(body?.code).toBe(4003)
		expect(body?.message).toContain("邮箱或密码错误")
		await api.dispose()
	})
})
