import { Icon } from "./Icon";

export const THEME_STORAGE_KEY = "theme";

function toggleTheme() {
	const root = document.documentElement;
	const isDark = root.dataset.theme
		? root.dataset.theme === "dark"
		: window.matchMedia("(prefers-color-scheme: dark)").matches;
	const next = isDark ? "light" : "dark";
	root.dataset.theme = next;
	localStorage.setItem(THEME_STORAGE_KEY, next);
}

export function ThemeToggle() {
	return (
		<button
			type="button"
			className="icon-button"
			aria-label="Switch between light and dark mode"
			onClick={toggleTheme}
		>
			<Icon name="theme" />
		</button>
	);
}
