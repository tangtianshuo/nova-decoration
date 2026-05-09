import { useEffect, useState } from "react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { useAuthStore } from "@/store/auth"
import type {
	BillingPlan,
	BillingTransaction,
	TenantSubscription,
} from "@/types"

function centsToYuan(cents: number): string {
	return `¥${(Number(cents || 0) / 100).toFixed(2)}`
}

export default function BillingCenter() {
	const { user } = useAuthStore()
	const isSuperAdmin = user?.role === "super_admin"
	const [plans, setPlans] = useState<BillingPlan[]>([])
	const [subscription, setSubscription] = useState<TenantSubscription | null>(null)
	const [transactions, setTransactions] = useState<BillingTransaction[]>([])
	const [loading, setLoading] = useState(true)
	const [submitting, setSubmitting] = useState(false)

	async function loadData() {
		if (isSuperAdmin) return
		setLoading(true)
		try {
			const [plansResp, subResp, txResp] = await Promise.all([
				api.get<BillingPlan[]>("/billing/plans"),
				api.get<TenantSubscription>("/billing/subscription/me"),
				api.get<BillingTransaction[]>("/billing/transactions/me?limit=20"),
			])
			setPlans(plansResp.data || [])
			setSubscription(subResp.data || null)
			setTransactions(txResp.data || [])
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "计费中心加载失败")
		} finally {
			setLoading(false)
		}
	}

	async function changePlan(planCode: string) {
		setSubmitting(true)
		try {
			await api.post("/billing/subscription/change-plan", {
				planCode,
				billingCycle: "monthly",
			})
			toast.success("套餐切换成功")
			await loadData()
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "套餐切换失败")
		} finally {
			setSubmitting(false)
		}
	}

	async function buyStorage(extraStorageGb: number, amountCents: number) {
		setSubmitting(true)
		try {
			await api.post("/billing/storage/purchase", { extraStorageGb, amountCents })
			toast.success(`扩容成功：+${extraStorageGb}GB`)
			await loadData()
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "扩容购买失败")
		} finally {
			setSubmitting(false)
		}
	}

	useEffect(() => {
		loadData()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isSuperAdmin])

	if (isSuperAdmin) {
		return (
			<div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-600">
				超级管理员请前往“商业运营”页面管理租户套餐与扩容。
			</div>
		)
	}

	if (loading) {
		return <div className="text-sm text-gray-500">计费中心加载中...</div>
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-gray-900">计费中心</h1>
				<p className="text-gray-500 mt-1">管理当前租户订阅套餐、扩容与交易记录。</p>
			</div>

			<div className="bg-white rounded-xl border border-gray-200 p-5">
				<h2 className="text-lg font-semibold text-gray-900">当前订阅</h2>
				{subscription ? (
					<div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
						<div>套餐：{subscription.planName}</div>
						<div>状态：{subscription.status}</div>
						<div>周期：{subscription.billingCycle}</div>
					</div>
				) : (
					<p className="text-sm text-gray-500 mt-2">暂无订阅信息</p>
				)}
			</div>

			<div className="bg-white rounded-xl border border-gray-200 p-5">
				<h2 className="text-lg font-semibold text-gray-900 mb-3">套餐选择</h2>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					{plans.map((plan) => (
						<div key={plan.code} className="border border-gray-200 rounded-lg p-4">
							<div className="font-semibold text-gray-900">{plan.name}</div>
							<div className="text-sm text-gray-500 mt-1">
								月付 {centsToYuan(plan.priceMonthlyCents)}
							</div>
							<div className="text-xs text-gray-500 mt-2">
								空间 {Math.round(plan.maxStorageBytes / 1024 / 1024 / 1024)}GB
							</div>
							<button
								disabled={submitting || subscription?.planCode === plan.code}
								onClick={() => changePlan(plan.code)}
								className="mt-3 w-full bg-indigo-600 text-white rounded-lg py-2 text-sm disabled:opacity-60"
							>
								{subscription?.planCode === plan.code ? "当前套餐" : "切换套餐"}
							</button>
						</div>
					))}
				</div>
			</div>

			<div className="bg-white rounded-xl border border-gray-200 p-5">
				<h2 className="text-lg font-semibold text-gray-900 mb-3">容量扩容包</h2>
				<div className="flex flex-wrap gap-3">
					<button
						disabled={submitting}
						onClick={() => buyStorage(100, 9900)}
						className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-60"
					>
						购买 100GB（¥99）
					</button>
					<button
						disabled={submitting}
						onClick={() => buyStorage(500, 39900)}
						className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-60"
					>
						购买 500GB（¥399）
					</button>
				</div>
			</div>

			<div className="bg-white rounded-xl border border-gray-200 p-5">
				<h2 className="text-lg font-semibold text-gray-900 mb-3">最近交易</h2>
				{transactions.length === 0 ? (
					<p className="text-sm text-gray-500">暂无交易记录</p>
				) : (
					<div className="space-y-2 text-sm">
						{transactions.map((t) => (
							<div
								key={t.id}
								className="flex items-center justify-between border border-gray-100 rounded p-2"
							>
								<div>
									<div className="text-gray-800">{t.event_type}</div>
									<div className="text-xs text-gray-500">{t.created_at}</div>
								</div>
								<div className="text-right">
									<div>{centsToYuan(t.amount_cents)}</div>
									<div className="text-xs text-gray-500">{t.status}</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	)
}
