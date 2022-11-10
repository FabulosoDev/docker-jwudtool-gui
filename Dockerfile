FROM node:16.17-alpine as build

WORKDIR /node

COPY package.json package.json
RUN npm install

FROM node:16.17-alpine

RUN apk --no-cache add openjdk8-jre
RUN apk --no-cache add curl

COPY --from=build /node /
COPY src src
COPY jwudtool jwudtool

CMD ["npm", "start"]
