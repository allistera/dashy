import { stateChanges } from "./ha.server";
import { isDisplayed } from "./snapshot.server";
import { onSummariesWritten } from "./summaries.server";

/** Collects a burst of changes, such as a scene, into one notification. */
const NOTIFY_DELAY_MS = 250;
const CHANGED_MESSAGE = new TextEncoder().encode("data: changed\n\n");

/**
 * A server-sent event stream that tells a browser when to reload the house:
 * after a displayed entity changes or new summaries are written. It ends when
 * the signal aborts or Home Assistant closes its stream; browsers reconnect.
 */
export function changeStream(signal: AbortSignal) {
	return new ReadableStream<Uint8Array>({
		async start(controller) {
			let timer: ReturnType<typeof setTimeout> | undefined;
			const notify = () => {
				timer ??= setTimeout(() => {
					timer = undefined;
					controller.enqueue(CHANGED_MESSAGE);
				}, NOTIFY_DELAY_MS);
			};
			const stopListening = onSummariesWritten(notify);

			try {
				for await (const entity of stateChanges(signal)) {
					if (isDisplayed(entity)) notify();
				}
			} catch (error) {
				if (!signal.aborted) console.error("Event stream failed:", error);
			} finally {
				clearTimeout(timer);
				stopListening();
				controller.close();
			}
		},
	});
}
