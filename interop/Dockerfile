# syntax=docker/dockerfile:1

# FROM node:18 AS builder

# WORKDIR /app
# COPY package.json .
# COPY package-lock.json .
# RUN npm ci
# WORKDIR /app/interop
# COPY ./interop/package.json .
# COPY ./interop/package-lock.json .
# RUN npm ci

# FROM node:18

# WORKDIR /app
# COPY . .
# COPY --from=builder /app/node_modules /app/node_modules
# RUN npm run build
# WORKDIR /app/interop
# COPY --from=builder /app/interop/node_modules /app/interop/node_modules
# RUN npm run build

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

ENTRYPOINT [ "npm", "test", "--", "--build", "false", "--types", "false", "-t", "node" ]
