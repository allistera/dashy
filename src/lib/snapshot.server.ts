import { getStates, renderTemplate } from "./ha.server";
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

/** Areas, floors and the time zone change rarely, so they are not re-read on every load. */
const REGISTRY_TTL_MS = 60_000;

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
/** The attributes the dashboard reads; the rest are not sent to the browser. */
const ATTRIBUTES = [
	"friendly_name",
	"device_class",
	"brightness",
	"current_position",
	"temperature",
	"current_temperature",
	"target_temp_step",
	"hvac_modes",
	"next_setting",
	"next_rising",
	"next_event",
] as const satisfies (keyof Entity["attributes"])[];

let registry: { loadedAt: number; value: Promise<Registry> } | undefined;
let loading: Promise<Home> | undefined;

/** Whether the dashboard shows this entity at all. */
export function isDisplayed(entity: Entity) {
	if (entity.state === "unavailable") return false;
	const domain = domainOf(entity);
	return (
		DOMAINS.includes(domain) ||
		(DEVICE_CLASSES[domain]?.includes(entity.attributes.device_class ?? "") ??
			false)
	);
}

function loadRegistry() {
	if (!registry || Date.now() - registry.loadedAt > REGISTRY_TTL_MS) {
		const value = renderTemplate(REGISTRY_TEMPLATE).then(
			(json): Registry => JSON.parse(json),
		);
		// A failed read is retried on the next load instead of being kept.
		value.catch(() => {
			registry = undefined;
		});
		registry = { loadedAt: Date.now(), value };
	}
	return registry.value;
}

function pickAttributes(attributes: Entity["attributes"]) {
	const picked: Record<string, unknown> = {};
	for (const name of ATTRIBUTES) {
		if (name in attributes) picked[name] = attributes[name];
	}
	return picked;
}

async function readHome(): Promise<Home> {
	const [states, { timeZone, areas }] = await Promise.all([
		getStates(),
		loadRegistry(),
	]);
	const areaOf = new Map(
		areas.flatMap((area) =>
			area.entities.map((entityId) => [entityId, area.id] as const),
		),
	);
	const entities = states.filter(isDisplayed).map(
		(entity): Entity => ({
			entity_id: entity.entity_id,
			state: entity.state,
			last_changed: entity.last_changed,
			area_id: areaOf.get(entity.entity_id),
			attributes: pickAttributes(entity.attributes),
		}),
	);
	const usedAreas = new Set(entities.map((entity) => entity.area_id));
	const home: Home = {
		now: new Date().toISOString(),
		timeZone,
		areas: areas
			.filter((area) => usedAreas.has(area.id))
			.map(({ id, name, floor }) => ({ id, name, floor })),
		entities,
	};
	return { ...home, summaries: summariesFor(home) };
}

/** Reads the house from Home Assistant; simultaneous callers share one read. */
export function loadHome() {
	loading ??= readHome().finally(() => {
		loading = undefined;
	});
	return loading;
}
