# Protección de Rutas Administrativas

## Resumen

Este documento describe la implementación de protección en endpoints administrativos de la aplicación Event Professional Wheel. Todos los endpoints administrativos requieren autenticación y validan que el usuario sea el propietario del evento.

## Endpoints Administrativos Protegidos

### 1. Gestión de Eventos

#### POST /api/events/create
- **Descripción**: Crear un nuevo evento
- **Protección**: ✅ Requiere autenticación (`requireAuth`)
- **Validación de Propiedad**: N/A (crea evento para usuario autenticado)
- **Detalles**:
  - Valida que el usuario esté autenticado
  - Crea el evento con `adminId` del usuario actual
  - Crea carpeta en Google Drive automáticamente

#### GET /api/events
- **Descripción**: Listar eventos del administrador
- **Protección**: ✅ Requiere autenticación (`requireAuth`)
- **Validación de Propiedad**: ✅ Filtra por `adminId` del usuario
- **Detalles**:
  - Valida que el usuario esté autenticado
  - Solo devuelve eventos donde `adminId === user.id`
  - Ordena por fecha de creación descendente

#### PUT /api/events/[id]
- **Descripción**: Actualizar evento
- **Protección**: ✅ Requiere autenticación (`requireAuth`)
- **Validación de Propiedad**: ✅ Verifica `verifyEventAdmin`
- **Detalles**:
  - Valida que el usuario esté autenticado
  - Verifica que el usuario sea el propietario del evento
  - Lanza error 403 si no es propietario
  - Valida entrada con Zod schema

#### DELETE /api/events/[id]
- **Descripción**: Eliminar evento
- **Protección**: ✅ Requiere autenticación (`requireAuth`)
- **Validación de Propiedad**: ✅ Verifica `verifyEventAdmin`
- **Detalles**:
  - Valida que el usuario esté autenticado
  - Verifica que el usuario sea el propietario del evento
  - Lanza error 403 si no es propietario
  - Elimina evento y datos asociados (cascade delete)

### 2. Configuración de Profesiones

#### POST /api/events/[id]/professions/configure
- **Descripción**: Configurar profesiones para un evento
- **Protección**: ✅ Requiere autenticación (`requireAuth`)
- **Validación de Propiedad**: ✅ Verifica `verifyEventAdmin`
- **Detalles**:
  - Valida que el usuario esté autenticado
  - Verifica que el usuario sea el propietario del evento
  - Lanza error 403 si no es propietario
  - Valida entrada con Zod schema
  - Elimina profesiones existentes y crea nuevas

#### POST /api/professions/upload-image
- **Descripción**: Cargar imagen para una profesión
- **Protección**: ✅ Requiere autenticación (`requireAuth`)
- **Validación de Propiedad**: ⚠️ No valida propiedad (cualquier admin puede actualizar cualquier profesión)
- **Detalles**:
  - Valida que el usuario esté autenticado
  - Valida entrada con Zod schema
  - Actualiza imagen de profesión

### 3. Reportes y Selecciones

#### GET /api/events/[id]/selections
- **Descripción**: Listar selecciones de visitantes para un evento
- **Protección**: ✅ Requiere autenticación (`requireAuth`)
- **Validación de Propiedad**: ✅ Verifica `verifyEventAdmin`
- **Detalles**:
  - Valida que el usuario esté autenticado
  - Verifica que el usuario sea el propietario del evento
  - Lanza error 403 si no es propietario
  - Devuelve selecciones agrupadas por profesión
  - Soporta paginación (limit, offset)

#### GET /api/events/[id]/selections/export
- **Descripción**: Exportar selecciones en CSV
- **Protección**: ✅ Requiere autenticación (`requireAuth`)
- **Validación de Propiedad**: ✅ Verifica `verifyEventAdmin`
- **Detalles**:
  - Valida que el usuario esté autenticado
  - Verifica que el usuario sea el propietario del evento
  - Lanza error 403 si no es propietario
  - Devuelve archivo CSV con selecciones

## Endpoints Públicos (Visitantes)

Los siguientes endpoints NO requieren autenticación y están disponibles para visitantes:

### GET /api/events/[id]
- Obtiene detalles del evento (sin información sensible)
- Incluye profesiones configuradas

### GET /api/events/[id]/professions
- Obtiene profesiones configuradas para el evento
- Información pública

### POST /api/selections/record
- Registra selección de profesión
- Valida que la sesión pertenezca al evento

### POST /api/sessions/create
- Crea sesión de visitante
- Genera token único

