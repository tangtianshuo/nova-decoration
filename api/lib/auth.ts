export type AuthUser = {
	userId: string
	role: string
	tenantId?: string
	companyId?: string
	iat?: number
	exp?: number
}

const textEncoder = new TextEncoder()

function toBase64Url(input: ArrayBuffer | string): string {
	const raw =
		typeof input === "string"
			? btoa(input)
			: btoa(String.fromCharCode(...new Uint8Array(input)))
	return raw.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function fromBase64Url(input: string): string {
	const base64 = input.replace(/-/g, "+").replace(/_/g, "/")
	const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4)
	return atob(padded)
}

export async function hashPassword(
	password: string,
	pepper = "",
): Promise<string> {
	const data = textEncoder.encode(password + pepper)
	const hash = await crypto.subtle.digest("SHA-256", data)
	return Array.from(new Uint8Array(hash))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("")
}

export async function signJWT(
	payload: Record<string, unknown>,
	secret: string,
): Promise<string> {
	const now = Math.floor(Date.now() / 1000)
	const header = { alg: "HS256", typ: "JWT" }
	const fullPayload = { ...payload, iat: now, exp: now + 86400 * 7 }
	const encodedHeader = toBase64Url(JSON.stringify(header))
	const encodedPayload = toBase64Url(JSON.stringify(fullPayload))
	const message = `${encodedHeader}.${encodedPayload}`

	const key = await crypto.subtle.importKey(
		"raw",
		textEncoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	)
	const signature = await crypto.subtle.sign(
		"HMAC",
		key,
		textEncoder.encode(message),
	)
	return `${message}.${toBase64Url(signature)}`
}

export async function verifyJWT(
	token: string,
	secret: string,
): Promise<AuthUser | null> {
	try {
		const [encodedHeader, encodedPayload, encodedSignature] = token.split(".")
		if (!encodedHeader || !encodedPayload || !encodedSignature) return null

		const message = `${encodedHeader}.${encodedPayload}`
		const key = await crypto.subtle.importKey(
			"raw",
			textEncoder.encode(secret),
			{ name: "HMAC", hash: "SHA-256" },
			false,
			["verify"],
		)

		const signatureBytes = Uint8Array.from(
			fromBase64Url(encodedSignature),
			(c) => c.charCodeAt(0),
		)
		const isValid = await crypto.subtle.verify(
			"HMAC",
			key,
			signatureBytes,
			textEncoder.encode(message),
		)
		if (!isValid) return null

		const payload = JSON.parse(fromBase64Url(encodedPayload)) as AuthUser
		if (!payload.userId || !payload.role) return null
		if (
			payload.role !== "super_admin" &&
			!payload.tenantId &&
			!payload.companyId
		) {
			return null
		}
		if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null
		const normalizedTenantId = payload.tenantId || payload.companyId
		return {
			...payload,
			tenantId: normalizedTenantId,
			companyId: normalizedTenantId,
		}
	} catch {
		return null
	}
}

export async function getAuthUser(c: any): Promise<AuthUser | null> {
	const authHeader = c.req.header("Authorization")
	if (!authHeader?.startsWith("Bearer ")) return null
	const token = authHeader.slice(7)
	return verifyJWT(token, c.env.JWT_SECRET)
}
