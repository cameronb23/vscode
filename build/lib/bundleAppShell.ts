import * as esbuild from "esbuild";
import { access, readFile } from "fs/promises";
import * as path from "path";
import { transformAsync } from "@babel/core";

const REPO_ROOT = path.join(import.meta.dirname, "..", "..");

/**
 * Inline SolidJS esbuild plugin.
 *
 * babel-preset-solid performs the reactive JSX → DOM transform that esbuild cannot do
 * on its own (it's more than a factory-function swap — it rewrites the entire JSX tree
 * into fine-grained reactive primitives). We run Babel just for .tsx files and hand
 * the plain JS result back to esbuild for bundling.
 */
function solidPlugin(): esbuild.Plugin {
	return {
		name: "solid",
		setup(build) {
			build.onLoad({ filter: /\.(t|j)sx$/ }, async (args) => {
				const source = await readFile(args.path, "utf8");
				const result = await transformAsync(source, {
					// Preset order is reversed in Babel (last → first):
					//   1. @babel/preset-typescript  — strip type annotations, allow JSX syntax
					//   2. babel-preset-solid        — transform JSX into SolidJS reactive code
					presets: [
						["babel-preset-solid"],
						["@babel/preset-typescript", { isTSX: true, allExtensions: true }],
					],
					filename: args.path,
					sourceMaps: "inline",
				});
				return { contents: result!.code!, loader: "js" };
			});
		},
	};
}

function watchNotifyPlugin(): esbuild.Plugin {
	return {
		name: "watch-notify",
		setup(build) {
			build.onEnd((result) => {
				if (result.errors.length > 0) {
					console.error(
						`[appshell] Build failed with ${result.errors.length} error(s)`,
					);
				} else {
					console.log("[appshell] Build succeeded");
				}
			});
		},
	};
}

const isWatch = process.argv.includes("--watch");

const buildOptions: esbuild.BuildOptions = {
	entryPoints: [
		path.join(REPO_ROOT, "src/vs/code/electron-browser/app/appShell.tsx"),
	],
	outfile: path.join(REPO_ROOT, "out/vs/code/electron-browser/app/appShell.js"),
	bundle: true,
	format: "esm",
	platform: "browser",
	target: "es2022",
	sourcemap: "inline",
};

if (isWatch) {
	const ctx = await esbuild.context({
		...buildOptions,
		plugins: [solidPlugin(), watchNotifyPlugin()],
	});
	await ctx.watch();
	console.log("[appshell] Watching for changes...");
} else {
	const result = await esbuild.build({
		...buildOptions,
		plugins: [solidPlugin()],
	});
	if (result.errors.length > 0) {
		process.exit(1);
	}
}
