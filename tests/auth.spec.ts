import { describe, expect, it } from "vitest"
import { hashPassword, signJWT, verifyJWT } from "../api/lib/auth"

describe("auth lib", () => {
	it("hashPassword should be deterministic", async () => {
		const secret = "test-secret"
		const value1 = await hashPassword("123456", secret)
		const value2 = await hashPassword("123456", secret)
		const value3 = await hashPassword("1234567", secret)
		expect(value1).toBe(value2)
		expect(value1).not.toBe(value3)
	})

	it("signJWT + verifyJWT should round-trip payload", async () => {
		const secret = "test-secret"
		const token = await signJWT(
			{
				userId: "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e",
				tenantId: "0f1e2d3c-4b5a-4768-8a9b-0c1d2e3f4a5b",
				role: "admin",
			},
			secret,
		)
		const payload = await verifyJWT(token, secret)
		expect(payload).toBeTruthy()
		expect(payload?.userId).toBe("2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e")
		expect(payload?.tenantId).toBe("0f1e2d3c-4b5a-4768-8a9b-0c1d2e3f4a5b")
		expect(payload?.role).toBe("admin")
	})

	it("verifyJWT should fail with wrong secret", async () => {
		const token = await signJWT(
			{
				userId: "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e",
				tenantId: "0f1e2d3c-4b5a-4768-8a9b-0c1d2e3f4a5b",
				role: "admin",
			},
			"secret-a",
		)
		const payload = await verifyJWT(token, "secret-b")
		expect(payload).toBeNull()
	})
})
