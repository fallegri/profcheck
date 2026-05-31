# Guía de Configuración de Variables de Entorno

## Resumen

Este documento proporciona instrucciones detalladas para configurar todas las variables de entorno necesarias para desplegar Event Professional Wheel en Vercel.

## Variables de Entorno Requeridas

### 1. NEXTAUTH_URL

**Descripción**: URL base de la aplicación donde se ejecuta NextAuth.js

**Formato**: `https://your-domain.com`

**Ejemplos**:
- Desarrollo: `http://localhost:3000`
- Producción: `https://your-app.vercel.app`
- Dominio personalizado: `https://wheel.example.com`

**Cómo obtenerlo**:
1. Después de desplegar en Vercel, copia la URL del proyecto
2. O usa tu dominio personalizado si lo configuraste

**Importancia**: ⚠️ CRÍTICO - Sin esto, NextAuth.js no funcionará

---

### 2. NEXTAUTH_SECRET

**Descripción**: Clave secreta para encriptar tokens JWT de NextAuth.js

**Formato**: String base64 de al menos 32 caracteres

**Cómo generarlo**:

```bash
# Opción 1: Usando OpenSSL (recomendado)
openssl rand -base64 32

# Opción 2: Usando Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Opción 3: Usando Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

**Ejemplo de salida**:
```
aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890==
```

**Importancia**: ⚠️ CRÍTICO - Mantén esto secreto, nunca lo compartas

**Seguridad**:
- Genera una clave diferente para cada entorno (desarrollo, staging, producción)
- Rota esta clave periódicamente (cada 3-6 meses)
- Si se compromete, regenera inmediatamente

---

### 3. GOOGLE_CLIENT_ID

**Descripción**: ID de cliente de Google OAuth 2.0

**Formato**: String numérico seguido de `.apps.googleusercontent.com`

**Ejemplo**:
```
123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
```

**Cómo obtenerlo**:

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita Google+ API:
   - Ve a "APIs & Services" > "Library"
   - Busca "Google+ API"
   - Haz clic en "Enable"
4. Crea credenciales OAuth 2.0:
   - Ve a "APIs & Services" > "Credentials"
   - Haz clic en "Create Credentials" > "OAuth 2.0 Client ID"
   - Selecciona "Web application"
   - Configura URIs autorizados:
     - `http://localhost:3000`
     - `http://localhost:3000/api/auth/callback/google`
     - `https://your-app.vercel.app`
     - `https://your-app.vercel.app/api/auth/callback/google`
   - Haz clic en "Create"
5. Copia el "Client ID"

**Importancia**: ⚠️ CRÍTICO - Necesario para autenticación

---

### 4. GOOGLE_CLIENT_SECRET

**Descripción**: Secreto de cliente de Google OAuth 2.0

**Formato**: String alfanumérico

**Ejemplo**:
```
GOCSPX-abcdefghijklmnopqrstuvwxyz
```

**Cómo obtenerlo**:

Mismo proceso que GOOGLE_CLIENT_ID, pero copia el "Client Secret" en lugar del Client ID

**Importancia**: ⚠️ CRÍTICO - Mantén esto secreto, nunca lo compartas

**Seguridad**:
- Nunca commits esto a Git
- Usa variables de entorno en Vercel
- Si se compromete, regenera en Google Cloud Console

---

### 5. DATABASE_URL

**Descripción**: Connection string de PostgreSQL en Neon Tech

**Formato**: `postgresql://user:password@host:port/database_name`

**Ejemplo**:
```
postgresql://neondb_owner:abcdefghijklmnop@ep-cool-cloud-12345.us-east-1.aws.neon.tech:5432/neondb
```

**Cómo obtenerlo**:

