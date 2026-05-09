import { useEffect, useState } from "react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { useAuthStore } from "@/store/auth"
import type { QuotaInfo } from "@/types"

function formatBytes(bytes: number): string {
	const gb = Number(bytes || 0) / 1024 / 1024 / 1024
	return `${gb.toFixed(2)} GB`
}

function PercentBar({ value }: { value: number }) {
	const safe = Math.max(0, Math.min(100, value))
	return (
		<div className="h-2 rounded bg-gray-100">
			<div className="h-2 rounded bg-indigo-600" style={{ width: `${safe}%` }} />
		</div>
	)
}

export default function QuotaCenter() {
	const { user } = useAuthStore()
	const isSuperAdmin = user?.role === "super_admin"
	const [data, setData] = useState<QuotaInfo | null>(null)
	const [loading, setLoading] = useState(true)

	async function loadQuota() {
		if (isSuperAdmin) return
		setLoading(true)
		try {
			const resp = await api.get<QuotaInfo>("/quotas/me")
			setData(resp.data)
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "配额加载失败")
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		loadQuota()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isSuperAdmin])

	if (isSuperAdmin) {
		return (
			<div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-600">
				超级管理员请在“商业运营”页面查看租户配额与用量。
			</div>
		)
	}

	if (loading || !data) return <div className="text-sm text-gray-500">配额加载中...</div>

	const usageRows = [
		{
			label: "成员数",
			used: data.usage.members,
			limit: data.limits.maxMembers,
			display: `${data.usage.members}/${data.limits.maxMembers}`,
		},
		{
			label: "素材数",
			used: data.usage.assets,
			limit: data.limits.maxAssets,
			display: `${data.usage.assets}/${data.limits.maxAssets}`,
		},
		{
			label: "页面数",
			used: data.usage.pages,
			limit: data.limits.maxPages,
			display: `${data.usage.pages}/${data.limits.maxPages}`,
		},
		{
			label: "存储空间",
			used: data.usage.storageBytes,
			limit: data.limits.maxStorageBytes,
			display: `${formatBytes(data.usage.storageBytes)} / ${formatBytes(data.limits.maxStorageBytes)}`,
		},
		{
			label: "本月上传流量",
			used: data.usage.monthlyUploadedBytes,
			limit: data.limits.maxMonthlyUploadBytes,
			display: `${formatBytes(data.usage.monthlyUploadedBytes)} / ${formatBytes(data.limits.maxMonthlyUploadBytes)}`,
		},
	]

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-gray-900">配额中心</h1>
				<p className="text-gray-500 mt-1">查看套餐限制、实时用量与剩余额度。</p>
			</div>

			<div className="bg-white rounded-xl border border-gray-200 p-5">
				<div className="text-sm text-gray-700">
					当前套餐：{data.subscription?.planName || "-"}（状态：{data.subscription?.status || "-"}）
				</div>
			</div>

			<div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
				{usageRows.map((row) => {
					const percent = row.limit > 0 ? (row.used / row.limit) * 100 : 0
					return (
						<div key={row.label}>
							<div className="flex items-center justify-between text-sm mb-1">
								<span className="text-gray-700">{row.label}</span>
								<span className="text-gray-600">{row.display}</span>
							</div>
							<PercentBar value={percent} />
						</div>
					)
				})}
			</div>
		</div>
	)
}
