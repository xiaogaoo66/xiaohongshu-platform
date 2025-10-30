# Root-level Dockerfile that builds the backend service
# This avoids path issues on Railway by keeping the build context at repo root

FROM node:18-bullseye-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Install deps for backend (no lockfile, use npm install)
COPY backend/package*.json ./
RUN npm install

# Copy backend source and build
COPY backend/ .
RUN npx prisma generate && npm run build

FROM node:18-bullseye-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY backend/package*.json ./
COPY backend/prisma ./prisma

EXPOSE 3000
CMD ["sh","-c","npx prisma migrate deploy && node dist/main.js"]


