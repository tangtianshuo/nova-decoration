import type { ApiResponse } from "@/types"
import { useAuthStore } from "@/store/auth"

const API_BASE = import.meta.env.VITE_API_BASE || "/api"

async function request<T>(
	path: string,
	options?: RequestInit,
): Promise<ApiResponse<T>> {
	const token = useAuthStore.getState().token
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		...(options?.headers as Record<string, string>),
	}
	if (token) {
		headers["Authorization"] = `Bearer ${token}`
	}
	const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
	const envelope = (await res
		.json()
		.catch(() => ({
			code: -1,
			message: "Network error",
			data: null,
		}))) as ApiResponse<T>

	if (res.status === 401 || envelope.code === 4003) {
		useAuthStore.getState().logout()
	}
	if (!res.ok || envelope.code !== 0) {
		throw new Error(envelope.message || `HTTP ${res.status}`)
	}
	return envelope
}

export const api = {
	get: <T>(path: string) => request<T>(path),
	post: <T>(path: string, body?: unknown) =>
		request<T>(path, {
			method: "POST",
			body: body ? JSON.stringify(body) : undefined,
		}),
	put: <T>(path: string, body?: unknown) =>
		request<T>(path, {
			method: "PUT",
			body: body ? JSON.stringify(body) : undefined,
		}),
	delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
}
