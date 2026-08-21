# InventarioTI — MT INDUSTRIAL S.A.C.

Plataforma de gestión de inventario TI. Reemplaza el Excel de 284 equipos con una plataforma web enterprise.

## Stack
- Frontend: React 18 + TypeScript + Ant Design
- Backend: NestJS + TypeORM + SQL Azure
- BD: SQL Azure (soledb-puntoventa, esquema INV_ZYL)

## Requisitos
- Node.js 20+
- Docker 24+
- Acceso a SQL Azure (ver .env.example)

## Inicio rápido
```bash
cp .env.example .env
# Completar .env con credenciales reales
npm install
npm run dev:backend   # Puerto 3000
npm run dev:frontend  # Puerto 5173
```

## Documentación
- Spec: docs/superpowers/specs/2026-08-20-inventario-ti-design.md
- Plan: docs/superpowers/plans/2026-08-21-inventario-ti-plan.md
