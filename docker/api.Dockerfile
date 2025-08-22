# Étape 1 : Build TS
FROM node:20-slim AS builder
WORKDIR /app
COPY api/package*.json ./
RUN npm install
COPY api/prisma ./prisma
RUN npm run prisma:generate
COPY api .
RUN npm run build

# Étape 2 : Run en prod
FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma /app/node_modules/@prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY infra/.env .env
COPY api/package*.json ./
RUN npm install --omit=dev
RUN apt-get update -y && apt-get install -y openssl
RUN npm run prisma:generate
EXPOSE 3000
