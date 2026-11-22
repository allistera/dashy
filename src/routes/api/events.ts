import { createFileRoute } from "@tanstack/react-router";
import { changeStream } from "../../lib/events.server";

export const Route = createFileRoute("/api/events")({
	server: {
		handlers: {
			GET: ({ request }) =>
				new Response(changeStream(request.signal), {
					headers: {
						"Content-Type": "text/event-stream",
						"Cache-Control": "no-cache",
					},
				}),
		},
	},
});
