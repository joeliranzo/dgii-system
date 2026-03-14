# DGII e-CF System — Facturación Electrónica

Sistema de Comprobantes Fiscales Electrónicos (e-CF) para la DGII de República Dominicana.

## Arquitectura

```
dgii-system/
├── backend/     ← NestJS (API REST)
├── frontend/    ← React + Vite (SPA)
└── data/        ← Base de datos SQLite
```

## Requisitos

- Node.js 18+
- npm

## Iniciar en desarrollo

### Backend (NestJS)
```bash
cd backend
npm install
npm run dev
# → http://localhost:3000
```

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173 (proxy a :3000)
```

## API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/facturas/stats/dashboard` | Dashboard stats |
| GET | `/api/facturas` | Listar facturas |
| POST | `/api/facturas` | Crear factura |
| POST | `/api/facturas/:id/enviar` | Enviar a DGII |
| POST | `/api/facturas/:id/consultar` | Consultar estado DGII |
| DELETE | `/api/facturas/:id` | Eliminar factura |
| GET | `/api/clientes` | Listar clientes |
| POST | `/api/clientes` | Crear cliente |
| PUT | `/api/clientes/:id` | Actualizar cliente |
| DELETE | `/api/clientes/:id` | Eliminar cliente |
| GET | `/api/configuracion` | Obtener configuración |
| PUT | `/api/configuracion` | Actualizar configuración |
| PUT | `/api/configuracion/secuencias/:tipo` | Actualizar secuencia |
