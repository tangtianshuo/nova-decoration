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
				userId: "u_1",
				companyId: "cp_1",
				role: "admin",
			},
			secret,
		)
		const payload = await verifyJWT(token, secret)
		expect(payload).toBeTruthy()
		expect(payload?.userId).toBe("u_1")
		expect(payload?.companyId).toBe("cp_1")
		expect(payload?.role).toBe("admin")
	})

	it("verifyJWT should fail with wrong secret", async () => {
		const token = await signJWT(
			{
				userId: "u_1",
				companyId: "cp_1",
				role: "admin",
			},
			"secret-a",
		)
		const payload = await verifyJWT(token, "secret-b")
		expect(payload).toBeNull()
	})
})
