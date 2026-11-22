import { Link } from "@tanstack/react-router";
import { formatDate, formatTime } from "../lib/format";
import { useHome, useNow } from "../lib/hooks";
import { ThemeToggle } from "./ThemeToggle";

export function PageHeader() {
	const { timeZone } = useHome();
	const now = useNow();

	return (
		<header className="header">
			<nav aria-label="Sections" className="nav">
				<Link to="/" className="brand">
					Home
				</Link>
				<Link to="/rooms" className="tab">
					Rooms
				</Link>
				<Link to="/heating" className="tab">
					Heating
				</Link>
				<Link to="/security" className="tab">
					Security
				</Link>
			</nav>
			<div className="meta">
				<span>{formatDate(now, timeZone)}</span>
				<span>{formatTime(now, timeZone)}</span>
				<ThemeToggle />
			</div>
		</header>
	);
}
