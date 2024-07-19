# Here because we want to fetch the node_modules within docker so that it's
# installed on the same platform the test is run. Otherwise tools like `esbuild` will fail to run
FROM node:20-bullseye-slim

WORKDIR /app

COPY package.json ./
COPY ./packages ./packages
COPY ./interop ./interop

# disable colored output and CLI animation from test runners
ENV CI=true

RUN npm i
RUN npm run build

WORKDIR /app/interop

ENTRYPOINT npm test -- -t node