1. Ve a [Neon Tech](https://neon.tech)
2. Crea una cuenta o inicia sesión
3. Crea un nuevo proyecto
4. Ve a "Connection String"
5. Selecciona "Prisma" como driver
6. Copia la connection string completa

**Importancia**: ⚠️ CRÍTICO - Sin esto, la base de datos no funcionará

**Seguridad**:
- Nunca commits esto a Git
- Usa variables de entorno en Vercel
- Si se compromete, cambia la contraseña en Neon Tech

**Nota**: Asegúrate de que la base de datos está en la misma región que Vercel para mejor rendimiento

---

### 6. ENCRYPTION_KEY

**Descripción**: Clave para encriptar datos sensibles en la base de datos

**Formato**: String base64 de al menos 32 caracteres

**Cómo generarlo**:

```bash
# Opción 1: Usando OpenSSL (recomendado)
openssl rand -base64 32

# Opción 2: Usando Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Opción 3: Usando Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

**Ejemplo de salida**:
```
xYzAbCdEfGhIjKlMnOpQrStUvWxYz1234567890==
```

**Importancia**: ⚠️ CRÍTICO - Mantén esto secreto, nunca lo compartas

**Seguridad**:
- Genera una clave diferente para cada entorno
- Rota esta clave periódicamente
- Si se compromete, regenera inmediatamente
- Nota: Cambiar esta clave hará que los datos encriptados anteriores sean ilegibles

---

### 7. GOOGLE_DRIVE_API_KEY (Opcional)

**Descripción**: Clave de API de Google Drive para operaciones de archivo

**Formato**: String alfanumérico

**Ejemplo**:
```
AIzaSyD_abcdefghijklmnopqrstuvwxyz1234567890
```

**Cómo obtenerlo**:

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Selecciona tu proyecto
3. Ve a "APIs & Services" > "Library"
4. Busca "Google Drive API"
5. Haz clic en "Enable"
6. Ve a "APIs & Services" > "Credentials"
7. Haz clic en "Create Credentials" > "API Key"
8. Copia la clave

**Importancia**: ℹ️ OPCIONAL - Solo si usas Google Drive

**Seguridad**:
- Restringe la clave a solo Google Drive API
- Configura restricciones de HTTP referrer si es posible

---

## Configurar Google OAuth para Vercel

Después de obtener la URL de tu app en Vercel, debes registrar el callback URL en Google Cloud Console para que la autenticación funcione en producción.

### Agregar Callback URL de Vercel en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Selecciona tu proyecto
3. Ve a **APIs & Services** > **Credentials**
4. Haz clic en tu OAuth 2.0 Client ID
5. En **Authorized redirect URIs**, agrega:
   ```
   https://tu-app.vercel.app/api/auth/callback/google
   ```
   Reemplaza `tu-app` con el nombre real de tu proyecto en Vercel.
6. Si usas un dominio personalizado, agrega también:
   ```
   https://tu-dominio.com/api/auth/callback/google
   ```
7. En **Authorized JavaScript origins**, agrega:
   ```
   https://tu-app.vercel.app
   ```
8. Haz clic en **Save**

> ⚠️ **Importante**: Sin este paso, Google rechazará los intentos de login en producción con el error `redirect_uri_mismatch`.

---

## Configuración en Vercel

### Paso 1: Acceder a Vercel Dashboard

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto

### Paso 2: Ir a Environment Variables

1. Haz clic en "Settings"
2. Haz clic en "Environment Variables"

### Paso 3: Agregar Variables

Para cada variable:

1. Haz clic en "Add New"
2. Ingresa el nombre de la variable (ej: `NEXTAUTH_URL`)
3. Ingresa el valor
4. Selecciona los entornos:
   - ✅ Production
   - ✅ Preview
   - ✅ Development (opcional)
5. Haz clic en "Save"

### Paso 4: Redeploy

1. Ve a "Deployments"
2. Haz clic en los tres puntos (...) del deployment más reciente
3. Selecciona "Redeploy"

---

## Configuración Local (Desarrollo)

### Crear archivo .env.local

En la raíz del proyecto, crea un archivo `.env.local`:

```bash
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-local-secret-key-here

# Google OAuth Credentials
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/database_name

# Encryption Key
ENCRYPTION_KEY=your-local-encryption-key-here-32-characters-min

# Google Drive API (opcional)
GOOGLE_DRIVE_API_KEY=your-google-drive-api-key-here
```

### Importante

- ⚠️ **NUNCA** commits `.env.local` a Git
- Usa valores diferentes para desarrollo y producción
- Asegúrate que `.env.local` está en `.gitignore`

---

## Validación

### Verificar que las variables están configuradas

```bash
# En desarrollo
echo $NEXTAUTH_URL
echo $DATABASE_URL

# En Vercel, ve a Settings > Environment Variables
# y verifica que todas las variables están listadas
```

### Verificar que la aplicación funciona

1. Inicia la aplicación localmente:
   ```bash
   npm run dev
   ```

2. Abre `http://localhost:3000`

3. Verifica que:
   - La página carga correctamente
   - El botón de login funciona
   - Puedes autenticarte con Google
   - Puedes crear un evento

---

## Troubleshooting

### Error: "NEXTAUTH_SECRET is not set"

**Causa**: La variable no está configurada en Vercel

**Solución**:
1. Ve a Vercel Dashboard > Settings > Environment Variables
2. Verifica que `NEXTAUTH_SECRET` está configurado
3. Redeploy la aplicación

### Error: "DATABASE_URL is not set"

**Causa**: La variable no está configurada en Vercel

**Solución**:
1. Ve a Vercel Dashboard > Settings > Environment Variables
2. Verifica que `DATABASE_URL` está configurado
3. Verifica que la connection string es válida
4. Redeploy la aplicación

### Error: "Google OAuth callback failed"

**Causa**: Las credenciales de Google no son correctas

**Solución**:
1. Verifica que `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` son correctos
2. Verifica que el callback URL está registrado en Google Cloud Console
3. Verifica que `NEXTAUTH_URL` es correcto
4. Redeploy la aplicación

### Error: "Connection refused" en base de datos

**Causa**: La base de datos no es accesible

**Solución**:
1. Verifica que `DATABASE_URL` es correcto
2. Verifica que la base de datos está en línea
3. Verifica que Vercel puede acceder a la base de datos (firewall, IP whitelist)
4. Intenta conectar localmente para validar

---

## Seguridad

### Mejores Prácticas

1. **Nunca** compartas tus secretos
2. **Nunca** commits credenciales a Git
3. **Usa** variables de entorno para todos los secretos
4. **Rota** secretos periódicamente
5. **Monitorea** logs para actividad sospechosa
6. **Usa** HTTPS (Vercel lo proporciona automáticamente)

### Checklist de Seguridad

- [ ] Todas las variables están configuradas en Vercel
- [ ] `.env.local` está en `.gitignore`
- [ ] No hay credenciales en archivos de código
- [ ] Las credenciales de Google están restringidas a URIs autorizados
- [ ] La base de datos tiene contraseña fuerte
- [ ] Los secretos son únicos para cada entorno
- [ ] Se han rotado los secretos recientemente

---

## Referencias

- [Documentación de NextAuth.js - Environment Variables](https://next-auth.js.org/configuration/options)
- [Documentación de Vercel - Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Documentación de Google Cloud - OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Documentación de Neon Tech - Connection String](https://neon.tech/docs/connect/connection-string)

---

**Última actualización**: 2025-01-01
**Versión**: 1.0
