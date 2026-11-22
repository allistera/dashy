import { useOptimistic, useTransition } from "react";

interface SwitchProps {
	label: string;
	on: boolean;
	/** Resolves once `on` reflects the change. */
	onChange: (on: boolean) => Promise<void>;
}

export function Switch({ label, on, onChange }: SwitchProps) {
	// Shows the new position at once, then settles on `on` when the change is done.
	const [shown, setShown] = useOptimistic(on);
	const [, startTransition] = useTransition();

	return (
		<button
			type="button"
			className="switch"
			aria-label={label}
			aria-pressed={shown}
			onClick={() =>
				startTransition(async () => {
					setShown(!shown);
					await onChange(!shown);
				})
			}
		/>
	);
}
