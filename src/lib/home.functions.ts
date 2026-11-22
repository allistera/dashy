import { createServerFn } from "@tanstack/react-start";
import { getStates, postService, renderTemplate } from "./ha.server";
import { type Area, domainOf, type Entity, type Home } from "./home";
import { summariesFor } from "./summaries.server";

/** The REST API has no area endpoint, so areas are read through a template. */
const REGISTRY_TEMPLATE = `
{% set ns = namespace(areas=[]) %}
{% for id in areas() %}
  {% set ns.areas = ns.areas + [{
    'id': id,
    'name': area_name(id),
    'floor': floor_name(id),
    'entities': area_entities(id),
  }] %}
{% endfor %}
{{ {'timeZone': now().tzinfo | string, 'areas': ns.areas} | to_json }}`;

interface Registry {
	timeZone: string;
	areas: (Area & { entities: string[] })[];
}

const DOMAINS = [
	"alarm_control_panel",
	"climate",
	"cover",
	"light",
	"lock",
	"person",
	"scene",
	"schedule",
	"sun",
	"weather",
];
const DEVICE_CLASSES: Record<string, string[]> = {
	sensor: ["temperature", "battery"],
	binary_sensor: ["door", "garage_door", "opening", "window", "moisture"],
};
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

function isDisplayed(entity: Entity) {
	if (entity.state === "unavailable") return false;
	const domain = domainOf(entity);
	return (
		DOMAINS.includes(domain) ||
		(DEVICE_CLASSES[domain]?.includes(entity.attributes.device_class ?? "") ??
			false)
	);
}

export const getHome = createServerFn().handler(async (): Promise<Home> => {
	const [states, registryJson] = await Promise.all([
		getStates(),
		renderTemplate(REGISTRY_TEMPLATE),
	]);
	const registry: Registry = JSON.parse(registryJson);
	const areaOf = new Map(
		registry.areas.flatMap((area) =>
			area.entities.map((entityId) => [entityId, area.id] as const),
		),
	);
	const entities = states.filter(isDisplayed).map((entity) => ({
		...entity,
		area_id: areaOf.get(entity.entity_id),
	}));
	const usedAreas = new Set(entities.map((entity) => entity.area_id));

	const home: Home = {
		now: new Date().toISOString(),
		timeZone: registry.timeZone,
		areas: registry.areas
			.filter((area) => usedAreas.has(area.id))
			.map(({ id, name, floor }) => ({ id, name, floor })),
		entities,
	};
	return { ...home, summaries: summariesFor(home) };
});

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
