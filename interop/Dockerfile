FROM node:20

WORKDIR /app
COPY package.json .
COPY ./node_modules ./node_modules
COPY ./packages ./packages
COPY ./interop ./interop

WORKDIR /app/interop

# disable colored output and CLI animation from test runners
ENV CI true
ENV DEBUG libp2p*

ENTRYPOINT [ "npm", "run", "test:interop:multidim", "--", "--build", "false", "--types", "false", "-t", "node" ]
