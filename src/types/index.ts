export interface Company {
	id: string
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
	companyId: string
	email: string
	role: "admin" | "editor"
	status: "active" | "disabled"
}

export interface Asset {
	id: string
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
	company: Company
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
