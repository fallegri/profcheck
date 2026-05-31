# Guía de Despliegue en Vercel

## Descripción General

Este documento proporciona instrucciones paso a paso para desplegar la aplicación Event Professional Wheel en Vercel.

## Requisitos Previos

- Cuenta en [Vercel](https://vercel.com)
- Repositorio en GitHub, GitLab o Bitbucket
- Credenciales de Google OAuth 2.0
- Base de datos PostgreSQL en Neon Tech
- Clave de encriptación generada

## Paso 1: Preparar Credenciales

### 1.1 Google OAuth 2.0

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita las APIs:
   - Google+ API
   - Google Drive API
4. Ve a "Credenciales" y crea una credencial OAuth 2.0:
   - Tipo: Aplicación web
   - URIs autorizados:
     - `http://localhost:3000` (desarrollo)
     - `https://your-app.vercel.app` (producción)
     - `https://your-app.vercel.app/api/auth/callback/google`
5. Copia el Client ID y Client Secret

### 1.2 Base de Datos PostgreSQL (Neon Tech)

1. Ve a [Neon Tech](https://neon.tech)
2. Crea un nuevo proyecto
3. Copia la connection string en formato:
   ```
   postgresql://user:password@host:5432/database_name
   ```

### 1.3 Generar Claves de Seguridad

```bash
# Generar NEXTAUTH_SECRET
openssl rand -base64 32

# Generar ENCRYPTION_KEY
openssl rand -base64 32
```

## Paso 2: Conectar Repositorio a Vercel

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Haz clic en "Add New..." > "Project"
3. Selecciona tu repositorio de GitHub/GitLab/Bitbucket
4. Configura el proyecto:
   - **Framework Preset**: Next.js
   - **Root Directory**: `event-professional-wheel` (si está en monorepo)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm ci`

## Paso 3: Configurar Variables de Entorno

En Vercel Dashboard, ve a **Settings > Environment Variables** y agrega:

### Variables Requeridas

| Variable | Valor | Ejemplo |
|----------|-------|---------|
| `NEXTAUTH_URL` | URL de producción | `https://your-app.vercel.app` |
| `NEXTAUTH_SECRET` | Clave generada con openssl | `base64-encoded-string` |
| `GOOGLE_CLIENT_ID` | De Google Cloud Console | `123456789-abc...` |
| `GOOGLE_CLIENT_SECRET` | De Google Cloud Console | `GOCSPX-abc...` |
| `DATABASE_URL` | Connection string de Neon | `postgresql://user:pass@host/db` |
| `ENCRYPTION_KEY` | Clave generada con openssl | `base64-encoded-string` |

### Variables Opcionales

| Variable | Valor | Ejemplo |
|----------|-------|---------|
| `GOOGLE_DRIVE_API_KEY` | De Google Cloud Console | `AIzaSyD...` |

### Configurar por Entorno

Para cada variable, selecciona los entornos donde debe estar disponible:
- ✅ Production
- ✅ Preview
- ✅ Development (opcional)

## Paso 4: Configurar Dominios Personalizados (Opcional)

1. Ve a **Settings > Domains**
2. Agrega tu dominio personalizado
3. Sigue las instrucciones para configurar DNS

## Paso 5: Realizar Despliegue Inicial

### Opción A: Despliegue Automático

1. Haz push a la rama `main` o `develop`
2. Vercel detectará automáticamente los cambios
3. Iniciará el build y despliegue

### Opción B: Despliegue Manual

1. En Vercel Dashboard, ve a **Deployments**
2. Haz clic en "Deploy"
3. Selecciona la rama a desplegar

## Paso 6: Validar Despliegue

### Verificaciones Básicas

1. **Acceso a la aplicación**
   - Abre `https://your-app.vercel.app`
   - Verifica que carga correctamente

2. **Autenticación**
   - Haz clic en "Login with Google"
   - Verifica que el flujo OAuth funciona

3. **Base de datos**
   - Crea un evento de prueba
   - Verifica que se guarda en la base de datos

4. **Logs**
   - Ve a **Deployments > Logs**
   - Verifica que no hay errores

### Verificaciones Avanzadas

```bash
# Verificar que la aplicación responde
curl https://your-app.vercel.app

# Verificar headers de seguridad
curl -I https://your-app.vercel.app

# Verificar que los endpoints de API funcionan
curl https://your-app.vercel.app/api/health
```

## Paso 7: Configurar CI/CD

El archivo `.github/workflows/test.yml` está configurado para:

1. **Ejecutar linting** en cada push
2. **Compilar la aplicación** para validar
3. **Ejecutar tests** (si existen)
4. **Notificar errores** en PRs

### Habilitar GitHub Actions

1. Ve a tu repositorio en GitHub
2. Ve a **Settings > Actions > General**
3. Asegúrate que "Actions" está habilitado
4. Configura permisos si es necesario

## Paso 8: Monitoreo y Mantenimiento

### Monitoreo en Vercel

1. **Analytics**: Ve a **Analytics** para ver métricas de rendimiento
2. **Logs**: Ve a **Deployments > Logs** para ver logs de la aplicación
3. **Errors**: Ve a **Monitoring > Errors** para ver errores

### Alertas

Configura alertas en Vercel para:
- Fallos de build
- Errores en tiempo de ejecución
- Degradación de rendimiento

## Troubleshooting

### Error: "NEXTAUTH_SECRET is not set"

**Solución**: Verifica que `NEXTAUTH_SECRET` está configurado en Vercel Dashboard

### Error: "DATABASE_URL is not set"

**Solución**: Verifica que `DATABASE_URL` está configurado y es válido

### Error: "Google OAuth callback failed"

**Solución**: 
1. Verifica que `NEXTAUTH_URL` es correcto
2. Verifica que el callback URL está registrado en Google Cloud Console
3. Verifica que `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` son correctos

### Build falla con "Module not found"

**Solución**:
1. Verifica que todas las dependencias están en `package.json`
2. Ejecuta `npm ci` localmente para validar
3. Verifica que no hay archivos faltantes

### Aplicación lenta en producción

**Solución**:
1. Verifica que la base de datos está en la misma región que Vercel
2. Habilita caching en Vercel
3. Optimiza queries de base de datos
4. Usa Next.js Image Optimization

## Rollback

Si necesitas revertir a una versión anterior:

1. Ve a **Deployments**
2. Encuentra el deployment anterior
3. Haz clic en los tres puntos (...) > "Promote to Production"

## Seguridad

### Mejores Prácticas

1. **Nunca** commits credenciales a Git
2. **Usa** variables de entorno para todos los secretos
3. **Rota** `NEXTAUTH_SECRET` y `ENCRYPTION_KEY` periódicamente
4. **Monitorea** logs para actividad sospechosa
5. **Usa** HTTPS (Vercel lo proporciona automáticamente)
6. **Configura** headers de seguridad (ya incluidos en `vercel.json`)

### Headers de Seguridad Configurados

- `X-Content-Type-Options: nosniff` - Previene MIME sniffing
- `X-Frame-Options: DENY` - Previene clickjacking
- `X-XSS-Protection: 1; mode=block` - Protección XSS
- `Referrer-Policy: strict-origin-when-cross-origin` - Control de referrer

## Recursos Útiles

- [Documentación de Vercel](https://vercel.com/docs)
- [Documentación de Next.js](https://nextjs.org/docs)
- [Documentación de NextAuth.js](https://next-auth.js.org)
- [Documentación de Neon Tech](https://neon.tech/docs)
- [Google Cloud Console](https://console.cloud.google.com)

## Soporte

Para problemas o preguntas:

1. Revisa los logs en Vercel Dashboard
2. Consulta la documentación oficial
3. Abre un issue en el repositorio
4. Contacta al equipo de soporte

---

**Última actualización**: 2025-01-01
**Versión**: 1.0
