# Event Professional Wheel - Setup Guide

## Descripción General

Event Professional Wheel es una aplicación web interactiva construida con Next.js, TypeScript, Prisma y PostgreSQL. Permite a administradores crear eventos y configurar experiencias interactivas para visitantes que pueden explorar profesiones a través de una rueda interactiva.

## Requisitos Previos

- Node.js 18+ y npm 9+
- PostgreSQL 12+ (o Neon Tech para producción)
- Google OAuth credentials (para autenticación)
- Google Drive API key (para integración con Google Drive)

## Instalación

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd event-professional-wheel
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Copiar `.env.example` a `.env.local` y completar con tus valores:

```bash
cp .env.example .env.local
```

Editar `.env.local` con:
- `NEXTAUTH_URL`: URL de la aplicación (http://localhost:3000 para desarrollo)
- `NEXTAUTH_SECRET`: Clave secreta para NextAuth (generar con `openssl rand -base64 32`)
- `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`: Credenciales de Google OAuth
- `GOOGLE_DRIVE_API_KEY`: API key de Google Drive
- `DATABASE_URL`: Conexión a PostgreSQL
- `ENCRYPTION_KEY`: Clave de encriptación (mínimo 32 caracteres)

### 4. Configurar base de datos

```bash
# Crear migraciones iniciales
npx prisma migrate dev --name init

# Generar cliente Prisma
npx prisma generate
```

### 5. Ejecutar en desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## Estructura del Proyecto

```
event-professional-wheel/
├── src/
│   ├── app/                 # App Router de Next.js
│   ├── pages/               # API routes
│   │   └── api/
│   │       ├── auth/        # Autenticación NextAuth
│   │       ├── events/      # Endpoints de eventos
│   │       ├── sessions/    # Endpoints de sesiones
│   │       ├── selections/  # Endpoints de selecciones
│   │       └── professions/ # Endpoints de profesiones
│   ├── components/          # Componentes React
│   ├── services/            # Servicios (Google Drive, etc.)
│   ├── utils/               # Utilidades
│   ├── types/               # Tipos TypeScript
│   ├── schemas/             # Esquemas de validación Zod
│   ├── middleware/          # Middleware personalizado
│   ├── hooks/               # Custom React hooks
│   └── __tests__/           # Tests
├── prisma/
│   └── schema.prisma        # Esquema de base de datos
├── public/                  # Archivos estáticos
├── .env.local               # Variables de entorno (no commitear)
├── .env.example             # Plantilla de variables de entorno
├── next.config.ts           # Configuración de Next.js
├── tailwind.config.ts       # Configuración de Tailwind CSS
├── tsconfig.json            # Configuración de TypeScript
└── package.json             # Dependencias del proyecto
```

## Scripts Disponibles

- `npm run dev`: Ejecutar servidor de desarrollo
- `npm run build`: Compilar para producción
- `npm start`: Ejecutar servidor de producción
- `npm run lint`: Ejecutar ESLint

## Tecnologías Utilizadas

- **Frontend**: Next.js 16+, React 19+, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Base de Datos**: PostgreSQL (Neon Tech)
- **Autenticación**: NextAuth.js con Google OAuth
- **ORM**: Prisma
- **Validación**: Zod
- **Integración**: Google Drive API
- **Testing**: Jest, React Testing Library
- **Despliegue**: Vercel

## Configuración de Google OAuth

1. Ir a [Google Cloud Console](https://console.cloud.google.com/)
2. Crear un nuevo proyecto
3. Habilitar Google+ API
4. Crear credenciales OAuth 2.0 (tipo: Web application)
5. Agregar URIs autorizados:
   - `http://localhost:3000/api/auth/callback/google` (desarrollo)
   - `https://tu-dominio.com/api/auth/callback/google` (producción)
6. Copiar Client ID y Client Secret a `.env.local`

## Configuración de Google Drive API

1. En Google Cloud Console, habilitar Google Drive API
2. Crear una clave API
3. Copiar la clave a `GOOGLE_DRIVE_API_KEY` en `.env.local`

## Despliegue en Vercel

1. Conectar repositorio a Vercel
2. Configurar variables de entorno en Vercel dashboard
3. Vercel desplegará automáticamente en cada push a main

## Seguridad

- Todos los datos sensibles están encriptados en reposo
- Las comunicaciones usan HTTPS
- Los tokens de OAuth están protegidos
- Las entradas se validan con Zod
- Se implementan headers de seguridad

## Contribución

Por favor, seguir los estándares de código del proyecto:
- Usar TypeScript para todo el código
- Seguir las convenciones de nombres
- Escribir tests para nuevas funcionalidades
- Ejecutar `npm run lint` antes de hacer commit

## Licencia

Privada - Todos los derechos reservados

## Soporte

Para reportar bugs o sugerencias, contactar al equipo de desarrollo.
