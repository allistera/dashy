const PATHS = {
	back: "M15 6l-6 6 6 6",
	forward: "M9 6l6 6-6 6",
	minus: "M6 12h12",
	plus: "M6 12h12M12 6v12",
	power: "M12 4v8M7.5 6.8a7 7 0 1 0 9 0",
	theme: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z",
};

export function Icon({ name }: { name: keyof typeof PATHS }) {
	return (
		<svg
			aria-hidden="true"
			className="icon"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.75"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d={PATHS[name]} />
		</svg>
	);
}
