FROM node:22-bookworm-slim

WORKDIR /app

RUN corepack enable pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY . .

RUN mkdir -p /app/webdata_tmp

ENV NODE_ENV=production
ENV PORT=8091

EXPOSE 8091

CMD ["pnpm", "start"]
