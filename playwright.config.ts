import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: [["list"], ["html", { open: "never" }]],
	use: {
		baseURL: "http://127.0.0.1:5173",
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		video: "retain-on-failure",
	},
	webServer: [
		{
			command: "pnpm dev --host 127.0.0.1 --port 5173 --mode e2e",
			url: "http://127.0.0.1:5173",
			reuseExistingServer: !process.env.CI,
			timeout: 60 * 1000,
		},
		{
			command: "pnpm dev:api --ip 127.0.0.1 --port 8787",
			url: "http://127.0.0.1:8787/api/health",
			reuseExistingServer: !process.env.CI,
			timeout: 60 * 1000,
		},
	],
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
})
