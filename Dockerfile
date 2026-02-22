FROM node:10.24.1-stretch

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

RUN mkdir -p /app/webdata_tmp

ENV NODE_ENV=production
ENV PORT=8091

EXPOSE 8091

CMD ["npm", "start"]
