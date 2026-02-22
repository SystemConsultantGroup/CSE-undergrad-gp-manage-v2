FROM node:16-bullseye

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends bzip2 \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --production

COPY . .

RUN mkdir -p /app/webdata_tmp

ENV NODE_ENV=production
ENV PORT=8091

EXPOSE 8091

CMD ["npm", "start"]
