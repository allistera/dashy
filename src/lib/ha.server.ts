import type { Entity } from "./home";

const MESSAGE_SEPARATOR = "\n\n";
const KEEP_ALIVE = "ping";

async function request(path: string, body?: unknown, signal?: AbortSignal) {
	const { HA_URL, HA_TOKEN } = process.env;
	if (!HA_URL || !HA_TOKEN) {
		throw new Error("Set HA_URL and HA_TOKEN to connect to Home Assistant.");
	}
	const response = await fetch(new URL(`/api/${path}`, HA_URL), {
		method: body === undefined ? "GET" : "POST",
		headers: {
			Authorization: `Bearer ${HA_TOKEN}`,
			"Content-Type": "application/json",
		},
		body: body === undefined ? undefined : JSON.stringify(body),
		signal,
	});
	if (!response.ok) {
		throw new Error(`Home Assistant answered ${response.status} for ${path}.`);
	}
	return response;
}

export async function getStates(): Promise<Entity[]> {
	return (await request("states")).json();
}

export async function renderTemplate(template: string) {
	return (await request("template", { template })).text();
}

export async function postService(
	domain: string,
	service: string,
	data: unknown,
) {
	await request(`services/${domain}/${service}`, data);
}

interface StateChangedEvent {
	data: { new_state: Entity | null; old_state: Entity | null };
}

/**
 * Yields the entity behind every state change, as Home Assistant reports it
 * on its server-sent event stream, until the signal aborts or the stream ends.
 */
export async function* stateChanges(signal: AbortSignal) {
	const response = await request(
		"stream?restrict=state_changed",
		undefined,
		signal,
	);
	if (!response.body) return;

	let buffer = "";
	for await (const chunk of response.body.pipeThrough(
		new TextDecoderStream(),
	)) {
		const messages = (buffer + chunk).split(MESSAGE_SEPARATOR);
		buffer = messages.pop() ?? "";
		for (const message of messages) {
			const payload = message.replace(/^data: /, "");
			if (payload === KEEP_ALIVE) continue;
			const { data }: StateChangedEvent = JSON.parse(payload);
			const entity = data.new_state ?? data.old_state;
			if (entity) yield entity;
		}
	}
}
