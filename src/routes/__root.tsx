import {
	createRootRoute,
	type ErrorComponentProps,
	HeadContent,
	ScriptOnce,
	Scripts,
	useRouter,
} from "@tanstack/react-router";
import { type ReactNode, useEffect } from "react";
import { THEME_STORAGE_KEY } from "../components/ThemeToggle";
import { getHome } from "../lib/home.functions";
import stylesUrl from "../styles.css?url";

const REFRESH_INTERVAL_MS = 5000;

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
		links: [{ rel: "stylesheet", href: stylesUrl }],
	}),
	loader: () => getHome(),
	shellComponent: RootDocument,
	errorComponent: RootError,
});

function RootDocument({ children }: { children: ReactNode }) {
	const router = useRouter();

	useEffect(() => {
		const timer = setInterval(() => router.invalidate(), REFRESH_INTERVAL_MS);
		return () => clearInterval(timer);
	}, [router]);

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

function RootError({ error }: ErrorComponentProps) {
	return (
		<div className="page">
			<h1 className="eyebrow">Cannot load Home Assistant</h1>
			<p className="lead">
				{error instanceof Error ? error.message : String(error)}
			</p>
		</div>
	);
}
