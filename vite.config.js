import { resolve } from "path"
import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import svgLoader from "vite-svg-loader"

/** @type {import("vite").UserConfig} */
export default defineConfig({
	plugins: [
		vue(),
		svgLoader()
	],
	root: "src",
	build: {
		minify: false,
		outDir: resolve(__dirname, "build"),
		emptyOutDir: true
	},
	server: {
		open: true,
		proxy: {
			"/api": "http://localhost:3000",
			"/vpk": "http://localhost:3000"
		}
	}
})
