import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../components/PageHeader";
import { Row } from "../components/Row";
import {
	capitalize,
	formatList,
	formatState,
	formatTime,
	openSince,
} from "../lib/format";
import {
	domainOf,
	doorSensors,
	type Entity,
	gates,
	isGate,
	isOn,
	isOpen,
	leakSensors,
	lowBatteries,
	nameOf,
	ofDomain,
	openEntrances,
	windowSensors,
} from "../lib/home";
import { useHome, useService } from "../lib/hooks";

const ALARM_MODES = [
	{ label: "Off", state: "disarmed", service: "alarm_disarm" },
	{ label: "Home", state: "armed_home", service: "alarm_arm_home" },
	{ label: "Away", state: "armed_away", service: "alarm_arm_away" },
	{ label: "Night", state: "armed_night", service: "alarm_arm_night" },
];

export const Route = createFileRoute("/security")({ component: SecurityPage });

/** Contact sensors report on/off; everything else has a readable state. */
function stateLabel(entity: Entity) {
	if (domainOf(entity) !== "binary_sensor") {
		return capitalize(formatState(entity.state));
	}
	return isOn(entity) ? "Open" : "Closed";
}

function SecurityPage() {
	const home = useHome();
	const callService = useService();
	const { entities, timeZone } = home;
	const open = openEntrances(entities);
	const [firstOpen] = open;
	const locks = ofDomain(entities, "lock");
	const unlocked = locks.filter((lock) => lock.state !== "locked");
	const windows = windowSensors(entities);
	const openWindows = windows.filter(isOn);
	const leaks = leakSensors(entities);
	const wet = leaks.filter(isOn);
	const batteries = lowBatteries(entities);
	const [alarm] = ofDomain(entities, "alarm_control_panel");

	const closeCover = (cover: Entity) =>
		callService("cover", "close_cover", { entity_id: cover.entity_id });
	const since = (entity: Entity) =>
		`${stateLabel(entity)} since ${formatTime(entity.last_changed, timeZone)}`;

	const facts = [
		...(locks.length > 0
			? [
					unlocked.length === 0
						? "every lock is locked"
						: `${formatList(unlocked.map(nameOf))} unlocked`,
				]
			: []),
		...(windows.length > 0 && openWindows.length === 0
			? ["every window is shut"]
			: []),
	];

	return (
		<div className="page">
			<PageHeader />

			<main className="split">
				<div className="split-main">
					<h1 className="eyebrow">Doors and windows</h1>
					<div className="display">{open.length} open</div>
					<p className="lead">
						{firstOpen && (
							<span className="alert">
								{capitalize(openSince(firstOpen, timeZone))}.{" "}
							</span>
						)}
						{facts.length > 0 && `${capitalize(formatList(facts))}.`}
					</p>
					{firstOpen && isGate(firstOpen) && (
						<button
							type="button"
							className="button accent large"
							onClick={() => closeCover(firstOpen)}
						>
							Close {nameOf(firstOpen).toLowerCase()}
						</button>
					)}
				</div>

				<div className="split-side">
					<section className="section">
						<h2 className="eyebrow">Doors</h2>
						<div>
							{gates(entities).map((gate) => (
								<Row
									key={gate.entity_id}
									title={nameOf(gate)}
									detail={since(gate)}
									alert={isOpen(gate)}
								>
									{isOpen(gate) ? (
										<button
											type="button"
											className="button accent"
											onClick={() => closeCover(gate)}
										>
											Close
										</button>
									) : (
										<button
											type="button"
											className="button"
											onClick={() =>
												callService("cover", "open_cover", {
													entity_id: gate.entity_id,
												})
											}
										>
											Open
										</button>
									)}
								</Row>
							))}
							{locks.map((lock) => {
								const locked = lock.state === "locked";
								return (
									<Row
										key={lock.entity_id}
										title={nameOf(lock)}
										detail={since(lock)}
										alert={!locked}
									>
										<button
											type="button"
											className="button"
											onClick={() =>
												callService("lock", locked ? "unlock" : "lock", {
													entity_id: lock.entity_id,
												})
											}
										>
											{locked ? "Unlock" : "Lock"}
										</button>
									</Row>
								);
							})}
							{doorSensors(entities).map((door) => (
								<Row
									key={door.entity_id}
									title={nameOf(door)}
									detail={since(door)}
									alert={isOn(door)}
								/>
							))}
						</div>
					</section>

					<section className="section">
						<h2 className="eyebrow">Windows and sensors</h2>
						<div>
							{windows.length > 0 && (
								<Row title="Windows">
									{openWindows.length === 0 ? (
										<span className="row-detail">All shut</span>
									) : (
										<span className="row-detail alert">
											{formatList(openWindows.map(nameOf))} open
										</span>
									)}
								</Row>
							)}
							{leaks.length > 0 && (
								<Row title="Leak sensors">
									{wet.length === 0 ? (
										<span className="row-detail">All dry</span>
									) : (
										<span className="row-detail alert">
											{formatList(wet.map(nameOf))} wet
										</span>
									)}
								</Row>
							)}
							{batteries.map((battery) => (
								<Row key={battery.entity_id} title={nameOf(battery)}>
									<span className="row-detail alert">
										Battery at {battery.state}%
									</span>
								</Row>
							))}
						</div>
					</section>
				</div>
			</main>

			{alarm && (
				<div className="bar">
					<span className="eyebrow">Alarm mode</span>
					{ALARM_MODES.map(({ label, state, service }) => (
						<button
							key={state}
							type="button"
							className="chip large"
							aria-pressed={alarm.state === state}
							onClick={() =>
								callService("alarm_control_panel", service, {
									entity_id: alarm.entity_id,
								})
							}
						>
							{label}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
