import type { ReactNode } from "react";

interface RowProps {
	title: string;
	detail?: string;
	/** Draws the detail line in the accent colour. */
	alert?: boolean;
	/** Controls shown at the end of the row. */
	children?: ReactNode;
}

export function Row({ title, detail, alert = false, children }: RowProps) {
	return (
		<div className="row">
			<div className="row-text">
				<span className="row-title">{title}</span>
				{detail && (
					<span className={alert ? "row-detail alert" : "row-detail"}>
						{detail}
					</span>
				)}
			</div>
			{children}
		</div>
	);
}
