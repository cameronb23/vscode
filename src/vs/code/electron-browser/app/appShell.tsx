import { render } from "solid-js/web";
import type { INativeWindowConfiguration } from "../../../platform/window/common/window.js";
import type { IMainWindowSandboxGlobals } from "../../../base/parts/sandbox/electron-browser/globals.js";
import {
	fileUriFromPath,
	setupNLS,
	setupCSSImportMaps,
	resolveWindowConfiguration,
	registerDeveloperKeybindings,
} from "./shellBootstrap.js";
import { App } from "../../../../app/App.js";

/**
 * App Shell Bootstrap
 *
 * Thin entry point: reads window configuration, sets up globals, then hands
 * off rendering to the SolidJS App component.
 */

(async function () {
	// Add a perf entry right from the top
	performance.mark("code/didStartRenderer");

	const preloadGlobals = (
		window as unknown as { vscode: IMainWindowSandboxGlobals }
	).vscode;
	const safeProcess = preloadGlobals.process;

	// Resolve window configuration
	const configuration =
		await resolveWindowConfiguration<INativeWindowConfiguration>();

	// Enable developer keybindings in dev mode
	if (!!safeProcess.env["VSCODE_DEV"]) {
		registerDeveloperKeybindings(false);
	}

	// Setup NLS
	setupNLS(configuration);

	// Compute base URL and set as global
	const baseUrl = new URL(
		`${fileUriFromPath(configuration.appRoot, {
			isWindows: safeProcess.platform === "win32",
			scheme: "vscode-file",
			fallbackAuthority: "vscode-app",
		})}/out/`,
	);
	globalThis._VSCODE_FILE_ROOT = baseUrl.toString();

	// Dev only: CSS import map
	setupCSSImportMaps(configuration, baseUrl);

	// Expose the window ID globally (used by some VS Code internals)
	Object.defineProperty(window, "vscodeWindowId", {
		get: () => configuration.windowId,
	});

	// Create a default Trusted Types policy so SolidJS's innerHTML template mechanism
	// (which clones reactive DOM fragments via template.innerHTML) passes CSP checks.
	if (window.trustedTypes) {
		try {
			window.trustedTypes.createPolicy("default", {
				createHTML: (s: string) => s,
			});
		} catch {
			// A default policy may already exist; that's fine.
		}
	}

	render(
		() => <App configuration={configuration} baseUrl={baseUrl} />,
		document.getElementById("app")!,
	);
})();
