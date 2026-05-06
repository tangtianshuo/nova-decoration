import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { useAuthStore } from "@/store/auth"

type TenantListItem = {
	id: string
	name: string
	status: string
	createdAt: string
	updatedAt: string
	company: { id: string; name: string } | null
}

type TenantListResponse = {
	items: TenantListItem[]
	page: number
	pageSize: number
	total: number
	keyword: string
}

type TenantDetail = {
	tenant: {
		id: string
		name: string
		status: string
		createdAt: string
		updatedAt: string
	}
	company: {
		id: string
		tenantId: string
		name: string
		logoUrl: string
		intro: string
		contactPhone: string
		contactWechat: string
		contactAddress: string
		status: string
		createdAt: string
		updatedAt: string
	} | null
	users: Array<{
		id: string
		email: string
		role: string
		status: string
		createdAt: string
		updatedAt: string
	}>
}

export default function PlatformTenants() {
	const { user } = useAuthStore()
	const isSuperAdmin = user?.role === "super_admin"
	const [loading, setLoading] = useState(false)
	const [userCreating, setUserCreating] = useState(false)
	const [creating, setCreating] = useState(false)
	const [tenants, setTenants] = useState<TenantListItem[]>([])
	const [keywordInput, setKeywordInput] = useState("")
	const [keyword, setKeyword] = useState("")
	const [page, setPage] = useState(1)
	const [pageSize, setPageSize] = useState(8)
	const [total, setTotal] = useState(0)
	const [gotoPageInput, setGotoPageInput] = useState("")
	const [selectedTenantId, setSelectedTenantId] = useState<string>("")
	const [detail, setDetail] = useState<TenantDetail | null>(null)
	const [form, setForm] = useState({
		tenantName: "",
		companyName: "",
		adminEmail: "",
		adminPassword: "",
	})
	const [userForm, setUserForm] = useState({
		email: "",
		password: "",
		role: "tenant_editor",
	})

	const selectedTenant = useMemo(
		() => tenants.find((t) => t.id === selectedTenantId) || null,
		[selectedTenantId, tenants],
	)

	async function loadTenants() {
		if (!isSuperAdmin) return
		setLoading(true)
		try {
			const query = new URLSearchParams({
				page: String(page),
				pageSize: String(pageSize),
			})
			if (keyword.trim()) query.set("keyword", keyword.trim())
			const resp = await api.get<TenantListResponse>(`/platform/tenants?${query.toString()}`)
			setTenants(resp.data.items || [])
			setTotal(resp.data.total || 0)
			if (!selectedTenantId && resp.data.items?.length) {
				setSelectedTenantId(resp.data.items[0].id)
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "租户列表加载失败")
		} finally {
			setLoading(false)
		}
	}

	async function handleCreateTenantUser(e: React.FormEvent) {
		e.preventDefault()
		if (!selectedTenantId) {
			toast.error("请先选择租户")
			return
		}
		if (!userForm.email || !userForm.password) {
			toast.error("请填写账号邮箱和密码")
			return
		}
		setUserCreating(true)
		try {
			await api.post(`/platform/tenants/${selectedTenantId}/users`, {
				email: userForm.email.trim(),
				password: userForm.password,
				role: userForm.role,
			})
			toast.success("租户账号创建成功")
			setUserForm({ email: "", password: "", role: "tenant_editor" })
			await loadTenantDetail(selectedTenantId)
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "租户账号创建失败")
		} finally {
			setUserCreating(false)
		}
	}

	async function handleToggleUserStatus(userId: string, status: string) {
		if (!selectedTenantId) return
		const nextStatus = status === "active" ? "disabled" : "active"
		try {
			await api.put(`/platform/tenants/${selectedTenantId}/users/${userId}/status`, {
				status: nextStatus,
			})
			toast.success(nextStatus === "active" ? "账号已启用" : "账号已停用")
			await loadTenantDetail(selectedTenantId)
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "账号状态更新失败")
		}
	}

	async function handleResetPassword(userId: string, email: string) {
		if (!selectedTenantId) return
		const newPassword = window.prompt(`请输入账号 ${email} 的新密码（至少6位）`)
		if (!newPassword) return
		try {
			await api.put(`/platform/tenants/${selectedTenantId}/users/${userId}/password`, {
				newPassword,
			})
			toast.success("密码重置成功")
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "密码重置失败")
		}
	}

	async function loadTenantDetail(tenantId: string) {
		if (!tenantId || !isSuperAdmin) return
		try {
			const resp = await api.get<TenantDetail>(`/platform/tenants/${tenantId}`)
			setDetail(resp.data)
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "租户详情加载失败")
			setDetail(null)
		}
	}

	async function handleCreateTenant(e: React.FormEvent) {
		e.preventDefault()
		if (!form.tenantName || !form.adminEmail || !form.adminPassword) {
			toast.error("请填写租户名、管理员邮箱、管理员密码")
			return
		}
		setCreating(true)
		try {
			await api.post("/platform/tenants", {
				tenantName: form.tenantName.trim(),
				companyName: form.companyName.trim() || form.tenantName.trim(),
				adminEmail: form.adminEmail.trim(),
				adminPassword: form.adminPassword,
			})
			toast.success("租户创建成功")
			setForm({ tenantName: "", companyName: "", adminEmail: "", adminPassword: "" })
			await loadTenants()
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "租户创建失败")
		} finally {
			setCreating(false)
		}
	}

	useEffect(() => {
		loadTenants()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isSuperAdmin, page, keyword, pageSize])

	useEffect(() => {
		if (selectedTenantId) {
			loadTenantDetail(selectedTenantId)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedTenantId])

	if (!isSuperAdmin) {
		return (
			<div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-600">
				当前账号不是超级管理员，无权访问租户管理。
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-gray-900">租户管理</h1>
				<p className="text-gray-500 mt-1">新增租户并初始化租户管理员账号；支持租户基础信息查询（只读）。</p>
			</div>

			<div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
				<div className="xl:col-span-1 bg-white rounded-xl border border-gray-200 p-5">
					<h2 className="text-lg font-semibold text-gray-900 mb-4">新增租户</h2>
					<form className="space-y-3" onSubmit={handleCreateTenant}>
						<input
							className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
							placeholder="租户名称（必填）"
							value={form.tenantName}
							onChange={(e) => setForm((s) => ({ ...s, tenantName: e.target.value }))}
						/>
						<input
							className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
							placeholder="公司名称（可选，默认同租户名）"
							value={form.companyName}
							onChange={(e) => setForm((s) => ({ ...s, companyName: e.target.value }))}
						/>
						<input
							type="email"
							className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
							placeholder="管理员邮箱（必填）"
							value={form.adminEmail}
							onChange={(e) => setForm((s) => ({ ...s, adminEmail: e.target.value }))}
						/>
						<input
							type="password"
							className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
							placeholder="管理员密码（必填）"
							value={form.adminPassword}
							onChange={(e) =>
								setForm((s) => ({ ...s, adminPassword: e.target.value }))
							}
						/>
						<button
							type="submit"
							disabled={creating}
							className="w-full bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
						>
							{creating ? "创建中..." : "创建租户"}
						</button>
					</form>
				</div>

				<div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 p-5 space-y-4">
					<div className="flex items-center justify-between">
						<h2 className="text-lg font-semibold text-gray-900">租户列表</h2>
						<div className="flex items-center gap-2">
							<input
								className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-44"
								placeholder="搜索租户名/ID"
								value={keywordInput}
								onChange={(e) => setKeywordInput(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										setPage(1)
										setKeyword(keywordInput.trim())
									}
								}}
							/>
							<button
								onClick={() => {
									setPage(1)
									setKeyword(keywordInput.trim())
								}}
								className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50"
							>
								查询
							</button>
							<button
								onClick={loadTenants}
								disabled={loading}
								className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-60"
							>
								{loading ? "刷新中..." : "刷新"}
							</button>
							<select
								className="text-sm border border-gray-300 rounded-lg px-2 py-1.5"
								value={pageSize}
								onChange={(e) => {
									setPage(1)
									setPageSize(Number(e.target.value))
								}}
							>
								<option value={8}>8/页</option>
								<option value={12}>12/页</option>
								<option value={20}>20/页</option>
							</select>
						</div>
					</div>

					{tenants.length === 0 ? (
						<p className="text-sm text-gray-500">暂无租户</p>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
							{tenants.map((tenant) => (
								<button
									key={tenant.id}
									onClick={() => setSelectedTenantId(tenant.id)}
									className={`text-left border rounded-lg p-3 ${
										tenant.id === selectedTenantId
											? "border-indigo-500 bg-indigo-50"
											: "border-gray-200 hover:bg-gray-50"
									}`}
								>
									<div className="font-medium text-gray-900">{tenant.name}</div>
									<div className="text-xs text-gray-500 mt-1">ID: {tenant.id}</div>
									<div className="text-xs text-gray-500 mt-1">
										公司: {tenant.company?.name || "-"}
									</div>
								</button>
							))}
						</div>
					)}
					<div className="flex items-center justify-between text-xs text-gray-500 pt-1">
						<div>
							总计 {total} 条，当前第 {page} 页
						</div>
						<div className="flex items-center gap-2">
							<button
								className="px-2 py-1 border border-gray-300 rounded disabled:opacity-50"
								disabled={page <= 1}
								onClick={() => setPage((p) => Math.max(1, p - 1))}
							>
								上一页
							</button>
							<button
								className="px-2 py-1 border border-gray-300 rounded disabled:opacity-50"
								disabled={page * pageSize >= total}
								onClick={() => setPage((p) => p + 1)}
							>
								下一页
							</button>
							<input
								className="w-14 border border-gray-300 rounded px-1.5 py-1"
								placeholder="页码"
								value={gotoPageInput}
								onChange={(e) => setGotoPageInput(e.target.value)}
							/>
							<button
								className="px-2 py-1 border border-gray-300 rounded"
								onClick={() => {
									const target = Number(gotoPageInput)
									if (!Number.isFinite(target) || target < 1) return
									const maxPage = Math.max(1, Math.ceil(total / pageSize))
									setPage(Math.min(Math.floor(target), maxPage))
								}}
							>
								跳转
							</button>
						</div>
					</div>

					<div className="pt-3 border-t border-gray-200">
						<h3 className="font-semibold text-gray-900 mb-2">租户详情</h3>
						{!selectedTenant ? (
							<p className="text-sm text-gray-500">请选择一个租户</p>
						) : !detail ? (
							<p className="text-sm text-gray-500">加载中...</p>
						) : (
							<div className="space-y-3 text-sm text-gray-700">
								<div>租户：{detail.tenant.name}</div>
								<div>状态：{detail.tenant.status}</div>
								<div>公司：{detail.company?.name || "-"}</div>
								<div>管理员与账号数：{detail.users.length}</div>
								<div className="bg-gray-50 rounded-lg p-3">
									<div className="font-medium text-gray-900 mb-2">租户账号</div>
									<div className="space-y-2">
										{detail.users.map((u) => (
											<div
												key={u.id}
												className="text-xs text-gray-600 flex items-center justify-between gap-2"
											>
												<span>
													{u.email} / {u.role} / {u.status}
												</span>
												<div className="flex items-center gap-2">
													<button
														className="px-2 py-1 border border-gray-300 rounded hover:bg-white"
														onClick={() => handleResetPassword(u.id, u.email)}
													>
														重置密码
													</button>
													<button
														className="px-2 py-1 border border-gray-300 rounded hover:bg-white"
														onClick={() => handleToggleUserStatus(u.id, u.status)}
													>
														{u.status === "active" ? "停用" : "启用"}
													</button>
												</div>
											</div>
										))}
									</div>
								</div>
								<form className="bg-gray-50 rounded-lg p-3 space-y-2" onSubmit={handleCreateTenantUser}>
									<div className="font-medium text-gray-900">新增租户账号</div>
									<div className="grid grid-cols-1 md:grid-cols-3 gap-2">
										<input
											type="email"
											className="border border-gray-300 rounded px-2 py-1.5 text-xs"
											placeholder="邮箱"
											value={userForm.email}
											onChange={(e) =>
												setUserForm((s) => ({ ...s, email: e.target.value }))
											}
										/>
										<input
											type="password"
											className="border border-gray-300 rounded px-2 py-1.5 text-xs"
											placeholder="密码"
											value={userForm.password}
											onChange={(e) =>
												setUserForm((s) => ({ ...s, password: e.target.value }))
											}
										/>
										<select
											className="border border-gray-300 rounded px-2 py-1.5 text-xs"
											value={userForm.role}
											onChange={(e) =>
												setUserForm((s) => ({ ...s, role: e.target.value }))
											}
										>
											<option value="tenant_admin">tenant_admin</option>
											<option value="tenant_editor">tenant_editor</option>
											<option value="tenant_viewer">tenant_viewer</option>
										</select>
									</div>
									<div className="flex justify-end">
										<button
											type="submit"
											disabled={userCreating}
											className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700 disabled:opacity-60"
										>
											{userCreating ? "创建中..." : "新增账号"}
										</button>
									</div>
								</form>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}
