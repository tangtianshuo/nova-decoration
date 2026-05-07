import { expect, test } from "@playwright/test"

test.describe("P0 REDIRECT + FALLBACK", () => {
	test("REDIRECT-001 有效短链跳转到展示页", async ({ page }) => {
		await page.goto("/q/AB12CD")
		await expect(page).toHaveURL(/\/s\/708192a3-1b2c-403b-8c4d-6e7f8091a2b3$/)
		await expect(
			page.getByRole("heading", { name: "现代简约客厅案例" }),
		).toBeVisible()
	})

	test("REDIRECT-002 不存在短链进入 notfound 兜底页", async ({ page }) => {
		await page.goto("/q/NOT999")
		await expect(page).toHaveURL(/\/fallback$/)
		await expect(page.getByRole("heading", { name: "链接不存在" })).toBeVisible()
	})

	test("REDIRECT-003 停用短链进入 disabled 兜底页", async ({ page }) => {
		await page.goto("/q/DSB123")
		await expect(page).toHaveURL(/\/fallback\?code=DSB123&reason=disabled/)
		await expect(page.getByRole("heading", { name: "链接已停用" })).toBeVisible()
	})

	test("REDIRECT-004 过期短链进入 expired 兜底页", async ({ page }) => {
		await page.goto("/q/EXP123")
		await expect(page).toHaveURL(/\/fallback\?code=EXP123&reason=expired/)
		await expect(page.getByRole("heading", { name: "链接已过期" })).toBeVisible()
	})

	test("FALLBACK-001/002/003 兜底页按 reason 展示文案", async ({ page }) => {
		await page.goto("/fallback?code=MANUAL1&reason=notfound")
		await expect(page.getByRole("heading", { name: "链接不存在" })).toBeVisible()

		await page.goto("/fallback?code=MANUAL2&reason=disabled")
		await expect(page.getByRole("heading", { name: "链接已停用" })).toBeVisible()

		await page.goto("/fallback?code=MANUAL3&reason=expired")
		await expect(page.getByRole("heading", { name: "链接已过期" })).toBeVisible()
	})
})
