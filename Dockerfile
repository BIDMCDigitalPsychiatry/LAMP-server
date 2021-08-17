FROM node:16-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN apk add --upgrade apk-tools
EXPOSE 3000
CMD ["node", "-r", "source-map-support/register", "./build/src/index.js"]
