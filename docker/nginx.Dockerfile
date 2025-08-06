# Build front
FROM node:20-slim as front-builder
WORKDIR /app
COPY front-office/package*.json ./
COPY front-office/.npmrc .npmrc
COPY infra/.env .env
COPY infra/scripts/*.js ./
RUN npm install dotenv && node setup-npmrc.js && npm run use:shared:prod && npm install
COPY front-office ./
RUN npm run build

# Build back
FROM node:20-slim as back-builder
WORKDIR /app
COPY back-office/package*.json ./
COPY back-office/.npmrc .npmrc
COPY infra/.env .env
COPY infra/scripts/*.js ./
RUN npm install dotenv && node setup-npmrc.js && npm run use:shared:prod && npm install
COPY back-office ./
RUN npm run build

# Final nginx image
FROM nginx:alpine
COPY --from=front-builder /app/dist /usr/share/nginx/html/
COPY --from=back-builder /app/dist /usr/share/nginx/html/back/
COPY infra/nginx/default.conf /etc/nginx/conf.d/default.conf
