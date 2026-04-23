# syntax=docker/dockerfile:1

# ── deps: install node_modules once, reused by all stages ─────────────────────
FROM node:20-alpine AS deps

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── dev: Vite dev server with hot-reload ──────────────────────────────────────
FROM deps AS dev

COPY . .
EXPOSE 5173
# --host 0.0.0.0 makes Vite listen on all interfaces so the host can reach it
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ── builder: compile static assets ────────────────────────────────────────────
FROM deps AS builder

# VITE_ vars must be available at build time (they are inlined into the JS bundle)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY . .
RUN npm run build

# ── prod: Nginx serving compiled static files ──────────────────────────────────
FROM nginx:1.27-alpine AS prod

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
