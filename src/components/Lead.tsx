import type { ReactNode } from "react";
import type { Summaries } from "../lib/home";
import { useHome } from "../lib/hooks";

interface LeadProps {
	page: keyof Summaries;
	/** Shown until a model-written summary for the current state is available. */
	children: ReactNode;
}

/** The headline sentence of a page. */
export function Lead({ page, children }: LeadProps) {
	const summary = useHome().summaries?.[page];

	return (
		<p className="lead">
			{summary ? (
				<>
					{summary.text}{" "}
					{summary.alert && <span className="alert">{summary.alert}</span>}
				</>
			) : (
				children
			)}
		</p>
	);
}
