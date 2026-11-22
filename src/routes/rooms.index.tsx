import { createFileRoute, Link } from "@tanstack/react-router";
import { Icon } from "../components/Icon";
import { Lead } from "../components/Lead";
import { PageHeader } from "../components/PageHeader";
import { Switch } from "../components/Switch";
import {
	formatList,
	formatTemperature,
	formatTime,
	isOrAre,
	openSince,
	plural,
	shortNameOf,
} from "../lib/format";
import {
	type Area,
	gates,
	inArea,
	isOn,
	isOpen,
	lowBatteries,
	ofDomain,
	openEntrances,
	temperatureOf,
} from "../lib/home";
import { useHome, useService } from "../lib/hooks";

export const Route = createFileRoute("/rooms/")({
	validateSearch: (search: Record<string, unknown>): { floor?: string } =>
		typeof search.floor === "string" ? { floor: search.floor } : {},
	component: RoomsPage,
});

function RoomRow({ area }: { area: Area }) {
	const home = useHome();
	const callService = useService();
	const entities = inArea(home.entities, area.id);
	const lights = ofDomain(entities, "light");
	const lit = lights.filter(isOn);
	const openGate = gates(entities).find(isOpen);
	const [battery] = lowBatteries(entities);
	const temperature = temperatureOf(entities);

	let detail = lights.length > 0 ? "Dark" : undefined;
	if (openGate) {
		detail = `${shortNameOf(openGate, area)} open since ${formatTime(openGate.last_changed, home.timeZone)}`;
	} else if (battery) {
		detail = `${shortNameOf(battery, area)} at ${battery.state}%`;
	} else if (lit.length > 0) {
		detail = `${formatList(lit.map((light) => shortNameOf(light, area)))} on`;
	}

	return (
		<div className="row">
			<Link
				to="/rooms/$areaId"
				params={{ areaId: area.id }}
				className="row-text"
			>
				<span className="row-title">{area.name}</span>
				{detail && (
					<span
						className={openGate || battery ? "row-detail alert" : "row-detail"}
					>
						{detail}
					</span>
				)}
			</Link>
			{temperature !== undefined && (
				<span className="reading">{formatTemperature(temperature)}</span>
			)}
			{openGate ? (
				<button
					type="button"
					className="button accent"
					onClick={() =>
						callService("cover", "close_cover", {
							entity_id: openGate.entity_id,
						})
					}
				>
					Close
				</button>
			) : (
				lights.length > 0 && (
					<Switch
						label={`${area.name} lights`}
						on={lit.length > 0}
						onChange={(on) =>
							callService("light", on ? "turn_on" : "turn_off", {
								area_id: area.id,
							})
						}
					/>
				)
			)}
		</div>
	);
}

function RoomsPage() {
	const home = useHome();
	const callService = useService();
	const { floor } = Route.useSearch();
	const floors = [
		...new Set(home.areas.flatMap((area) => (area.floor ? [area.floor] : []))),
	];
	const areas = floor
		? home.areas.filter((area) => area.floor === floor)
		: home.areas;
	const litRooms = home.areas.filter((area) =>
		ofDomain(inArea(home.entities, area.id), "light").some(isOn),
	).length;
	const [open] = openEntrances(home.entities);

	return (
		<div className="page">
			<PageHeader />

			<div className="bar spread">
				<div className="section">
					<h1 className="eyebrow">Rooms</h1>
					<Lead page="rooms">
						{litRooms === 0
							? "The whole house is dark"
							: `${plural(litRooms, "room")} ${isOrAre(litRooms)} lit`}
						{open ? (
							<>
								, and{" "}
								<span className="alert">{openSince(open, home.timeZone)}.</span>
							</>
						) : (
							"."
						)}
					</Lead>
				</div>
				{floors.length > 0 && (
					<div className="bar">
						<Link to="/rooms" className={floor ? "chip" : "chip selected"}>
							All
						</Link>
						{floors.map((name) => (
							<Link
								key={name}
								to="/rooms"
								search={{ floor: name }}
								className={name === floor ? "chip selected" : "chip"}
							>
								{name}
							</Link>
						))}
					</div>
				)}
			</div>

			<div className="rooms">
				{areas.map((area) => (
					<RoomRow key={area.id} area={area} />
				))}
			</div>

			<div className="bar">
				<button
					type="button"
					className="chip large"
					onClick={() => callService("light", "turn_off", { entity_id: "all" })}
				>
					<Icon name="power" />
					Turn everything off
				</button>
			</div>
		</div>
	);
}
