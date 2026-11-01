import { defineConfig } from "vitest/config";
import { readFileSync } from "node:fs";
export default defineConfig({
	plugins: [
		{
			name: "prisma-wasm-in-node-tests",
			enforce: "pre",
			load(id) {
				if (id.endsWith(".wasm?module")) {
					const bytes = readFileSync(id.split("?")[0]!);
					return (
						"export default new WebAssembly.Module(Buffer.from(" +
						JSON.stringify(bytes.toString("base64")) +
						',"base64"));'
					);
				}
			},
		},
	],
	test: {
		include: ["tests/cloud/**/*.test.ts"],
		testTimeout: 120000,
		hookTimeout: 120000,
		fileParallelism: false,
	},
});
