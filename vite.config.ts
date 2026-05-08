import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tsconfigPaths from "vite-tsconfig-paths"

// https://vite.dev/config/
export default defineConfig({
	server: {
		proxy: {
			"/api": {
				target: "http://localhost:8787",
				changeOrigin: true,
			},
			"/q": {
				target: "http://localhost:8787",
				changeOrigin: true,
			},
		},
	},
	build: {
		sourcemap: "hidden",
	},
	plugins: [
		react({
			babel: {
				plugins: ["react-dev-locator"],
			},
		}),
		tsconfigPaths(),
	],
})
