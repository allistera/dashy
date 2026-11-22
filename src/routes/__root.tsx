import latinFontUrl from "@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2?url";
import {
	createRootRoute,
	type ErrorComponentProps,
	HeadContent,
	Outlet,
	ScriptOnce,
	Scripts,
	useRouter,
} from "@tanstack/react-router";
import { type ReactNode, useEffect } from "react";
import { THEME_STORAGE_KEY } from "../components/ThemeToggle";
import { getHome } from "../lib/home.functions";
import stylesUrl from "../styles.css?url";

/** Applies a saved theme before first paint; without one the system setting is used. */
const THEME_SCRIPT = `
  const theme = localStorage.getItem("${THEME_STORAGE_KEY}");
  if (theme) document.documentElement.dataset.theme = theme;
`;

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "Home" },
		],
		links: [
			{ rel: "stylesheet", href: stylesUrl },
			{
				rel: "preload",
				href: latinFontUrl,
				as: "font",
				type: "font/woff2",
				crossOrigin: "anonymous",
			},
		],
	}),
	loader: () => getHome(),
	shellComponent: RootDocument,
	component: RootComponent,
	errorComponent: RootError,
});

/**
 * Reloads the house when the server reports a change. Hidden tabs do not
 * listen; they reconnect, and so reload, when shown again.
 */
function useLiveReload() {
	const router = useRouter();

	useEffect(() => {
		let events: EventSource | undefined;
		const reload = () => router.invalidate();
		const listenWhileVisible = () => {
			events?.close();
			events = undefined;
			if (document.hidden) return;
			events = new EventSource("/api/events");
			events.onopen = reload;
			events.onmessage = reload;
		};

		listenWhileVisible();
		document.addEventListener("visibilitychange", listenWhileVisible);
		return () => {
			document.removeEventListener("visibilitychange", listenWhileVisible);
			events?.close();
		};
	}, [router]);
}

function RootDocument({ children }: { children: ReactNode }) {
	return (
		// The theme script sets data-theme before hydration.
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
				<ScriptOnce>{THEME_SCRIPT}</ScriptOnce>
			</head>
			<body>
				{children}
				<Scripts />
			</body>
		</html>
	);
}

function RootComponent() {
	useLiveReload();
	return <Outlet />;
}

/** Keeps listening, so the dashboard recovers once Home Assistant is back. */
function RootError({ error }: ErrorComponentProps) {
	useLiveReload();
	return (
		<div className="page">
			<h1 className="eyebrow">Cannot load Home Assistant</h1>
			<p className="lead">
				{error instanceof Error ? error.message : String(error)}
			</p>
		</div>
	);
}
