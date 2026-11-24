FROM node:22-alpine AS build
# Built from apps/web with its own lockfile, so Next traces from /app and emits
# .next/standalone/server.js. Building this from the repo root instead nests the
# output under .next/standalone/apps/web and breaks the CMD below.
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN mkdir -p public && npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
