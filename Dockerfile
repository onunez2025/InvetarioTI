# ═══════════════════════════════════════════════════════════════════════════════
# Etapa 1: build del Frontend (React + Vite)
# ═══════════════════════════════════════════════════════════════════════════════
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY apps/frontend/package*.json ./
RUN npm ci

COPY apps/frontend/ ./
RUN npm run build
# Resultado en /app/frontend/dist


# ═══════════════════════════════════════════════════════════════════════════════
# Etapa 2: build del Backend (NestJS)
# ═══════════════════════════════════════════════════════════════════════════════
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend

COPY apps/backend/package*.json ./
RUN npm ci --legacy-peer-deps

COPY apps/backend/ ./
RUN npm run build
# Resultado en /app/backend/dist


# ═══════════════════════════════════════════════════════════════════════════════
# Etapa 3: imagen de producción — NestJS sirve API + frontend estático
# ═══════════════════════════════════════════════════════════════════════════════
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# Dependencias de producción del backend
COPY apps/backend/package*.json ./
RUN npm ci --only=production --legacy-peer-deps && npm cache clean --force

# Código compilado del backend
COPY --from=backend-builder /app/backend/dist ./dist

# Frontend compilado → carpeta public/ dentro del backend
COPY --from=frontend-builder /app/frontend/dist ./public

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "dist/main"]
