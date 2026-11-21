interface SwitchProps {
	label: string;
	on: boolean;
	onChange: (on: boolean) => void;
}

export function Switch({ label, on, onChange }: SwitchProps) {
	return (
		<button
			type="button"
			className="switch"
			aria-label={label}
			aria-pressed={on}
			onClick={() => onChange(!on)}
		/>
	);
}
