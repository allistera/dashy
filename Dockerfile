# syntax=docker/dockerfile:1

# The build output is plain JavaScript, so it is built once on the build
# machine's own architecture and copied into each target image.
FROM --platform=$BUILDPLATFORM node:24-slim AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
# Installs the pnpm version named in package.json.
RUN npm install --global "$(node -p "require('./package.json').packageManager")"
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:24-slim
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=build /app/.output ./.output
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
