# Dockerfile
FROM node:14

WORKDIR /app

COPY package*.json ./
RUN mkdir dist
RUN yarn install

COPY . .

EXPOSE 3000

CMD ["yarn", "start"]
