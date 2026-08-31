# ═══════════════════════════════════════════════════════════════════════════════
# Etapa 1: build del Frontend (React + Vite)
# ═══════════════════════════════════════════════════════════════════════════════
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY apps/frontend/package*.json ./
RUN npm install --legacy-peer-deps

COPY apps/frontend/ ./
RUN npm run build
# Resultado en /app/frontend/dist


# ═══════════════════════════════════════════════════════════════════════════════
# Etapa 2: build del Backend (NestJS)
# ═══════════════════════════════════════════════════════════════════════════════
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend

COPY apps/backend/package*.json ./
RUN npm install --legacy-peer-deps

COPY apps/backend/ ./
RUN npm run build

# Elimina devDependencies para reducir el tamaño de la imagen final
RUN npm prune --production
# Resultado en /app/backend/dist y /app/backend/node_modules (solo producción)


# ═══════════════════════════════════════════════════════════════════════════════
# Etapa 3: imagen de producción — NestJS sirve API + frontend estático
# ═══════════════════════════════════════════════════════════════════════════════
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# Copia node_modules ya instaladas y podadas desde el builder (mismas versiones exactas)
COPY --from=backend-builder /app/backend/node_modules ./node_modules

# Código compilado del backend
COPY --from=backend-builder /app/backend/dist ./dist

# Frontend compilado → carpeta public/ dentro del backend
COPY --from=frontend-builder /app/frontend/dist ./public

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "dist/main"]
