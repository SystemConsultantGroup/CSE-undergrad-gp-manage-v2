# -- build stage --
FROM node:22-bookworm-slim AS build

WORKDIR /app

RUN npm install -g pnpm@9

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY . .

RUN pnpm run build:css

# -- production stage --
FROM node:22-bookworm-slim

WORKDIR /app

RUN npm install -g pnpm@9

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

COPY --from=build /app/public/css/main.css public/css/main.css
COPY . .

RUN mkdir -p /app/webdata_tmp

ENV NODE_ENV=production
ENV TZ=Asia/Seoul
ENV PORT=8091

EXPOSE 8091

CMD ["pnpm", "start"]
