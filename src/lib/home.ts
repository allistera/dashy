/** A Home Assistant entity state, limited to the attributes the dashboard reads. */
export interface Entity {
	entity_id: string;
	state: string;
	last_changed: string;
	area_id?: string;
	attributes: {
		friendly_name?: string;
		device_class?: string;
		brightness?: number | null;
		current_position?: number;
		temperature?: number | null;
		current_temperature?: number | null;
		target_temp_step?: number;
		hvac_modes?: string[];
		next_setting?: string;
		next_rising?: string;
		next_event?: string;
	};
}

export interface Area {
	id: string;
	name: string;
	floor: string | null;
}

/** A page's headline: `text`, then `alert` (possibly empty) in the accent colour. */
export interface Summary {
	text: string;
	alert: string;
}

export interface Summaries {
	home: Summary;
	rooms: Summary;
	heating: Summary;
	security: Summary;
}

export interface Home {
	now: string;
	timeZone: string;
	areas: Area[];
	entities: Entity[];
	/** Model-written headlines; absent when none match the current state. */
	summaries?: Summaries;
}

const LOW_BATTERY_PERCENT = 15;
const GATE_CLASSES = ["garage", "door", "gate"];

export const domainOf = (entity: Entity) =>
	entity.entity_id.slice(0, entity.entity_id.indexOf("."));

export const nameOf = (entity: Entity) =>
	entity.attributes.friendly_name ?? entity.entity_id;

export const ofDomain = (entities: Entity[], domain: string) =>
	entities.filter((entity) => domainOf(entity) === domain);

const ofClass = (entities: Entity[], domain: string, classes: string[]) =>
	ofDomain(entities, domain).filter((entity) =>
		classes.includes(entity.attributes.device_class ?? ""),
	);

export const inArea = (entities: Entity[], areaId: string) =>
	entities.filter((entity) => entity.area_id === areaId);

/** Covers that are a way into the house, as opposed to blinds. */
export const isGate = (entity: Entity) =>
	domainOf(entity) === "cover" &&
	GATE_CLASSES.includes(entity.attributes.device_class ?? "");

export const gates = (entities: Entity[]) => entities.filter(isGate);

export const blinds = (entities: Entity[]) =>
	ofDomain(entities, "cover").filter((entity) => !isGate(entity));

export const doorSensors = (entities: Entity[]) =>
	ofClass(entities, "binary_sensor", ["door", "garage_door", "opening"]);

export const windowSensors = (entities: Entity[]) =>
	ofClass(entities, "binary_sensor", ["window"]);

export const leakSensors = (entities: Entity[]) =>
	ofClass(entities, "binary_sensor", ["moisture"]);

export const isOn = (entity: Entity) => entity.state === "on";

export const isOpen = (entity: Entity) =>
	["open", "opening", "on"].includes(entity.state);

export const openEntrances = (entities: Entity[]) =>
	[
		...gates(entities),
		...doorSensors(entities),
		...windowSensors(entities),
	].filter(isOpen);

export const lowBatteries = (entities: Entity[]) =>
	ofClass(entities, "sensor", ["battery"]).filter(
		(entity) => Number(entity.state) < LOW_BATTERY_PERCENT,
	);

/** Measured temperature: a temperature sensor if there is one, otherwise a thermostat reading. */
export function temperatureOf(entities: Entity[]) {
	const readings = [
		...ofClass(entities, "sensor", ["temperature"]).map((sensor) =>
			Number(sensor.state),
		),
		...ofDomain(entities, "climate").map(
			(climate) => climate.attributes.current_temperature ?? Number.NaN,
		),
	];
	return readings.find(Number.isFinite);
}

/** A climate entity that currently has a target temperature. */
export type Thermostat = Entity & { attributes: { temperature: number } };

const isThermostat = (entity: Entity): entity is Thermostat =>
	domainOf(entity) === "climate" && entity.attributes.temperature != null;

export const thermostats = (entities: Entity[]) =>
	entities.filter(isThermostat);

/** The target most thermostats share, shown as the target for the whole house. */
export function commonTarget(entities: Entity[]) {
	const counts = new Map<number, number>();
	for (const { attributes } of thermostats(entities)) {
		counts.set(
			attributes.temperature,
			(counts.get(attributes.temperature) ?? 0) + 1,
		);
	}
	const [mostCommon] = [...counts].sort(([, a], [, b]) => b - a);
	return mostCommon?.[0];
}

const DEFAULT_TARGET_STEP = 0.5;

/** The thermostat's target moved one step up (1) or down (-1). */
export const steppedTarget = (thermostat: Thermostat, direction: 1 | -1) =>
	thermostat.attributes.temperature +
	direction * (thermostat.attributes.target_temp_step ?? DEFAULT_TARGET_STEP);
