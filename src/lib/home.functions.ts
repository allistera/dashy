import { createServerFn } from "@tanstack/react-start";
import { postService } from "./ha.server";
import { loadHome } from "./snapshot.server";

/** Domains the dashboard is allowed to control. */
const SERVICE_DOMAINS = [
	"alarm_control_panel",
	"climate",
	"cover",
	"light",
	"lock",
	"scene",
];
const SERVICE_NAME = /^[a-z_]+$/;

export const getHome = createServerFn().handler(() => loadHome());

export interface ServiceCall {
	domain: string;
	service: string;
	data: Record<string, string | number | string[]>;
}

export const callService = createServerFn({ method: "POST" })
	.validator((call: ServiceCall) => {
		if (
			!SERVICE_DOMAINS.includes(call.domain) ||
			!SERVICE_NAME.test(call.service)
		) {
			throw new Error(`Service ${call.domain}.${call.service} is not allowed.`);
		}
		return call;
	})
	.handler(({ data: call }) =>
		postService(call.domain, call.service, call.data),
	);
