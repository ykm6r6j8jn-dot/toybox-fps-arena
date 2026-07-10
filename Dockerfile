FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.mjs ./server.mjs
COPY --from=build /app/gameplay-systems.mjs ./gameplay-systems.mjs
COPY --from=build /app/network-systems.mjs ./network-systems.mjs
COPY --from=build /app/combat-systems.mjs ./combat-systems.mjs
COPY --from=build /app/movement-systems.mjs ./movement-systems.mjs
COPY --from=build /app/ai-systems.mjs ./ai-systems.mjs
EXPOSE 5188
CMD ["npm", "start"]