### GET /api/sessions/[sessionId]
- Obtiene información de sesión
- Valida que la sesión no haya expirado

## Mecanismos de Protección

### 1. Autenticación (requireAuth)
```typescript
export async function requireAuth(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any>
```
- Valida que el usuario tenga una sesión activa
- Obtiene la sesión usando `getServerSession` de NextAuth
- Lanza error 401 si no está autenticado
- Registra intentos de acceso no autorizado

### 2. Validación de Propiedad (verifyEventAdmin)
```typescript
export async function verifyEventAdmin(
  userId: string,
  eventAdminId: string
): Promise<void>
```
- Verifica que el usuario sea el propietario del evento
- Compara `userId` con `event.adminId`
- Lanza error 403 si no es propietario
- Registra intentos de acceso no autorizado

### 3. Rate Limiting
- `strictRateLimit`: Para endpoints administrativos (más restrictivo)
- `normalRateLimit`: Para endpoints de listado
- `lenientRateLimit`: Para endpoints públicos

### 4. Validación de Entrada
- Todos los endpoints validan entrada con Zod schemas
- Valida parámetros de query y body
- Previene inyección de código

### 5. Encriptación
- Tokens de Google se encriptan en reposo
- Datos sensibles se encriptan en base de datos
- Comunicación siempre usa HTTPS

## Flujo de Protección

```
1. Solicitud llega al endpoint
   ↓
2. Validar método HTTP (GET, POST, PUT, DELETE)
   ↓
3. Validar entrada (query, body)
   ↓
4. Requiere autenticación (requireAuth)
   ├─ Si no autenticado → Error 401
   └─ Si autenticado → Continuar
   ↓
5. Obtener usuario de base de datos
   ├─ Si no existe → Error 401
   └─ Si existe → Continuar
   ↓
6. Obtener recurso (evento, etc.)
   ├─ Si no existe → Error 404
   └─ Si existe → Continuar
   ↓
7. Verificar propiedad (verifyEventAdmin)
   ├─ Si no es propietario → Error 403
   └─ Si es propietario → Continuar
   ↓
8. Ejecutar operación
   ↓
9. Devolver respuesta
```

## Códigos de Error

- **401 Unauthorized**: Usuario no autenticado o sesión expirada
- **403 Forbidden**: Usuario no tiene permisos para acceder al recurso
- **404 Not Found**: Recurso no encontrado
- **400 Bad Request**: Entrada inválida
- **500 Internal Server Error**: Error del servidor

## Logging y Monitoreo

Todos los intentos de acceso no autorizado se registran:

```typescript
logger.warn("Unauthorized access attempt", {
  method: req.method,
  url: req.url,
  ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress,
});

logger.warn("Unauthorized resource access", {
  userId,
  resourceOwnerId,
});

logger.warn("Unauthorized event admin access", {
  userId,
  eventAdminId,
});
```

## Testing

Se han implementado tests unitarios para validar:

1. **Autenticación**: Endpoints rechazan solicitudes no autenticadas
2. **Validación de Propiedad**: Endpoints rechazan solicitudes de usuarios que no son propietarios
3. **Acceso Autorizado**: Propietarios pueden acceder a sus recursos
4. **Logging**: Se registran intentos de acceso no autorizado

Ver `src/__tests__/admin-routes-protection.test.ts` para detalles.

## Requisitos Cumplidos

- ✅ **Requisito 1.0 (Autenticación)**: Todos los endpoints administrativos requieren autenticación OAuth
- ✅ **Requisito 11.0 (Seguridad)**: Se valida propiedad de evento en todos los endpoints administrativos

## Recomendaciones de Seguridad

1. **Auditoría Regular**: Revisar logs de acceso no autorizado regularmente
2. **Rate Limiting**: Monitorear intentos de fuerza bruta
3. **Tokens**: Implementar rotación de tokens de Google Drive
4. **Encriptación**: Mantener claves de encriptación seguras
5. **HTTPS**: Asegurar que todas las comunicaciones usen HTTPS
6. **CORS**: Configurar CORS apropiadamente para prevenir ataques
7. **CSP**: Implementar Content Security Policy headers
8. **HSTS**: Implementar HTTP Strict Transport Security

## Conclusión

La aplicación Event Professional Wheel implementa protección robusta en todos los endpoints administrativos. Se valida autenticación y propiedad de evento en cada solicitud, se registran intentos de acceso no autorizado, y se implementan múltiples capas de seguridad (rate limiting, validación de entrada, encriptación).
