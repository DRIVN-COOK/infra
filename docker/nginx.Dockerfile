# Build front
FROM node:20-slim AS front-builder

WORKDIR /app
COPY front-office/package*.json ./
COPY front-office/.npmrc .npmrc
COPY infra/.env .env
COPY infra/scripts/*.js ./

RUN --mount=type=secret,id=npm_token \
    bash -lc 'token=$(cat /run/secrets/npm_token) \
      && npm config set @drivn-cook:registry https://npm.pkg.github.com \
      && npm config set //npm.pkg.github.com/:_authToken "$token" \
      && npm config set always-auth true \
      && npm ci --ignore-scripts \
      && npm config delete //npm.pkg.github.com/:_authToken || true'

RUN npm run use:shared:prod && npm install
COPY front-office ./
RUN npm run build   

# Build back
FROM node:20-slim AS back-builder
WORKDIR /app
COPY back-office/package*.json ./
COPY back-office/.npmrc .npmrc
COPY infra/.env .env
COPY infra/scripts/*.js ./

RUN --mount=type=secret,id=npm_token \
    bash -lc 'token=$(cat /run/secrets/npm_token) \
      && npm config set @drivn-cook:registry https://npm.pkg.github.com \
      && npm config set //npm.pkg.github.com/:_authToken "$token" \
      && npm config set always-auth true \
      && npm ci --ignore-scripts \
      && npm config delete //npm.pkg.github.com/:_authToken || true'

RUN npm run use:shared:prod && npm install
COPY back-office ./
RUN npm run build

# Final nginx image
FROM nginx:alpine
COPY --from=front-builder /app/dist /usr/share/nginx/html/
COPY --from=back-builder /app/dist /usr/share/nginx/html/back/
COPY infra/nginx/default.conf.template /etc/nginx/conf.d/default.conf.template
CMD ["/bin/sh", "-c", "envsubst '$NGINX_PORT $NGINX_SERVER_NAME $PORT_API' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
