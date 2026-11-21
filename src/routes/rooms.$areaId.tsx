import { createFileRoute, Link } from "@tanstack/react-router";
import type { SyntheticEvent } from "react";
import { Icon } from "../components/Icon";
import { PageHeader } from "../components/PageHeader";
import { Row } from "../components/Row";
import { StepperButton } from "../components/Stepper";
import { Switch } from "../components/Switch";
import {
	capitalize,
	formatState,
	formatTemperature,
	isOrAre,
	plural,
	shortNameOf,
} from "../lib/format";
import {
	type Entity,
	inArea,
	isOn,
	ofDomain,
	steppedTarget,
	temperatureOf,
	thermostats,
} from "../lib/home";
import { useHome, useService } from "../lib/hooks";

/** Home Assistant reports brightness on a 0-255 scale. */
const MAX_BRIGHTNESS = 255;

export const Route = createFileRoute("/rooms/$areaId")({
	component: RoomPage,
});

const brightnessPercent = (light: Entity) =>
	light.attributes.brightness == null
		? undefined
		: Math.round((light.attributes.brightness / MAX_BRIGHTNESS) * 100);

function BrightnessSlider({ light, label }: { light: Entity; label: string }) {
	const callService = useService();
	const percent = brightnessPercent(light);
	if (percent === undefined) return null;

	// Sends the brightness once the drag or key press ends, not on every step.
	const commit = (event: SyntheticEvent<HTMLInputElement>) =>
		callService("light", "turn_on", {
			entity_id: light.entity_id,
			brightness_pct: Number(event.currentTarget.value),
		});

	return (
		<input
			// Remounts when Home Assistant reports a new brightness.
			key={percent}
			type="range"
			className="slider"
			min={1}
			max={100}
			defaultValue={percent}
			aria-label={label}
			onPointerUp={commit}
			onKeyUp={commit}
		/>
	);
}

function RoomPage() {
	const home = useHome();
	const callService = useService();
	const { areaId } = Route.useParams();
	const area = home.areas.find(({ id }) => id === areaId);

	if (!area) {
		return (
			<div className="page">
				<PageHeader />
				<p className="lead">This room does not exist.</p>
			</div>
		);
	}

	const entities = inArea(home.entities, area.id);
	const lights = ofDomain(entities, "light");
	const covers = ofDomain(entities, "cover");
	const heating = thermostats(entities);
	const scenes = ofDomain(entities, "scene");
	const temperature = temperatureOf(entities);
	const lightsOn = lights.filter(isOn).length;

	return (
		<div className="page">
			<PageHeader />

			<main className="split">
				<div className="split-main">
					<Link to="/rooms" className="link muted">
						<Icon name="back" />
						All rooms
					</Link>
					<h1 className="eyebrow">{area.name}</h1>
					{temperature !== undefined && (
						<div className="display">{formatTemperature(temperature)}</div>
					)}
					{lights.length > 0 && (
						<p className="lead">
							{capitalize(plural(lightsOn, "light"))} {isOrAre(lightsOn)} on.
						</p>
					)}
				</div>

				<div className="split-side">
					{lights.length > 0 && (
						<section className="section">
							<h2 className="eyebrow">Lights</h2>
							<div>
								{lights.map((light) => {
									const name = shortNameOf(light, area);
									const percent = brightnessPercent(light);
									const on = isOn(light);
									const level = percent === undefined ? "On" : `${percent}%`;
									return (
										<Row
											key={light.entity_id}
											title={name}
											detail={on ? level : "Off"}
										>
											<BrightnessSlider
												light={light}
												label={`${name} brightness`}
											/>
											<Switch
												label={name}
												on={on}
												onChange={(turnOn) =>
													callService(
														"light",
														turnOn ? "turn_on" : "turn_off",
														{ entity_id: light.entity_id },
													)
												}
											/>
										</Row>
									);
								})}
							</div>
						</section>
					)}

					{covers.length + heating.length > 0 && (
						<section className="section">
							<h2 className="eyebrow">Blinds and heating</h2>
							<div>
								{covers.map((cover) => {
									const position = cover.attributes.current_position;
									return (
										<Row
											key={cover.entity_id}
											title={shortNameOf(cover, area)}
											detail={
												position === undefined
													? capitalize(formatState(cover.state))
													: `Open ${position}%`
											}
										>
											{(["open", "close"] as const).map((action) => (
												<button
													key={action}
													type="button"
													className="button"
													onClick={() =>
														callService("cover", `${action}_cover`, {
															entity_id: cover.entity_id,
														})
													}
												>
													{capitalize(action)}
												</button>
											))}
										</Row>
									);
								})}
								{heating.map((thermostat) => {
									const name = shortNameOf(thermostat, area);
									const setTarget = (direction: 1 | -1) =>
										callService("climate", "set_temperature", {
											entity_id: thermostat.entity_id,
											temperature: steppedTarget(thermostat, direction),
										});
									return (
										<Row
											key={thermostat.entity_id}
											title={name}
											detail={`Target ${formatTemperature(thermostat.attributes.temperature)}`}
										>
											<StepperButton
												label={`Lower ${name} target`}
												direction="minus"
												onClick={() => setTarget(-1)}
											/>
											<StepperButton
												label={`Raise ${name} target`}
												direction="plus"
												onClick={() => setTarget(1)}
											/>
										</Row>
									);
								})}
							</div>
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
						{shortNameOf(scene, area)}
					</button>
				))}
				{lights.length > 0 && (
					<button
						type="button"
						className="chip large push"
						onClick={() =>
							callService("light", "turn_off", { area_id: area.id })
						}
					>
						<Icon name="power" />
						Turn room off
					</button>
				)}
			</div>
		</div>
	);
}
