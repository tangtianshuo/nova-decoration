import { create } from "zustand"
import type { Asset, ShowcasePage, ShareLink } from "@/types"

interface AppState {
	assets: Asset[]
	pages: ShowcasePage[]
	shareLinks: ShareLink[]
	setAssets: (assets: Asset[]) => void
	addAsset: (asset: Asset) => void
	removeAsset: (id: string) => void
	setPages: (pages: ShowcasePage[]) => void
	addPage: (page: ShowcasePage) => void
	updatePage: (page: ShowcasePage) => void
	removePage: (id: string) => void
	setShareLinks: (links: ShareLink[]) => void
	addShareLink: (link: ShareLink) => void
}

export const useAppStore = create<AppState>((set) => ({
	assets: [],
	pages: [],
	shareLinks: [],
	setAssets: (assets) => set({ assets }),
	addAsset: (asset) => set((s) => ({ assets: [...s.assets, asset] })),
	removeAsset: (id) =>
		set((s) => ({ assets: s.assets.filter((a) => a.id !== id) })),
	setPages: (pages) => set({ pages }),
	addPage: (page) => set((s) => ({ pages: [...s.pages, page] })),
	updatePage: (page) =>
		set((s) => ({ pages: s.pages.map((p) => (p.id === page.id ? page : p)) })),
	removePage: (id) =>
		set((s) => ({ pages: s.pages.filter((p) => p.id !== id) })),
	setShareLinks: (links) => set({ shareLinks: links }),
	addShareLink: (link) => set((s) => ({ shareLinks: [...s.shareLinks, link] })),
}))
