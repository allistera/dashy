import { createFileRoute } from "@tanstack/react-router";
import { Lead } from "../components/Lead";
import { PageHeader } from "../components/PageHeader";
import { Row } from "../components/Row";
import { StepperButton } from "../components/Stepper";
import {
	capitalize,
	formatState,
	formatTemperature,
	isOrAre,
	plural,
} from "../lib/format";
import {
	commonTarget,
	nameOf,
	steppedTarget,
	type Thermostat,
	thermostats,
} from "../lib/home";
import { useHome, useService } from "../lib/hooks";

/** A room further than this from its target is reported as off target. */
const TOLERANCE_DEGREES = 2;

export const Route = createFileRoute("/heating")({ component: HeatingPage });

function isOffTarget({ attributes }: Thermostat) {
	const current = attributes.current_temperature;
	return (
		current != null &&
		Math.abs(current - attributes.temperature) > TOLERANCE_DEGREES
	);
}

function HeatingPage() {
	const home = useHome();
	const callService = useService();
	const all = thermostats(home.entities);
	const target = commonTarget(home.entities);

	if (target === undefined) {
		return (
			<div className="page">
				<PageHeader />
				<p className="lead">No thermostats with a target temperature.</p>
			</div>
		);
	}

	const entityIds = all.map((thermostat) => thermostat.entity_id);
	// Only modes every thermostat supports can be applied to the whole house.
	const modes = (all[0]?.attributes.hvac_modes ?? []).filter((mode) =>
		all.every((thermostat) => thermostat.attributes.hvac_modes?.includes(mode)),
	);
	const offTarget = all.filter(isOffTarget).length;
	const areaNames = new Map(home.areas.map((area) => [area.id, area.name]));

	const stepAll = (direction: 1 | -1) => {
		for (const thermostat of all) {
			callService("climate", "set_temperature", {
				entity_id: thermostat.entity_id,
				temperature: steppedTarget(thermostat, direction),
			});
		}
	};

	return (
		<div className="page">
			<PageHeader />

			<main className="split">
				<div className="split-main">
					<h1 className="eyebrow">Heating target</h1>
					<div className="bar">
						<StepperButton
							large
							label="Lower target temperature"
							direction="minus"
							onClick={() => stepAll(-1)}
						/>
						<div className="display">{formatTemperature(target)}</div>
						<StepperButton
							large
							label="Raise target temperature"
							direction="plus"
							onClick={() => stepAll(1)}
						/>
					</div>
					<Lead page="heating">
						{offTarget === 0
							? "Every room is within two degrees of its target."
							: `${capitalize(plural(offTarget, "room"))} ${isOrAre(offTarget)} more than two degrees off target.`}
					</Lead>
					<div className="bar">
						{modes.map((mode) => (
							<button
								key={mode}
								type="button"
								className="chip"
								aria-pressed={all.every(({ state }) => state === mode)}
								onClick={() =>
									callService("climate", "set_hvac_mode", {
										entity_id: entityIds,
										hvac_mode: mode,
									})
								}
							>
								{capitalize(formatState(mode))}
							</button>
						))}
					</div>
				</div>

				<section className="split-side section">
					<h2 className="eyebrow">By room</h2>
					<div>
						{all.map((thermostat) => {
							const current = thermostat.attributes.current_temperature;
							return (
								<Row
									key={thermostat.entity_id}
									title={
										areaNames.get(thermostat.area_id ?? "") ??
										nameOf(thermostat)
									}
								>
									{current != null && (
										<span className="reading">
											{formatTemperature(current)}
										</span>
									)}
									<span className="row-detail">
										target{" "}
										{formatTemperature(thermostat.attributes.temperature)}
									</span>
								</Row>
							);
						})}
					</div>
				</section>
			</main>
		</div>
	);
}
