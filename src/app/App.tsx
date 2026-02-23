import { onMount } from "solid-js";
import type { INativeWindowConfiguration } from "../vs/platform/window/common/window.js";
import type { IMainWindowSandboxGlobals } from "../vs/base/parts/sandbox/electron-browser/globals.js";
import type { IDesktopMain } from "../vs/workbench/electron-browser/desktop.main.js";
import { NavBar } from "./components/NavBar.js";
import { HomePage } from "./components/HomePage.js";

const preloadGlobals = (
	window as unknown as { vscode: IMainWindowSandboxGlobals }
).vscode;
const safeProcess = preloadGlobals.process;

function injectAppStyles(): void {
	const style = document.createElement("style");
	style.textContent = `
		#home-page {
			background: #1e1e1e;
			color: #cccccc;
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
			padding: 40px;
			box-sizing: border-box;
			-webkit-app-region: drag;
		}
		.home-header {
			margin-bottom: 32px;
		}
		.home-header h1 {
			font-size: 28px;
			font-weight: 600;
			margin: 0 0 8px 0;
			color: #ffffff;
			letter-spacing: -0.5px;
		}
		.home-header p {
			font-size: 14px;
			color: #858585;
			margin: 0;
		}
		.home-actions {
			display: flex;
			gap: 12px;
			margin-bottom: 40px;
		}
		.home-btn {
			-webkit-app-region: no-drag;
			background: #0e639c;
			color: #ffffff;
			border: none;
			border-radius: 4px;
			padding: 8px 16px;
			font-size: 13px;
			cursor: pointer;
			font-family: inherit;
			transition: background 0.15s;
		}
		.home-btn:hover {
			background: #1177bb;
		}
		.home-recents h2 {
			font-size: 16px;
			font-weight: 500;
			margin: 0 0 16px 0;
			color: #c8c8c8;
		}
		.workspace-grid {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
			gap: 12px;
		}
		.workspace-card {
			-webkit-app-region: no-drag;
			background: #252526;
			border: 1px solid #3c3c3c;
			border-radius: 6px;
			padding: 16px;
			cursor: pointer;
			transition: background 0.15s, border-color 0.15s;
		}
		.workspace-card:hover {
			background: #2a2d2e;
			border-color: #0e639c;
		}
		.wc-name {
			font-size: 14px;
			font-weight: 500;
			color: #cccccc;
			margin-bottom: 6px;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
		.wc-path {
			font-size: 11px;
			color: #858585;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
		.home-empty {
			font-size: 13px;
			color: #858585;
			padding: 24px 0;
		}
		#app-navbar {
			background: rgba(28, 28, 32, 0.65);
			backdrop-filter: blur(24px) saturate(180%);
			-webkit-backdrop-filter: blur(24px) saturate(180%);
			border-bottom: 1px solid rgba(255, 255, 255, 0.07);
			display: flex;
			align-items: center;
			justify-content: center;
			height: 32px;
			flex-shrink: 0;
			position: relative;
			-webkit-app-region: drag;
		}
		.nav-center {
			position: absolute;
			left: 50%;
			transform: translateX(-50%);
			display: flex;
			align-items: center;
			gap: 10px;
			-webkit-app-region: drag;
		}
		.nav-home-btn {
			background: rgba(255, 255, 255, 0.07);
			color: rgba(255, 255, 255, 0.75);
			border: 1px solid rgba(255, 255, 255, 0.12);
			border-radius: 6px;
			padding: 4px 10px;
			font-size: 12px;
			cursor: pointer;
			font-family: inherit;
			-webkit-app-region: no-drag;
			transition: background 0.15s, color 0.15s, border-color 0.15s;
		}
		.nav-home-btn:hover {
			background: rgba(255, 255, 255, 0.14);
			color: #ffffff;
			border-color: rgba(255, 255, 255, 0.22);
		}
		.nav-workspace-name {
			font-size: 12px;
			color: rgba(255, 255, 255, 0.45);
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
			max-width: 320px;
		}
	`;
	window.document.head.appendChild(style);
}

