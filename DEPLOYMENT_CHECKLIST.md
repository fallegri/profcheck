# Checklist de Despliegue en Vercel

> **Estado de verificación local**: ✅ Build compila sin errores (`npm run build` exitoso)  
> **buildCommand en vercel.json**: ✅ `prisma generate && next build`  
> **Variables de entorno en .gitignore**: ✅ `.env*` excluido  
> **node_modules en .gitignore**: ✅ `/node_modules` excluido  

---

## PRE-DEPLOY: Verificación Local

### 1. Verificar variables de entorno

Asegúrate de tener un archivo `.env.local` con todas las variables necesarias:

```bash
# Verificar que existen los archivos de entorno
ls .env.local
ls .env.example   # Referencia de variables requeridas
```

Variables requeridas:
- [ ] `NEXTAUTH_URL` — URL base de la app (ej: `http://localhost:3000` en local)
- [ ] `NEXTAUTH_SECRET` — Secreto para JWT (generar con `openssl rand -base64 32`)
- [ ] `GOOGLE_CLIENT_ID` — Client ID de Google OAuth
- [ ] `GOOGLE_CLIENT_SECRET` — Client Secret de Google OAuth
- [ ] `DATABASE_URL` — Connection string de Neon Tech (formato Prisma)
- [ ] `ENCRYPTION_KEY` — Clave de encriptación (generar con `openssl rand -base64 32`)
- [ ] `GOOGLE_DRIVE_API_KEY` — API Key de Google Drive (opcional)

### 2. Ejecutar build local

```bash
npm run build
```

- [ ] Build termina sin errores TypeScript
- [ ] Build termina sin errores de compilación
- [ ] Todas las rutas se generan correctamente (ver output de Next.js)

### 3. Ejecutar migraciones de base de datos

Para producción, usar `migrate deploy` (no `migrate dev`):

```bash
# Aplicar migraciones pendientes en la BD de producción
npx prisma migrate deploy
```

- [ ] Migraciones aplicadas sin errores
- [ ] Tablas creadas: `User`, `Account`, `Session`, `Event`, `Profession`, `EventProfession`, `VisitorSelection`, `VisitorSession`

### 4. Verificar que prisma generate funciona

```bash
npx prisma generate
```

- [ ] Cliente Prisma generado sin errores
- [ ] Tipos TypeScript actualizados

---

## PRE-DEPLOY: Preparación de Credenciales

### Google OAuth 2.0

