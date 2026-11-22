# Dashy

A home automation dashboard for Home Assistant, built from the design in
`Contemporary home automation dashboards.html`.

## Stack

- [TanStack Start](https://tanstack.com/start) (React 19, Vite 8, Nitro) for
  routing, server rendering and server functions.
- [Biome](https://biomejs.dev) for linting and formatting, plus `tsc` for type
  checking.
- [TanStack AI](https://tanstack.com/ai) with the OpenAI adapter for optional
  model-written summaries.
- Plain CSS with `light-dark()` colour tokens. No UI or CSS framework.

## Setup

Requires Node 22.12 or newer and pnpm.

```sh
pnpm install
cp .env.example .env   # then set HA_URL and HA_TOKEN
pnpm dev
```

`HA_TOKEN` is a long-lived access token, created in Home Assistant under your
profile's Security tab. It is only read on the server and never sent to the
browser.

### AI summaries (optional)

Set `OPENAI_API_KEY` in `.env` to have the headline sentence on the home, rooms,
heating and security pages written by an OpenAI model, using
[TanStack AI](https://tanstack.com/ai). Without a key the pages show built-in
sentences instead.

One request writes all four summaries. A new request is made only when the
state of the house changes (lights, doors, locks, targets, whole-degree
temperatures), at most once every 30 seconds. While a new summary is being
written the built-in sentence is shown, so a summary never describes an earlier
state. Entity and room names and their states are sent to OpenAI.

## Commands

| Command       | Purpose                                         |
| ------------- | ----------------------------------------------- |
| `pnpm dev`    | Development server                              |
| `pnpm lint`   | Biome lint and format check, then type check    |
| `pnpm format` | Apply Biome fixes and formatting                |
| `pnpm build`  | Production build into `.output`                 |
| `pnpm start`  | Run the production build (reads `.env` if present) |

## Pages

| Route            | Page                                                  |
| ---------------- | ----------------------------------------------------- |
| `/`              | Quiet glance: clock, summary, attention list, scenes  |
| `/rooms`         | All rooms, filterable by floor                        |
| `/rooms/$areaId` | One room: lights, blinds, heating, scenes             |
| `/heating`       | Whole-house target, modes and per-room temperatures   |
| `/security`      | Doors, locks, windows, leak sensors and alarm mode    |

## How it talks to Home Assistant

All requests go through two server functions in `src/lib/home.functions.ts`,
which call the Home Assistant REST API from `src/lib/ha.server.ts`:

- `getHome` reads `GET /api/states` and renders a template through
  `POST /api/template` to get areas, floors and the time zone, which the REST
  API does not expose directly. The root route loads it and refreshes it every
  five seconds.
- `callService` posts to `/api/services/<domain>/<service>` for the domains the
  dashboard controls (lights, covers, locks, climate, scenes, alarm panel).

Nothing is configured per entity. Rooms come from Home Assistant areas, and
entities are picked by domain and device class, so assign entities to areas and
set device classes in Home Assistant to shape the dashboard.

The dashboard has no login of its own: anyone who can reach it can control the
devices above. Keep it on a trusted network.

## Running with Docker

Every merge to `main` publishes an image for amd64 and arm64 to
`ghcr.io/allistera/dashy`, tagged `latest` and with the commit hash.

```sh
docker run -d --name dashy --restart unless-stopped \
  -p 3000:3000 --env-file .env ghcr.io/allistera/dashy:latest
```

`.env` holds `HA_URL`, `HA_TOKEN` and optionally `OPENAI_API_KEY`, as in
`.env.example`. Inside a container `homeassistant.local` may not resolve; use
Home Assistant's IP address in `HA_URL` if so.

## Theme

The theme follows the system setting until the toggle in the header is used;
the choice is then kept in `localStorage`.
