import { useEffect, useState } from "react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { useAuthStore } from "@/store/auth"

type TenantOption = { id: string; name: string }

type CommercialDetail = {
	subscription: {
		id: string
		tenant_id: string
		plan_code: string
		plan_name: string
		status: string
		billing_cycle: string
	} | null
	limits: {
		maxMembers: number
		maxAssets: number
		maxPages: number
		maxStorageBytes: number
		maxMonthlyUploadBytes: number
	}
	usage: {
		members: number
		assets: number
		pages: number
		storageBytes: number
		monthlyUploadedBytes: number
	}
	transactions: Array<{
		id: string
		event_type: string
		amount_cents: number
		status: string
		created_at: string
	}>
}

type OpsOverview = {
	tenantCount: number
	activeSubscriptions: number
	pastDueSubscriptions: number
	mrrCents: number
	topStorageTenants: Array<{ tenantId: string; tenantName: string; usedBytes: number }>
}

function fmtMoney(cents: number): string {
	return `¥${(Number(cents || 0) / 100).toFixed(2)}`
}

function fmtGb(bytes: number): string {
	return `${(Number(bytes || 0) / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export default function PlatformCommercial() {
	const { user } = useAuthStore()
	const isSuperAdmin = user?.role === "super_admin"
	const [tenants, setTenants] = useState<TenantOption[]>([])
	const [tenantId, setTenantId] = useState("")
	const [detail, setDetail] = useState<CommercialDetail | null>(null)
	const [overview, setOverview] = useState<OpsOverview | null>(null)
	const [loading, setLoading] = useState(false)
	const [saving, setSaving] = useState(false)

	async function loadTenants() {
		try {
			const resp = await api.get<{ items: Array<{ id: string; name: string }> }>(
				"/platform/tenants?page=1&pageSize=100",
			)
			const items = (resp.data.items || []).map((x) => ({ id: x.id, name: x.name }))
			setTenants(items)
			if (!tenantId && items.length > 0) setTenantId(items[0].id)
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "租户列表加载失败")
		}
	}

	async function loadOverview() {
		try {
			const resp = await api.get<OpsOverview>("/ops/metrics/overview")
			setOverview(resp.data)
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "运营指标加载失败")
		}
	}

	async function loadDetail(targetTenantId: string) {
		if (!targetTenantId) return
		setLoading(true)
		try {
			const resp = await api.get<CommercialDetail>(
				`/platform/tenants/${targetTenantId}/commercial`,
			)
			setDetail(resp.data)
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "商业数据加载失败")
			setDetail(null)
		} finally {
			setLoading(false)
		}
	}

	async function changePlan(planCode: string) {
		if (!tenantId) return
		setSaving(true)
		try {
			await api.post(`/platform/tenants/${tenantId}/commercial/change-plan`, {
				planCode,
				billingCycle: "monthly",
			})
			toast.success("租户套餐已变更")
			await Promise.all([loadDetail(tenantId), loadOverview()])
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "套餐变更失败")
		} finally {
			setSaving(false)
		}
	}

	async function giveStoragePack(gb: number) {
		if (!tenantId) return
		setSaving(true)
		try {
			await api.post(`/platform/tenants/${tenantId}/commercial/override`, {
				extraStorageBytes: gb * 1024 * 1024 * 1024,
				reason: `platform_grant_${gb}GB`,
			})
			toast.success(`已发放 ${gb}GB 扩容包`)
			await Promise.all([loadDetail(tenantId), loadOverview()])
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "扩容发放失败")
		} finally {
			setSaving(false)
		}
	}

	useEffect(() => {
		if (!isSuperAdmin) return
		loadTenants()
		loadOverview()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isSuperAdmin])

	useEffect(() => {
		if (tenantId) loadDetail(tenantId)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tenantId])

	if (!isSuperAdmin) {
		return (
			<div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-600">
				当前账号不是超级管理员，无权访问商业运营页面。
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-gray-900">商业运营</h1>
				<p className="text-gray-500 mt-1">管理租户套餐、扩容和平台经营指标。</p>
			</div>

			{overview && (
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
					<div className="bg-white border border-gray-200 rounded-lg p-4">
						<div className="text-sm text-gray-500">租户总数</div>
						<div className="text-2xl font-bold">{overview.tenantCount}</div>
					</div>
					<div className="bg-white border border-gray-200 rounded-lg p-4">
						<div className="text-sm text-gray-500">活跃订阅</div>
						<div className="text-2xl font-bold">{overview.activeSubscriptions}</div>
					</div>
					<div className="bg-white border border-gray-200 rounded-lg p-4">
						<div className="text-sm text-gray-500">欠费订阅</div>
						<div className="text-2xl font-bold">{overview.pastDueSubscriptions}</div>
					</div>
					<div className="bg-white border border-gray-200 rounded-lg p-4">
						<div className="text-sm text-gray-500">MRR</div>
						<div className="text-2xl font-bold">{fmtMoney(overview.mrrCents)}</div>
					</div>
				</div>
			)}

			<div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
				<div className="flex items-center gap-3">
					<span className="text-sm text-gray-600">选择租户</span>
					<select
						value={tenantId}
						onChange={(e) => setTenantId(e.target.value)}
						className="border border-gray-300 rounded px-2 py-1 text-sm"
					>
						{tenants.map((t) => (
							<option key={t.id} value={t.id}>
								{t.name}
							</option>
						))}
					</select>
				</div>

				{loading || !detail ? (
					<div className="text-sm text-gray-500">加载中...</div>
				) : (
					<>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
							<div>套餐：{detail.subscription?.plan_name || "-"}</div>
							<div>状态：{detail.subscription?.status || "-"}</div>
							<div>空间：{fmtGb(detail.usage.storageBytes)} / {fmtGb(detail.limits.maxStorageBytes)}</div>
						</div>

						<div className="flex flex-wrap gap-2">
							<button disabled={saving} onClick={() => changePlan("free")} className="px-3 py-1.5 border border-gray-300 rounded text-sm disabled:opacity-60">切到 Free</button>
							<button disabled={saving} onClick={() => changePlan("pro")} className="px-3 py-1.5 border border-gray-300 rounded text-sm disabled:opacity-60">切到 Pro</button>
							<button disabled={saving} onClick={() => changePlan("enterprise")} className="px-3 py-1.5 border border-gray-300 rounded text-sm disabled:opacity-60">切到 Enterprise</button>
							<button disabled={saving} onClick={() => giveStoragePack(100)} className="px-3 py-1.5 border border-gray-300 rounded text-sm disabled:opacity-60">发放 100GB</button>
							<button disabled={saving} onClick={() => giveStoragePack(500)} className="px-3 py-1.5 border border-gray-300 rounded text-sm disabled:opacity-60">发放 500GB</button>
						</div>

						<div>
							<div className="font-medium text-gray-900 mb-2">最近交易</div>
							<div className="space-y-2 text-sm">
								{detail.transactions.map((t) => (
									<div key={t.id} className="flex justify-between border border-gray-100 rounded p-2">
										<div>{t.event_type}</div>
										<div>{fmtMoney(t.amount_cents)} / {t.status}</div>
									</div>
								))}
							</div>
						</div>
					</>
				)}
			</div>

			{overview && (
				<div className="bg-white border border-gray-200 rounded-lg p-4">
					<div className="font-medium text-gray-900 mb-2">存储占用 Top10</div>
					<div className="space-y-2 text-sm">
						{overview.topStorageTenants.map((item) => (
							<div key={item.tenantId} className="flex justify-between border border-gray-100 rounded p-2">
								<div>{item.tenantName}</div>
								<div>{fmtGb(item.usedBytes)}</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	)
}
