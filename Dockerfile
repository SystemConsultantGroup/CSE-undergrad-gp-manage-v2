FROM node:22-bookworm-slim

WORKDIR /app

RUN npm install -g pnpm@9

COPY package.json pnpm-lock.yaml ./
RUN HUSKY=0 pnpm install --frozen-lockfile --prod

COPY . .

RUN mkdir -p /app/webdata_tmp

ENV NODE_ENV=production
ENV PORT=8091

EXPOSE 8091

CMD ["pnpm", "start"]
