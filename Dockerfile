# Build the SPA, then serve it from nginx. nginx also proxies /api and /hubs to the gateway,
# so the browser only ever talks to one origin.
FROM node:22-alpine AS build
WORKDIR /app

# Dependencies only. Scripts are skipped because the postinstall "quasar prepare" needs the
# whole project; quasar build regenerates .quasar itself once the source is copied in.
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npx quasar build

FROM nginx:1.27-alpine AS final
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/spa /usr/share/nginx/html
EXPOSE 80
