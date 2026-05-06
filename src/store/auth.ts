import { create } from "zustand"
import type { User, Company } from "@/types"

interface AuthState {
	token: string | null
	user: User | null
	company: Company | null
	isAuthenticated: boolean
	login: (token: string, user: User, company: Company | null) => void
	logout: () => void
	updateCompany: (company: Company | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
	token: localStorage.getItem("nova_token"),
	user: null,
	company: null,
	isAuthenticated: !!localStorage.getItem("nova_token"),
	login: (token, user, company) => {
		localStorage.setItem("nova_token", token)
		set({ token, user, company, isAuthenticated: true })
	},
	logout: () => {
		localStorage.removeItem("nova_token")
		set({ token: null, user: null, company: null, isAuthenticated: false })
	},
	updateCompany: (company) => {
		set({ company })
	},
}))
