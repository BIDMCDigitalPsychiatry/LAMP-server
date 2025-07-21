FROM node:latest
ENV NODE_ENV=development
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install -g ts-node
RUN npm install && npm cache clean --force
COPY . .

COPY .env .
EXPOSE 3006
RUN chown -R node /usr/src/app
USER node
CMD ["npm", "start"]