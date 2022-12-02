FROM node:16.17-alpine as build

WORKDIR /node

COPY package.json package.json

RUN npm install

FROM alpine:3.16

RUN apk add --update nodejs openjdk11-jre

COPY --from=build /node /
COPY src src
COPY jwudtool jwudtool
COPY jcdecrypt2 jcdecrypt2
COPY nuspacker nuspacker

CMD ["node", "src/app.js"]
