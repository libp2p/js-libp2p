# Here because we want to fetch the node_modules within docker so that it's
# installed on the same platform the test is run. Otherwise tools like `esbuild` will fail to run
FROM node:22-bullseye-slim

WORKDIR /app

COPY package*.json .aegir.js tsconfig.json ./
COPY src ./src
COPY test ./test

RUN npm ci
RUN npm run build

ENTRYPOINT npm test -- -t node
