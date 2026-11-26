FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000 NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S skanda && adduser -S skanda -G skanda
COPY --from=builder --chown=skanda:skanda /app/.next/standalone ./
COPY --from=builder --chown=skanda:skanda /app/.next/static ./.next/static
USER skanda
EXPOSE 3000
CMD ["node", "server.js"]
