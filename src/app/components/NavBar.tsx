import type { IMainWindowSandboxGlobals } from "../../vs/base/parts/sandbox/electron-browser/globals.js";

const preloadGlobals = (
	window as unknown as { vscode: IMainWindowSandboxGlobals }
).vscode;

export function NavBar(props: { workspaceName: string }) {
	return (
		<div class="nav-center">
			<button
				class="nav-home-btn"
				title="Return to Home Screen"
				onClick={() =>
					preloadGlobals.ipcRenderer.invoke("vscode:openHomeScreen")
				}
			>
				← Home
			</button>
			<span class="nav-workspace-name">{props.workspaceName}</span>
		</div>
	);
}
