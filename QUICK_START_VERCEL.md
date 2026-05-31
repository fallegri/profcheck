# Quick Start: Despliegue en Vercel (5 minutos)

## TL;DR - Resumen Rápido

1. **Generar claves**:
   ```bash
   openssl rand -base64 32  # NEXTAUTH_SECRET
   openssl rand -base64 32  # ENCRYPTION_KEY
   ```

2. **Obtener credenciales**:
   - Google OAuth: [Google Cloud Console](https://console.cloud.google.com)
   - Database: [Neon Tech](https://neon.tech)

3. **Conectar a Vercel**:
   - Ve a [Vercel Dashboard](https://vercel.com/dashboard)
   - "Add New" > "Project"
   - Selecciona tu repositorio

4. **Configurar variables**:
   - Settings > Environment Variables
   - Agrega: NEXTAUTH_URL, NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, DATABASE_URL, ENCRYPTION_KEY

5. **Desplegar**:
   - Haz push a main/develop
   - Vercel despliega automáticamente

---

## Paso a Paso Detallado

### 1. Generar Claves de Seguridad (2 min)

```bash
# Terminal/PowerShell
openssl rand -base64 32
# Copia el resultado → NEXTAUTH_SECRET

openssl rand -base64 32
# Copia el resultado → ENCRYPTION_KEY
```

### 2. Obtener Google OAuth Credentials (3 min)

1. Ve a https://console.cloud.google.com
2. Crea proyecto nuevo
3. Habilita Google+ API y Google Drive API
4. Credenciales > OAuth 2.0 Client ID > Web application
5. URIs autorizados:
   - `http://localhost:3000`
   - `http://localhost:3000/api/auth/callback/google`
   - `https://your-app.vercel.app`
   - `https://your-app.vercel.app/api/auth/callback/google`
6. Copia Client ID y Client Secret

### 3. Obtener Database URL (2 min)

1. Ve a https://neon.tech
2. Crea proyecto PostgreSQL
3. Copia connection string (Prisma format)

### 4. Conectar a Vercel (2 min)

1. Ve a https://vercel.com/dashboard
2. "Add New" > "Project"
3. Selecciona tu repositorio
4. Haz clic en "Deploy"

### 5. Configurar Variables (3 min)

En Vercel Dashboard:

1. Settings > Environment Variables
2. Agrega cada variable:

```
NEXTAUTH_URL = https://your-app.vercel.app
NEXTAUTH_SECRET = [GENERADO]
GOOGLE_CLIENT_ID = [DE GOOGLE]
GOOGLE_CLIENT_SECRET = [DE GOOGLE]
DATABASE_URL = [DE NEON]
ENCRYPTION_KEY = [GENERADO]
```

3. Para cada variable: Production ✅, Preview ✅, Development ✅

### 6. Redeploy (1 min)

1. Deployments > Haz clic en los tres puntos (...)
2. "Redeploy"
3. Espera a que termine

### 7. Validar (2 min)

1. Abre https://your-app.vercel.app
2. Prueba login con Google
3. Crea un evento de prueba
4. ¡Listo!

---

## Archivos Importantes

| Archivo | Propósito |
|---------|-----------|
| `vercel.json` | Configuración de Vercel |
| `.env.production` | Plantilla de variables (NO COMMITEAR) |
| `.github/workflows/test.yml` | CI/CD Pipeline |
| `VERCEL_DEPLOYMENT.md` | Guía completa |
| `ENV_SETUP_GUIDE.md` | Guía de variables |
| `DEPLOYMENT_CHECKLIST.md` | Checklist paso a paso |

---

## Errores Comunes

| Error | Solución |
|-------|----------|
| "NEXTAUTH_SECRET is not set" | Agrega en Vercel Dashboard |
| "DATABASE_URL is not set" | Agrega en Vercel Dashboard |
| "Google OAuth failed" | Verifica callback URL en Google Cloud |
| Build falla | Revisa logs en Vercel Dashboard |

---

## Después del Despliegue

✅ GitHub Actions ejecuta automáticamente en cada push
✅ Vercel despliega automáticamente si todo pasa
✅ Monitorea logs en Vercel Dashboard
✅ Configura alertas si es necesario

---

## Documentación Completa

Para más detalles, lee:
- [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) - Guía completa
- [ENV_SETUP_GUIDE.md](./ENV_SETUP_GUIDE.md) - Variables de entorno
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Checklist detallado

---

**¡Listo para desplegar!** 🚀
