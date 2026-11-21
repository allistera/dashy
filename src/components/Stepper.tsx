import { Icon } from "./Icon";

interface StepperButtonProps {
	label: string;
	direction: "minus" | "plus";
	large?: boolean;
	onClick: () => void;
}

export function StepperButton({
	label,
	direction,
	large = false,
	onClick,
}: StepperButtonProps) {
	return (
		<button
			type="button"
			className={large ? "round large" : "round"}
			aria-label={label}
			onClick={onClick}
		>
			<Icon name={direction} />
		</button>
	);
}