- [ ] Acceder a [Google Cloud Console](https://console.cloud.google.com)
- [ ] Crear nuevo proyecto o seleccionar existente
- [ ] Habilitar Google+ API
- [ ] Habilitar Google Drive API
- [ ] Crear credenciales OAuth 2.0 (Web application)
- [ ] Configurar URIs autorizados:
  - [ ] `http://localhost:3000`
  - [ ] `http://localhost:3000/api/auth/callback/google`
  - [ ] `https://your-app.vercel.app`
  - [ ] `https://your-app.vercel.app/api/auth/callback/google`
- [ ] Copiar Client ID
- [ ] Copiar Client Secret
- [ ] Guardar en lugar seguro (no en Git)

### Base de Datos (Neon Tech)

- [ ] Acceder a [Neon Tech](https://neon.tech)
- [ ] Crear nuevo proyecto
- [ ] Seleccionar región `us-east-1` (misma región que Vercel `iad1`)
- [ ] Copiar connection string en formato Prisma (`postgresql://...?sslmode=require`)
- [ ] Guardar en lugar seguro (no en Git)

### Generar Claves de Seguridad

```bash
# Generar NEXTAUTH_SECRET
openssl rand -base64 32

# Generar ENCRYPTION_KEY
openssl rand -base64 32
```

- [ ] `NEXTAUTH_SECRET` generado y guardado
- [ ] `ENCRYPTION_KEY` generado y guardado

### Documento de Variables de Producción

Crear un documento seguro (fuera del repositorio) con:

```
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=[GENERADO]
GOOGLE_CLIENT_ID=[DE GOOGLE CLOUD]
GOOGLE_CLIENT_SECRET=[DE GOOGLE CLOUD]
DATABASE_URL=[DE NEON TECH]
ENCRYPTION_KEY=[GENERADO]
GOOGLE_DRIVE_API_KEY=[OPCIONAL]
```

- [ ] Documento con todas las variables creado
- [ ] Documento guardado en lugar seguro (no en Git)
- [ ] Verificado que no hay errores en los valores

---

## DEPLOY: Conectar Repositorio a Vercel

- [ ] Acceder a [Vercel Dashboard](https://vercel.com/dashboard)
- [ ] Haz clic en "Add New..." > "Project"
- [ ] Seleccionar repositorio (GitHub/GitLab/Bitbucket)
- [ ] Autorizar Vercel a acceder al repositorio
- [ ] Seleccionar el repositorio correcto
- [ ] **Root Directory**: `event-professional-wheel` (es un monorepo)
- [ ] **Framework Preset**: Next.js (detectado automáticamente)
- [ ] **Build Command**: se toma de `vercel.json` → `prisma generate && next build`
- [ ] **Output Directory**: `.next` (desde `vercel.json`)
- [ ] **Install Command**: `npm ci` (automático)

---

## DEPLOY: Configurar Variables de Entorno en Vercel

En Vercel Dashboard: **Settings > Environment Variables**

> ⚠️ El `vercel.json` referencia variables con `@NOMBRE` — estas deben existir en el dashboard.

| Variable | Environments | Notas |
|---|---|---|
| `NEXTAUTH_URL` | Production, Preview, Development | URL de la app en Vercel |
| `NEXTAUTH_SECRET` | Production, Preview, Development | Generado con openssl |
| `GOOGLE_CLIENT_ID` | Production, Preview, Development | De Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Production, Preview, Development | De Google Cloud Console |
| `DATABASE_URL` | Production, Preview, Development | De Neon Tech |
| `ENCRYPTION_KEY` | Production, Preview, Development | Generado con openssl |
| `GOOGLE_DRIVE_API_KEY` | Production, Preview, Development | Opcional |

Para cada variable:
- [ ] `NEXTAUTH_URL` configurada
- [ ] `NEXTAUTH_SECRET` configurada
- [ ] `GOOGLE_CLIENT_ID` configurada
- [ ] `GOOGLE_CLIENT_SECRET` configurada
- [ ] `DATABASE_URL` configurada
- [ ] `ENCRYPTION_KEY` configurada
- [ ] `GOOGLE_DRIVE_API_KEY` configurada (opcional)
- [ ] Todas las variables listadas en Environment Variables
- [ ] Los valores son correctos (sin typos ni espacios extra)

---

## DEPLOY: Ejecutar Despliegue

### Opción A: Despliegue Automático (recomendado)

- [ ] Hacer push a rama `main`
- [ ] Vercel detecta automáticamente los cambios
- [ ] Vercel inicia el build con `prisma generate && next build`
- [ ] Esperar a que el build termine (estado "Ready")

### Opción B: Despliegue Manual

- [ ] En Vercel Dashboard, ir a "Deployments"
- [ ] Haz clic en "Deploy"
- [ ] Seleccionar la rama `main`
- [ ] Haz clic en "Deploy"
- [ ] Esperar a que el build termine

### Monitorear Build

- [ ] Ir a "Deployments" en Vercel Dashboard
- [ ] Ver el deployment más reciente
- [ ] Esperar a que el estado sea "Ready"
- [ ] Si hay errores, revisar logs de build
- [ ] Si hay errores de Prisma, verificar `DATABASE_URL`

---

## POST-DEPLOY: Verificar que la App Funciona

### Verificaciones Básicas

- [ ] Abrir `https://your-app.vercel.app`
- [ ] Página de inicio carga correctamente
- [ ] No hay errores en la consola del navegador
- [ ] Botón "Login with Google" es visible

### Probar Login con Google

- [ ] Haz clic en "Login with Google"
- [ ] Se abre ventana/popup de Google OAuth
- [ ] Puedes seleccionar cuenta de Google
- [ ] Se redirige a la aplicación después del login
- [ ] El nombre/email del usuario aparece en la UI
- [ ] Sesión se mantiene después de hacer refresh (F5)
- [ ] Logout funciona correctamente

### Verificar que la Base de Datos Conecta

- [ ] Crear un evento de prueba desde el dashboard
- [ ] Evento se guarda correctamente (sin errores 500)
- [ ] Evento aparece en el listado al recargar
- [ ] Puedes editar el evento
- [ ] Puedes eliminar el evento

### Verificar Headers de Seguridad

```bash
# Verificar que los headers de seguridad están presentes
curl -I https://your-app.vercel.app
```

Esperar en la respuesta:
- [ ] `Strict-Transport-Security` presente
- [ ] `X-Frame-Options: DENY` presente
- [ ] `X-Content-Type-Options: nosniff` presente
- [ ] `Content-Security-Policy` presente

### Verificar API Endpoints

```bash
# La app responde
curl https://your-app.vercel.app

# Endpoints de API (deben retornar 401 sin auth, no 500)
curl https://your-app.vercel.app/api/events
```

- [ ] App responde con HTTP 200
- [ ] Endpoints protegidos retornan 401 (no 500)

### Revisar Logs en Vercel

- [ ] En Vercel Dashboard, ir a "Deployments"
- [ ] Haz clic en el deployment más reciente
- [ ] Ir a "Logs" (Runtime Logs)
- [ ] No hay errores críticos en los logs
- [ ] No hay warnings de variables de entorno faltantes

---

## POST-DEPLOY: Configuración Adicional (Opcional)

### Dominio Personalizado

- [ ] En Vercel Dashboard, ir a "Settings > Domains"
- [ ] Haz clic en "Add"
- [ ] Ingresar dominio personalizado
- [ ] Seguir instrucciones para configurar DNS
- [ ] Esperar propagación DNS (hasta 48 horas)
- [ ] Actualizar `NEXTAUTH_URL` con el nuevo dominio
- [ ] Actualizar URIs autorizados en Google Cloud Console
- [ ] Verificar que el dominio funciona con HTTPS

### GitHub Actions CI/CD

- [ ] En GitHub, ir a "Settings > Actions > General"
- [ ] Verificar que "Actions" está habilitado
- [ ] Hacer push a rama `main`
- [ ] En GitHub, ir a "Actions"
- [ ] Verificar que el workflow "CI/CD Pipeline" se ejecutó
- [ ] Verificar que todos los jobs pasaron: Lint ✅, Build ✅, Test ✅

### Alertas en Vercel

- [ ] En Vercel Dashboard, ir a "Settings > Alerts"
- [ ] Habilitar alertas para build failures
- [ ] Habilitar alertas para runtime errors
- [ ] Configurar notificaciones por email

---

## Monitoreo Post-Despliegue

### Diario

- [ ] Revisar logs en Vercel Dashboard
- [ ] Revisar errores en Vercel Dashboard
- [ ] Revisar métricas de rendimiento

### Semanal

- [ ] Revisar analytics en Vercel Dashboard
- [ ] Revisar GitHub Actions logs
- [ ] Revisar base de datos para datos anómalos

### Mensual

- [ ] Revisar seguridad de credenciales
- [ ] Rotar secretos si es necesario
- [ ] Revisar performance y optimizar si es necesario

---

## Seguridad: Checklist Final

- [ ] `.env.local` está en `.gitignore` ✅ (ya configurado)
- [ ] `.env*` está en `.gitignore` ✅ (ya configurado)
- [ ] `node_modules` está en `.gitignore` ✅ (ya configurado)
- [ ] No hay credenciales en archivos de código
- [ ] No hay credenciales en commits de Git
- [ ] Las credenciales de Google están restringidas a URIs autorizados
- [ ] La base de datos tiene contraseña fuerte
- [ ] Los secretos son únicos para cada entorno
- [ ] Headers de seguridad están configurados ✅ (en `next.config.ts` y `vercel.json`)
- [ ] HTTPS está habilitado (automático en Vercel) ✅

---

## Troubleshooting: Errores Comunes

### Error: "NEXTAUTH_SECRET is not set"

- [ ] Verificar que `NEXTAUTH_SECRET` está en Vercel Dashboard > Environment Variables
- [ ] Verificar que el valor no está vacío
- [ ] Redeploy la aplicación

### Error: "DATABASE_URL is not set" o "Can't reach database server"

- [ ] Verificar que `DATABASE_URL` está en Vercel Dashboard
- [ ] Verificar que el valor es válido (formato: `postgresql://user:pass@host/db?sslmode=require`)
- [ ] Verificar que la base de datos Neon está en línea
- [ ] Verificar que la región de Neon coincide con la región de Vercel (`iad1` / `us-east-1`)
- [ ] Redeploy la aplicación

### Error: "Google OAuth callback failed" o "redirect_uri_mismatch"

- [ ] Verificar que `GOOGLE_CLIENT_ID` es correcto
- [ ] Verificar que `GOOGLE_CLIENT_SECRET` es correcto
- [ ] Verificar que `NEXTAUTH_URL` coincide exactamente con la URL de Vercel
- [ ] Verificar que el callback URL `https://your-app.vercel.app/api/auth/callback/google` está registrado en Google Cloud Console
- [ ] Redeploy la aplicación

### Build falla con "Module not found"

- [ ] Verificar que todas las dependencias están en `package.json`
- [ ] Ejecutar `npm ci` localmente para validar
- [ ] Verificar que no hay archivos faltantes en el repositorio
- [ ] Redeploy la aplicación

### Build falla con "Prisma Client not generated"

- [ ] El `buildCommand` en `vercel.json` debe ser `prisma generate && next build` ✅ (ya configurado)
- [ ] Verificar que `prisma` está en `dependencies` (no solo `devDependencies`) ✅

### Aplicación lenta en producción

- [ ] Verificar que la base de datos está en la misma región que Vercel (`iad1`)
- [ ] Revisar logs para queries lentas
- [ ] Habilitar caching en Vercel
- [ ] Optimizar queries de base de datos

---

## Rollback: Revertir a Versión Anterior

- [ ] En Vercel Dashboard, ir a "Deployments"
- [ ] Encontrar el deployment anterior que funcionaba
- [ ] Haz clic en los tres puntos (...)
- [ ] Seleccionar "Promote to Production"
- [ ] Confirmar la acción
- [ ] Esperar a que se complete el rollback

---

## Recursos Útiles

- [Documentación de Vercel](https://vercel.com/docs)
- [Documentación de Next.js](https://nextjs.org/docs)
- [Documentación de NextAuth.js](https://next-auth.js.org)
- [Documentación de Neon Tech](https://neon.tech/docs)
- [Google Cloud Console](https://console.cloud.google.com)
- [ENV_SETUP_GUIDE.md](./ENV_SETUP_GUIDE.md)
- [QUICK_START_VERCEL.md](./QUICK_START_VERCEL.md)

---

**Última actualización**: 2025-07-14  
**Versión**: 2.0  
**Estado**: ✅ Build verificado localmente — listo para despliegue

### Resumen de Verificaciones Completadas

| Verificación | Estado |
|---|---|
| `npm run build` sin errores | ✅ Exitoso |
| TypeScript compila sin errores | ✅ Exitoso |
| `vercel.json` buildCommand correcto | ✅ `prisma generate && next build` |
| `.gitignore` excluye `.env*` | ✅ Configurado |
| `.gitignore` excluye `node_modules` | ✅ Configurado |
| Headers de seguridad configurados | ✅ En `next.config.ts` y `vercel.json` |
| Migraciones Prisma disponibles | ✅ `prisma/migrations/` presente |
