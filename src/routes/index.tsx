import { createFileRoute, Link } from "@tanstack/react-router";
import { Icon } from "../components/Icon";
import { Row } from "../components/Row";
import { ThemeToggle } from "../components/ThemeToggle";
import {
	capitalize,
	formatDate,
	formatList,
	formatState,
	formatTemperature,
	formatTime,
	isOrAre,
	openSince,
	plural,
} from "../lib/format";
import {
	commonTarget,
	type Entity,
	type Home,
	isGate,
	isOn,
	lowBatteries,
	nameOf,
	ofDomain,
	openEntrances,
} from "../lib/home";
import { useHome, useService } from "../lib/hooks";

const UPCOMING_LIMIT = 3;

export const Route = createFileRoute("/")({ component: QuietPage });

function weatherText(entities: Entity[]) {
	const [weather] = ofDomain(entities, "weather");
	if (!weather) return undefined;
	const condition = formatState(weather.state);
	const { temperature } = weather.attributes;
	return temperature == null
		? condition
		: `${formatTemperature(temperature)} and ${condition}`;
}

function presenceText(entities: Entity[]) {
	const people = ofDomain(entities, "person");
	const home = people.filter((person) => person.state === "home");
	if (people.length === 0) return undefined;
	if (home.length === people.length) return "Everyone home";
	if (home.length === 0) return "Nobody home";
	return `${formatList(home.map(nameOf))} home`;
}

/** Sunrise, sunset and the next change of each schedule helper, soonest first. */
function upcomingEvents(entities: Entity[]) {
	const [sun] = ofDomain(entities, "sun");
	return [
		{ label: "Sunset", at: sun?.attributes.next_setting },
		{ label: "Sunrise", at: sun?.attributes.next_rising },
		...ofDomain(entities, "schedule").map((schedule) => ({
			label: nameOf(schedule),
			at: schedule.attributes.next_event,
		})),
	]
		.flatMap(({ label, at }) => (at ? [{ label, at }] : []))
		.sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
		.slice(0, UPCOMING_LIMIT);
}

function Summary({ home }: { home: Home }) {
	const target = commonTarget(home.entities);
	const lightsOn = ofDomain(home.entities, "light").filter(isOn).length;
	const [open] = openEntrances(home.entities);
	const facts = [
		...(target === undefined
			? []
			: [`heating is holding ${formatTemperature(target)}`]),
		`${plural(lightsOn, "light")} ${isOrAre(lightsOn)} on`,
	];

	return (
		<p className="lead">
			{open ? "Mostly quiet. " : "All quiet. "}
			{capitalize(formatList(facts))}
			{open ? (
				<>
					, but <span className="alert">{openSince(open, home.timeZone)}.</span>
				</>
			) : (
				"."
			)}
		</p>
	);
}

function QuietPage() {
	const home = useHome();
	const callService = useService();
	const { entities, now, timeZone } = home;
	const open = openEntrances(entities);
	const batteries = lowBatteries(entities);
	const upcoming = upcomingEvents(entities);
	const scenes = ofDomain(entities, "scene").filter((scene) => !scene.area_id);
	const [sun] = ofDomain(entities, "sun");
	const sunEvent =
		sun?.state === "above_horizon"
			? { label: "Sunset", at: sun.attributes.next_setting }
			: { label: "Sunrise", at: sun?.attributes.next_rising };

	return (
		<div className="page">
			<header className="header">
				<div className="meta">
					<span className="brand">Home</span>
					<span>{formatDate(now, timeZone)}</span>
				</div>
				<div className="meta">
					<span>{weatherText(entities)}</span>
					{sunEvent.at && (
						<span>
							{sunEvent.label} {formatTime(sunEvent.at, timeZone)}
						</span>
					)}
					<span>{presenceText(entities)}</span>
					<ThemeToggle />
				</div>
			</header>

			<main className="split">
				<div className="split-main">
					<div className="display clock">{formatTime(now, timeZone)}</div>
					<Summary home={home} />
				</div>

				<div className="split-side">
					<section className="section">
						<h2 className="eyebrow">Needs attention</h2>
						<div>
							{open.map((entity) => (
								<Row
									key={entity.entity_id}
									title={`${nameOf(entity)} open`}
									detail={`Since ${formatTime(entity.last_changed, timeZone)}`}
								>
									{isGate(entity) && (
										<button
											type="button"
											className="button accent"
											onClick={() =>
												callService("cover", "close_cover", {
													entity_id: entity.entity_id,
												})
											}
										>
											Close
										</button>
									)}
								</Row>
							))}
							{batteries.map((battery) => (
								<Row
									key={battery.entity_id}
									title={nameOf(battery)}
									detail={`Battery at ${battery.state}%`}
								/>
							))}
							{open.length + batteries.length === 0 && (
								<Row title="Nothing right now" />
							)}
						</div>
					</section>

					{upcoming.length > 0 && (
						<section className="section">
							<h2 className="eyebrow">Coming up</h2>
							{upcoming.map(({ label, at }) => (
								<div key={label} className="timeline">
									<time dateTime={at}>{formatTime(at, timeZone)}</time>
									<span>{label}</span>
								</div>
							))}
						</section>
					)}
				</div>
			</main>

			<div className="bar">
				{scenes.map((scene) => (
					<button
						key={scene.entity_id}
						type="button"
						className="chip large"
						onClick={() =>
							callService("scene", "turn_on", { entity_id: scene.entity_id })
						}
					>
						{nameOf(scene)}
					</button>
				))}
				<Link to="/rooms" className="link push">
					All rooms
					<Icon name="forward" />
				</Link>
			</div>
		</div>
	);
}
