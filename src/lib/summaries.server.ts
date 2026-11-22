import { chat } from "@tanstack/ai";
import { openaiText } from "@tanstack/ai-openai";
import { z } from "zod";
import { formatTime } from "./format";
import {
	type Entity,
	type Home,
	isOn,
	leakSensors,
	lowBatteries,
	nameOf,
	ofDomain,
	openEntrances,
	type Summaries,
	thermostats,
} from "./home";

const MODEL = "gpt-5.4-mini";
/** Bounds how often the model is called while the house keeps changing. */
const MIN_REQUEST_INTERVAL_MS = 30_000;

const INSTRUCTIONS = `You write the summary lines for a wall-mounted home dashboard.
For each page write:
- text: one or two short, calm, plain sentences (at most 30 words) describing the state relevant to that page.
- alert: one short sentence about the single most important thing on that page that needs attention, such as an open door, a leak, an unlocked lock or a low battery. Use an empty string when nothing does. Do not repeat it in text.
Pages: home is a whole-house overview; rooms covers which rooms are lit; heating covers targets and temperatures; security covers doors, locks, windows and leaks.
Use only the facts given and state them plainly, without guessing or hedging. Write times exactly as given. No greetings, questions or emojis.`;

const summarySchema = z.object({ text: z.string(), alert: z.string() });
const summariesSchema = z.object({
	home: summarySchema,
	rooms: summarySchema,
	heating: summarySchema,
	security: summarySchema,
}) satisfies z.ZodType<Summaries>;

const listeners = new Set<() => void>();
let cached: { facts: string; summaries: Summaries } | undefined;
let lastRequestAt = 0;
let isRequesting = false;

/**
 * What the model is told about the house. Readings are rounded so that small
 * temperature drift does not count as a change.
 */
function factsOf({ entities, areas, timeZone }: Home) {
	const roomNames = new Map(areas.map((area) => [area.id, area.name]));
	const roomOf = (entity: Entity) => roomNames.get(entity.area_id ?? "");
	const [weather] = ofDomain(entities, "weather");
	const people = ofDomain(entities, "person");
	const locks = ofDomain(entities, "lock");

	return {
		lightsOn: ofDomain(entities, "light")
			.filter(isOn)
			.map((light) => ({ name: nameOf(light), room: roomOf(light) })),
		open: openEntrances(entities).map((entity) => ({
			name: nameOf(entity),
			since: formatTime(entity.last_changed, timeZone),
		})),
		locks: locks.length,
		unlocked: locks.filter((lock) => lock.state !== "locked").map(nameOf),
		leaks: leakSensors(entities).filter(isOn).map(nameOf),
		lowBatteries: lowBatteries(entities).map((battery) => ({
			name: nameOf(battery),
			percent: battery.state,
		})),
		heating: thermostats(entities).map((thermostat) => ({
			name: roomOf(thermostat) ?? nameOf(thermostat),
			target: thermostat.attributes.temperature,
			current: Math.round(thermostat.attributes.current_temperature ?? 0),
		})),
		weather: weather && {
			condition: weather.state,
			temperature: Math.round(weather.attributes.temperature ?? 0),
		},
		peopleHome: people.filter((person) => person.state === "home").map(nameOf),
		peopleAway: people.filter((person) => person.state !== "home").map(nameOf),
	};
}

async function request(facts: string, home: Home) {
	isRequesting = true;
	lastRequestAt = Date.now();
	try {
		const summaries = await chat({
			adapter: openaiText(MODEL),
			// One standing conversation; also keys the provider's prompt cache.
			threadId: "dashboard-summaries",
			systemPrompts: [INSTRUCTIONS],
			messages: [
				{
					role: "user",
					content: `Time: ${formatTime(home.now, home.timeZone)}\nFacts: ${facts}`,
				},
			],
			outputSchema: summariesSchema,
		});
		cached = { facts, summaries };
		for (const listener of listeners) listener();
	} catch (error) {
		console.error("Could not write summaries:", error);
	} finally {
		isRequesting = false;
	}
}

/** Calls the listener whenever new summaries are written; returns a function that stops it. */
export function onSummariesWritten(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/**
 * Model-written summaries for the current state of the house, or undefined
 * while none match it: no OPENAI_API_KEY, a request in flight, or a failure.
 * Never returns summaries written for an earlier state.
 */
export function summariesFor(home: Home) {
	if (!process.env.OPENAI_API_KEY) return undefined;
	const facts = JSON.stringify(factsOf(home));
	if (cached?.facts === facts) return cached.summaries;

	const isDue = Date.now() - lastRequestAt >= MIN_REQUEST_INTERVAL_MS;
	if (!isRequesting && isDue) void request(facts, home);
	return undefined;
}
