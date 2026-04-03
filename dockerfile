# syntax=docker/dockerfile:1

FROM node:24-alpine
WORKDIR .
COPY . .
RUN --mount=type=secret,id=BETTER_AUTH_SECRET,env=BETTER_AUTH_SECRET
RUN --mount=type=secret,id=DATABASE_URL,env=DATABASE_URL
RUN --mount=type=secret,id=ORIGIN,env=ORIGIN

CMD npm install;npm run build;node build
EXPOSE 3000