function getWorkspaceName(configuration: INativeWindowConfiguration): string {
	const workspace = configuration.workspace;
	if (!workspace) {
		return "";
	}
	// Single-folder workspace
	if ("uri" in workspace) {
		const parts = workspace.uri.path.split("/");
		return parts[parts.length - 1] || workspace.uri.path;
	}
	// Multi-root workspace file
	if ("configPath" in workspace) {
		const parts = workspace.configPath.path.split("/");
		const file = parts[parts.length - 1] || "";
		return file.replace(/\.code-workspace$/, "") || file;
	}
	return "Workspace";
}

function showDefaultSplash(configuration: INativeWindowConfiguration): void {
	const data = configuration.partsSplash;
	if (!data?.layoutInfo) {
		return;
	}
	const { layoutInfo, colorInfo } = data;
	const splash = document.createElement("div");
	splash.id = "monaco-parts-splash";
	splash.className = data.baseTheme ?? "vs-dark";

	if (layoutInfo.titleBarHeight > 0) {
		const titleDiv = document.createElement("div");
		titleDiv.style.position = "absolute";
		titleDiv.style.width = "100%";
		titleDiv.style.height = `${layoutInfo.titleBarHeight}px`;
		titleDiv.style.left = "0";
		titleDiv.style.top = "0";
		titleDiv.style.backgroundColor = `${colorInfo.titleBarBackground}`;
		(titleDiv.style as CSSStyleDeclaration & { "-webkit-app-region": string })[
			"-webkit-app-region"
		] = "drag";
		splash.appendChild(titleDiv);
	}

	if (layoutInfo.statusBarHeight > 0) {
		const statusDiv = document.createElement("div");
		statusDiv.style.position = "absolute";
		statusDiv.style.width = "100%";
		statusDiv.style.height = `${layoutInfo.statusBarHeight}px`;
		statusDiv.style.bottom = "0";
		statusDiv.style.left = "0";
		if (configuration.workspace && colorInfo.statusBarBackground) {
			statusDiv.style.backgroundColor = colorInfo.statusBarBackground;
		} else if (
			!configuration.workspace &&
			colorInfo.statusBarNoFolderBackground
		) {
			statusDiv.style.backgroundColor = colorInfo.statusBarNoFolderBackground;
		}
		splash.appendChild(statusDiv);
	}

	// Show splash inside the vscode container, not document.body
	const container =
		document.getElementById("vscode-container") ?? window.document.body;
	container.appendChild(splash);
}

export function App(props: {
	configuration: INativeWindowConfiguration;
	baseUrl: URL;
}) {
	onMount(() => {
		injectAppStyles();
	});

	if (props.configuration.workspace) {
		// WORKSPACE MODE
		let vscodeContainerRef!: HTMLDivElement;

		onMount(async () => {
			performance.mark("code/willShowPartsSplash");
			showDefaultSplash(props.configuration);
			performance.mark("code/didShowPartsSplash");

			performance.mark("code/willLoadWorkbenchMain");

			let workbenchUrl: string;
			if (
				!!safeProcess.env["VSCODE_DEV"] &&
				globalThis._VSCODE_USE_RELATIVE_IMPORTS
			) {
				workbenchUrl = "../../../workbench/workbench.desktop.main.js";
			} else {
				workbenchUrl = new URL(
					"vs/workbench/workbench.desktop.main.js",
					props.baseUrl,
				).href;
			}

			const workbenchMain = (await import(workbenchUrl)) as IDesktopMain;
			performance.mark("code/didLoadWorkbenchMain");
			workbenchMain.main(props.configuration, vscodeContainerRef);
		});

		return (
			<div style="position:fixed;inset:0;display:flex;flex-direction:column;">
				<div id="app-navbar">
					<NavBar workspaceName={getWorkspaceName(props.configuration)} />
				</div>
				<div
					id="vscode-container"
					ref={vscodeContainerRef}
					style="flex:1;overflow:hidden;position:relative;"
				/>
			</div>
		);
	} else {
		// HOME MODE
		return (
			<div id="home-page" style="position:fixed;inset:0;overflow:auto;">
				<HomePage windowId={props.configuration.windowId} />
			</div>
		);
	}
}
