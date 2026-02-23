import { createSignal, onMount, For, Show } from "solid-js";
import type { IMainWindowSandboxGlobals } from "../../vs/base/parts/sandbox/electron-browser/globals.js";

const preloadGlobals = (
	window as unknown as { vscode: IMainWindowSandboxGlobals }
).vscode;

/** Recently opened workspace item returned by the `vscode:getRecentlyOpened` IPC handler. */
export interface IRecentWorkspaceItem {
	readonly type: "folder" | "workspace";
	readonly uri: {
		readonly scheme: string;
		readonly path: string;
		readonly fsPath: string;
	};
	readonly label?: string;
}

export function HomePage(props: { windowId: number }) {
	const [workspaces, setWorkspaces] = createSignal<IRecentWorkspaceItem[]>([]);
	const [loading, setLoading] = createSignal(true);

	onMount(async () => {
		try {
			const data = (await preloadGlobals.ipcRenderer.invoke(
				"vscode:getRecentlyOpened",
			)) as { workspaces: IRecentWorkspaceItem[] } | undefined;
			setWorkspaces(data?.workspaces ?? []);
		} catch (err) {
			console.error(
				"[app-shell] Failed to get recently opened workspaces:",
				err,
			);
		} finally {
			setLoading(false);
		}
	});

	const [count, setCount] = createSignal(0);

	const localWorkspaces = () =>
		workspaces()
			.filter((w) => w.uri && (w.uri.scheme === "file" || !w.uri.scheme))
			.slice(0, 12);

	return (
		<>
			<div class="home-header">
				<h1>My App222</h1>
				<button class="home-btn" onClick={() => setCount(count() + 1)}>
					Count: {count()}
				</button>
				<p>Select a workspace to open or browse for a folder.</p>
			</div>

			<div class="home-actions">
				<button
					class="home-btn"
					onClick={() =>
						preloadGlobals.ipcRenderer.invoke(
							"vscode:pickFolderAndOpenInCurrentWindow",
							{ windowId: props.windowId },
						)
					}
				>
					Open Folder…
				</button>
			</div>

			<div class="home-recents">
				<h2>Recent Workspaces</h2>
				<Show when={loading()}>
					<p class="home-empty">Loading recent workspaces…</p>
				</Show>
				<Show when={!loading()}>
					<Show
						when={localWorkspaces().length > 0}
						fallback={
							<p class="home-empty">
								No recent workspaces. Open a folder to get started.
							</p>
						}
					>
						<div class="workspace-grid">
							<For each={localWorkspaces()}>
								{(recent) => {
									const fsPath = recent.uri.fsPath || recent.uri.path;
									const parts = fsPath.replace(/\\/g, "/").split("/");
									const displayName =
										recent.label || parts[parts.length - 1] || fsPath;
									return (
										<div
											class="workspace-card"
											title={`Open ${fsPath}`}
											onClick={() =>
												preloadGlobals.ipcRenderer.invoke(
													"vscode:openFolderInCurrentWindow",
													{
														windowId: props.windowId,
														uri: recent.uri,
													},
												)
											}
										>
											<div class="wc-name">{displayName}</div>
											<div class="wc-path">{fsPath}</div>
										</div>
									);
								}}
							</For>
						</div>
					</Show>
				</Show>
			</div>
		</>
	);
}
