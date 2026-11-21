import type { Entity } from "./home";

async function request(path: string, body?: unknown) {
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
