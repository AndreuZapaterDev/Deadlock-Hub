FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
# shortcut: sin lockfile (primer arranque) cae a npm install; con lockfile es npm ci estricto.
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

FROM deps AS dev
ENV NODE_ENV=development NEXT_TELEMETRY_DISABLED=1
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0"]

FROM deps AS preview
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start"]
