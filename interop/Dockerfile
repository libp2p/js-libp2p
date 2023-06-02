FROM node:18
WORKDIR /app
COPY package.json .
COPY ./node_modules ./node_modules

WORKDIR /app/interop
COPY ./interop/node_modules ./node_modules

WORKDIR /app
COPY ./dist ./dist

WORKDIR /app/interop
COPY ./interop/dist ./dist

COPY ./interop/package.json .
COPY ./interop/.aegir.js .
COPY ./interop/relay.js .

ENTRYPOINT [ "npm", "test", "--", "--build", "false", "--types", "false", "-t", "node" ]
