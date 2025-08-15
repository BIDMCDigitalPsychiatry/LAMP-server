FROM node:20.11-alpine
WORKDIR /usr/src/app

ARG BUILDTIME
ARG VERSION
ARG REVISION

ENV BUILDTIME=${BUILDTIME}
ENV VERSION=${VERSION}
ENV REVISION=${REVISION}

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "-r", "source-map-support/register", "./build/src/index.js"]