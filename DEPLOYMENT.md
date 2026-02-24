# Despliegue Frontend (Vercel)

## Variables de entorno requeridas
- `NEXT_PUBLIC_API_URL` – URL base del backend API (ej: `https://api.tudominio.com`)

Configurar en: Vercel Dashboard → Project → Settings → Environment Variables.

## Build
```bash
npm run build
```

## Verificación
El build fallará en producción si `NEXT_PUBLIC_API_URL` no está definida.
