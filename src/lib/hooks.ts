import { getRouteApi, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { callService, type ServiceCall } from "./home.functions";

const MINUTE_MS = 60_000;
const CLOCK_CHECK_MS = 1000;

const rootRoute = getRouteApi("__root__");

/** The latest Home Assistant snapshot, loaded by the root route. */
export const useHome = () => rootRoute.useLoaderData();

const currentMinute = () =>
	new Date(Math.floor(Date.now() / MINUTE_MS) * MINUTE_MS).toISOString();

/** The current time to the minute; starts at the snapshot's time so server and browser render alike. */
export function useNow() {
	const [now, setNow] = useState(useHome().now);

	useEffect(() => {
		// Setting an unchanged minute does not re-render.
		const tick = () => setNow(currentMinute());
		tick();
		const timer = setInterval(tick, CLOCK_CHECK_MS);
		return () => clearInterval(timer);
	}, []);

	return now;
}

/**
 * Returns a function that calls a Home Assistant service and resolves once
 * the snapshot has been reloaded, whether or not the call succeeded.
 */
export function useService() {
	const router = useRouter();
	const call = useServerFn(callService);

	return async (domain: string, service: string, data: ServiceCall["data"]) => {
		try {
			await call({ data: { domain, service, data } });
		} catch (error) {
			console.error(error);
		}
		await router.invalidate();
	};
}
