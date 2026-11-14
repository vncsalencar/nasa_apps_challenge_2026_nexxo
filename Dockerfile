# Step 1: build the React app.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY web/package.json web/
COPY server/package.json server/
RUN npm ci
COPY web web
RUN npm run build -w web

# Step 2: the image that runs. It holds the server and the built React app.
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY web/package.json web/
COPY server/package.json server/
RUN npm ci --omit=dev -w server
COPY server/src server/src
COPY server/seed server/seed
COPY --from=build /app/web/dist web/dist

ENV PORT=3001
ENV DATABASE_PATH=/data/nexxo.db
ENV WEB_DIST=/app/web/dist
VOLUME /data
EXPOSE 3001
CMD ["node", "server/src/index.ts"]
