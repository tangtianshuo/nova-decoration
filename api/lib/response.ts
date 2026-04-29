import type { Context } from "hono"

export type ApiEnvelope<T> = {
	code: number
	message: string
	data: T
}

export function ok<T>(c: Context, data: T, message = "ok", status = 200) {
	return c.json<ApiEnvelope<T>>({ code: 0, message, data }, status as any)
}

export function fail(
	c: Context,
	code: number,
	message: string,
	status = 400,
	data: null = null,
) {
	return c.json<ApiEnvelope<null>>({ code, message, data }, status as any)
}
