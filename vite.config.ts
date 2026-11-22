import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
	// tanstackStart must come before the React plugin.
	plugins: [
		tanstackStart(),
		nitro({ compressPublicAssets: true }),
		viteReact(),
	],
});
