import type { AuthUser } from "./auth"
import { fail } from "./response"

const ROLE_ALIASES: Record<string, string> = {
	editor: "tenant_editor",
	viewer: "tenant_viewer",
}

function normalizeRole(role: string | undefined): string {
	if (!role) return ""
	return ROLE_ALIASES[role] || role
}

export function hasAnyRole(user: AuthUser, allowed: string[]): boolean {
	const role = normalizeRole(user.role)
	return allowed.includes(role)
}

export function requireRole(c: any, user: AuthUser, allowed: string[]) {
	if (user.role === "super_admin") return null
	if (!hasAnyRole(user, allowed)) {
		return fail(c, 4003, "权限不足", 403)
	}
	return null
}

export function requireTenantScope(c: any, user: AuthUser) {
	if (!user.tenantId) {
		return fail(c, 4003, "无租户权限", 403)
	}
	return null
}
