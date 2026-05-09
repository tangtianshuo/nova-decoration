export interface Company {
	id: string
	tenantId?: string
	name: string
	logoUrl: string
	intro: string
	contactPhone: string
	contactWechat: string
	contactAddress: string
	status: "active" | "disabled"
	createdAt: string
	updatedAt: string
}

export interface User {
	id: string
	tenantId?: string | null
	companyId?: string | null
	email: string
	role: "super_admin" | "tenant_admin" | "tenant_editor" | "tenant_viewer"
	status: "active" | "disabled"
}

export interface Asset {
	id: string
	tenantId?: string
	companyId: string
	sourceType: "upload" | "bilibili"
	assetType: "image" | "video"
	url: string
	coverUrl: string
	bilibiliBvid: string
	title: string
	sizeBytes: number
	durationSec: number
	status: "uploading" | "ready" | "disabled"
	createdAt: string
	updatedAt: string
}

export interface PageBlock {
	id: string
	pageId: string
	blockType:
		| "hero"
		| "company_intro"
		| "product_intro"
		| "gallery"
		| "video"
		| "contact"
		| "text"
		| "image"
	refAssetId: string
	contentJson: string
	sortOrder: number
}

export interface ShowcasePage {
	id: string
	tenantId?: string
	companyId: string
	slug: string
	title: string
	summary: string
	publishStatus: "draft" | "published" | "offline"
	publishedAt: string
	blocks: PageBlock[]
	createdAt: string
	updatedAt: string
}

export interface ShareLink {
	id: string
	tenantId?: string
	companyId: string
	pageId: string
	code: string
	status: "active" | "disabled" | "expired"
	expireAt: string
	fallbackUrl: string
	scanCount: number
	createdAt: string
	updatedAt: string
}

export interface PublicPageData {
	company: Company
	page: ShowcasePage
	assets: Asset[]
	shareLink?: ShareLink
}

export interface ApiResponse<T> {
	code: number
	message: string
	data: T
}

export interface LoginRequest {
	email: string
	password: string
}

export interface LoginResponse {
	token: string
	user: User
	company: Company | null
}

export interface AuthMeResponse {
	user: User
	company: Company | null
}

export interface UploadSignRequest {
	assetType: "image" | "video"
	fileName: string
	contentType: string
	sizeBytes: number
}

export interface UploadSignResponse {
	uploadUrl: string
	objectKey: string
	headers: Record<string, string>
	expireAt: string
}

export interface BillingPlan {
	id: string
	code: string
	name: string
	priceMonthlyCents: number
	priceYearlyCents: number
	maxMembers: number
	maxAssets: number
	maxPages: number
	maxStorageBytes: number
	maxMonthlyUploadBytes: number
	status: string
}

export interface TenantSubscription {
	id: string
	tenantId: string
	planId: string
	planCode: string
	planName: string
	status: string
	billingCycle: "monthly" | "yearly"
	trialEndsAt: string | null
	currentPeriodStart: string | null
	currentPeriodEnd: string | null
	priceMonthlyCents: number
	priceYearlyCents: number
}

export interface QuotaInfo {
	subscription: {
		id: string
		status: string
		planCode: string
		planName: string
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
		month: string
	}
	remaining: {
		members: number
		assets: number
		pages: number
		storageBytes: number
		monthlyUploadBytes: number
	}
}

export interface BillingTransaction {
	id: string
	event_type: string
	amount_cents: number
	currency: string
	provider: string
	provider_txn_id: string | null
	status: string
	created_at: string
}
