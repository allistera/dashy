import { getRouteApi, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { callService, type ServiceCall } from "./home.functions";

const rootRoute = getRouteApi("__root__");

/** The latest Home Assistant snapshot, loaded by the root route. */
export const useHome = () => rootRoute.useLoaderData();

/** Returns a function that calls a Home Assistant service and then refreshes the snapshot. */
export function useService() {
	const router = useRouter();
	const call = useServerFn(callService);

	return (domain: string, service: string, data: ServiceCall["data"]): void => {
		call({ data: { domain, service, data } })
			.catch((error: unknown) => console.error(error))
			.finally(() => router.invalidate());
	};
}
