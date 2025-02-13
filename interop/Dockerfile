# install node and browsers
FROM mcr.microsoft.com/playwright:v1.50.1

WORKDIR /app

COPY package.json ./
COPY ./packages ./packages
COPY ./interop ./interop

# disable coloured output and CLI animation from test runners
ENV CI=true

# install inside the container so any native deps will have the docker arch
RUN npm i

WORKDIR /app/interop

ENTRYPOINT npm test -- -t node -- --exit
