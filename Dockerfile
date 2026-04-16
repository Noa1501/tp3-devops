# ==============================
# STAGE 1 : Builder
# ==============================
FROM node:20-alpine3.21 AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Supprime les devDependencies
RUN npm prune --production

# ==============================
# STAGE 2 : Production
# ==============================
# alpine brut = 7 MB au lieu de 130 MB avec node:20-alpine
# On installe uniquement le binaire node, pas npm/npx/yarn
FROM alpine:3.21 AS production
RUN apk add --no-cache nodejs
RUN apk upgrade --no-cache
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/package.json ./

USER appuser

EXPOSE 3000
ENV NODE_ENV=production

# wget est dispo sur alpine, pas besoin de l'installer séparément
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]