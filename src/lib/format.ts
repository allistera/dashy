import { type Area, type Entity, nameOf } from "./home";

const LOCALE = "en-GB";

export const formatTime = (iso: string, timeZone: string) =>
	new Intl.DateTimeFormat(LOCALE, {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
		timeZone,
	}).format(new Date(iso));

export const formatDate = (iso: string, timeZone: string) =>
	new Intl.DateTimeFormat(LOCALE, {
		weekday: "long",
		day: "numeric",
		month: "long",
		timeZone,
	}).format(new Date(iso));

export const formatTemperature = (value: number) =>
	`${Math.round(value * 10) / 10}°`;

export const formatList = (items: string[]) =>
	new Intl.ListFormat(LOCALE).format(items);

export const plural = (count: number, noun: string) =>
	`${count} ${noun}${count === 1 ? "" : "s"}`;

/** "is" or "are", to follow a counted noun. */
export const isOrAre = (count: number) => (count === 1 ? "is" : "are");

/** "partlycloudy" and "clear-night" style states read as plain words. */
export const formatState = (state: string) => state.replaceAll(/[-_]/g, " ");

export const capitalize = (text: string) =>
	text.charAt(0).toUpperCase() + text.slice(1);

/** e.g. "the garage door has been open since 13:48". */
export const openSince = (entity: Entity, timeZone: string) =>
	`the ${nameOf(entity).toLowerCase()} has been open since ${formatTime(entity.last_changed, timeZone)}`;

/** Entity name without a leading area name, e.g. "Living room Floor lamp" -> "Floor lamp". */
export function shortNameOf(entity: Entity, area: Area) {
	const name = nameOf(entity);
	const prefix = `${area.name} `;
	return name.toLowerCase().startsWith(prefix.toLowerCase())
		? capitalize(name.slice(prefix.length))
		: name;
}
