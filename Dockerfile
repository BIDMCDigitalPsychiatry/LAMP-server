FROM ghcr.io/bidmcdigitalpsychiatry/lamp-server:2023.7.27

RUN npm install @sentry/node --save && npm cache clean --force

ADD tsconfig.json tsconfig.json

ADD src/app.ts src/app.ts
ADD src/applySentry.ts src/applySentry.ts
ADD src/utils/instrument.ts src/utils/instrument.ts
ADD src/index.ts src/index.ts

RUN npx tsc --skipLibCheck

CMD [ "node", "-r", "source-map-support/register", "./build/src/index.js"]

