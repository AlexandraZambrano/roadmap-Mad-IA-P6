# Roadmap Manager — Bootcamp Manager

Plataforma de gestión de bootcamps para **Factoría F5**. Permite a formadores/as crear y gestionar promociones, hacer seguimiento de estudiantes, evaluar competencias por proyectos, controlar asistencia y publicar recursos a los equipos.

---

## Índice

1. [Stack tecnológico](#stack-tecnológico)
2. [Arquitectura general](#arquitectura-general)
3. [Estructura del proyecto](#estructura-del-proyecto)
4. [Requisitos previos](#requisitos-previos)
5. [Configuración del entorno](#configuración-del-entorno)
6. [Instalación y arranque local](#instalación-y-arranque-local)
7. [Despliegue con Docker](#despliegue-con-docker)
8. [Base de datos](#base-de-datos)
9. [Autenticación](#autenticación)
10. [API — resumen de endpoints](#api--resumen-de-endpoints)
11. [Vistas y páginas](#vistas-y-páginas)
12. [Modelos de datos](#modelos-de-datos)
13. [Logger](#logger)
14. [Email](#email)
15. [Convenciones de código](#convenciones-de-código)
16. [Errores frecuentes](#errores-frecuentes)

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Runtime | Node.js 20 |
| Servidor HTTP | Express 4 |
| ORM | Sequelize 6 |
| Base de datos | MySQL (compatible con MariaDB, PostgreSQL, MSSQL, SQLite) |
| Auth externa | Symfony API en `users.coderf5.es` — tokens RS256 |
| Auth local (JWT) | `jsonwebtoken` + `jwks-rsa` |
| Email | Nodemailer → Gmail SMTP |
| Subida de ficheros | Multer (memoria) |
| Excel | xlsx (SheetJS) |
| Frontend | HTML5 + Bootstrap 5 + JS vanilla |
| Contenerización | Docker + Docker Compose |

---

## Arquitectura general

```
┌──────────────────────────────────────────────────┐
│  Browser (Bootstrap 5 + JS vanilla)              │
│  public/*.html  ←→  public/js/*.js               │
└────────────────────┬─────────────────────────────┘
                     │ HTTP REST (JSON)
┌────────────────────▼─────────────────────────────┐
│  server.js  — Express API (puerto 3000)           │
│  • verifyToken → RS256 / HS256                    │
│  • verifyAdmin → comprueba userRole               │
└───────┬────────────────────┬─────────────────────┘
        │ Sequelize ORM      │ HTTP fetch
┌───────▼───────────┐  ┌─────▼──────────────────┐
│  MySQL / SQL DB   │  │  users.coderf5.es       │
│  (ver .env)       │  │  Auth API (Symfony)     │
└───────────────────┘  └────────────────────────┘
```

**Flujo de autenticación:**
1. El usuario hace login desde `login.html` → `POST /api/auth/external-login`
2. El servidor hace proxy a la API externa de Symfony
3. Symfony devuelve un JWT firmado con RS256
4. El servidor valida con `backend/keys/public.pem` y re-emite un JWT local HS256 (o reenviá el externo)
5. El cliente guarda el token en `localStorage` y lo adjunta en cada petición como `Authorization: Bearer <token>`

---

## Estructura del proyecto

```
roadmap-manager/
├── server.js                    # Punto de entrada — toda la API REST
├── package.json
├── Dockerfile
├── .env.example                 # Plantilla de variables de entorno
│
├── backend/
│   ├── db/
│   │   └── sequelize.js         # Instancia Sequelize (lee .env)
│   ├── models/
│   │   └── sql/
│   │       ├── index.js         # Exporta todos los modelos + db
│   │       ├── Teacher.js
│   │       ├── Student.js
│   │       ├── Promotion.js
│   │       ├── ExtendedInfo.js  # JSON ampliado por promoción
│   │       ├── Attendance.js
│   │       ├── Section.js
│   │       ├── QuickLink.js
│   │       ├── BootcampTemplate.js
│   │       ├── catalog.js       # Competences, Indicators, Tools, Areas, Levels, Resources
│   │       └── Admin.js         # Desactivado — no usar
│   ├── keys/
│   │   └── public.pem           # Clave pública RS256 de users.coderf5.es ⚠️ NO subir a git
│   └── utils/
│       └── email.js             # sendPasswordEmail, sendReportEmail
│
└── public/                      # Frontend estático servido por Express
    ├── index.html               # Landing pública
    ├── login.html
    ├── auth.html
    ├── dashboard.html           # Dashboard del formador
    ├── promotion-detail.html    # Detalle de promoción (vista principal)
    ├── public-promotion.html    # Vista pública de la promoción
    ├── student-dashboard.html
    ├── admin.html
    ├── css/
    ├── img/
    └── js/
        ├── config.js            # API_URL global
        ├── auth.js
        ├── dashboard.js
        ├── promotion-detail.js  # ~12 000 líneas — lógica principal de formador
        ├── public-promotion.js  # Vista pública
        ├── student-dashboard.js
        ├── admin.js
        ├── notes.js
        ├── reports.js
        ├── translations.js
        └── ...
```

---

## Requisitos previos

- **Node.js 20+**
- **MySQL 8+** (o MariaDB 10.6+, PostgreSQL 14+, etc.)
- Acceso a la **API externa de autenticación** (`users.coderf5.es` en producción, o Symfony local en desarrollo)
- Fichero **`backend/keys/public.pem`** con la clave pública RS256 del servidor de auth

---

## Configuración del entorno

Copia el fichero de ejemplo y rellena los valores:

```bash
cp .env.example .env
```

| Variable | Descripción | Ejemplo |
|---|---|---|
| `SQL_DIALECT` | Motor de base de datos | `mysql` |
| `SQL_HOST` | Host del servidor SQL | `localhost` |
| `SQL_PORT` | Puerto | `3306` |
| `SQL_DATABASE` | Nombre de la base de datos / schema | `bootcamp_manager` |
| `SQL_USER` | Usuario SQL | `root` |
| `SQL_PASSWORD` | Contraseña SQL | `secret` |
| `SQL_SSL` | `true` si el proveedor cloud requiere SSL | `false` |
| `EMAIL_USER` | Cuenta Gmail para envío de emails | `no-reply@example.com` |
| `EMAIL_PASSWORD` | Contraseña de aplicación de Gmail | `xxxx xxxx xxxx xxxx` |
| `NODE_ENV` | `development` o `production` | `production` |
| `EXTERNAL_AUTH_URL_DEV` | URL Symfony local (solo en desarrollo) | `http://localhost:8000` |
| `EXTERNAL_AUTH_URL_PROD` | URL API auth en producción | `https://users.coderf5.es` |

> **Gmail**: necesitas una [contraseña de aplicación](https://support.google.com/accounts/answer/185833), no tu contraseña normal.

> **`SQL_SSL`**: ponlo a `true` si usas una base de datos en la nube (Railway, PlanetScale, Aiven, etc.).

---

## Instalación y arranque local

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# → edita .env con tus credenciales

# 3. Asegúrate de tener la clave pública de auth
#    Coloca el fichero PEM en:
#    backend/keys/public.pem

# 4. Arrancar el servidor
npm start
# → http://localhost:3000
```

La base de datos **se sincroniza automáticamente** al arrancar. Sequelize ejecuta `db.sync({ alter: { drop: false } })`, lo que crea las tablas que no existen y añade columnas nuevas sin borrar datos.

> **No hay migraciones manuales necesarias** para una instalación nueva. Para bases de datos con datos existentes, revisa la sección [Base de datos](#base-de-datos).

---

## Despliegue con Docker

```bash
# Construir y arrancar
docker compose up -d

# Ver logs en tiempo real
npm run docker:logs

# Parar
docker compose down
```

El `Dockerfile` usa `node:20-slim` e instala solo dependencias de producción (`npm install --production`). El puerto expuesto es el **3000**, pero en plataformas como Render se usa la variable de entorno `PORT`.

> ⚠️ Asegúrate de que el fichero `.env` exista y que `backend/keys/public.pem` esté copiado antes de construir la imagen, o pasa las variables como env vars del contenedor.

---

## 🧡Propósito de la aplicación

La app permite:

-  **Creación automatizada de roadmaps**
-  **Gestión de píldoras formativas**
-  **Control de asistencias**
-  **Centralización de información académica**

Facilitando el trabajo de:

- 👩‍🏫 **Personal docente**
- 🧑‍💼 **Equipo de coordinación**
- 🎓 **Alumnado**

---

##  Reto del proyecto

El principal desafío de esta iniciativa es:

> **Diseñar y desarrollar una aplicación interna optimizando los recursos disponibles, garantizando accesibilidad, escalabilidad y un coste muy bajo para la organización.**

Este enfoque busca:

- Reducir carga operativa  
- Mejorar la eficiencia organizativa  
- Minimizar costes de infraestructura  
- Asegurar sostenibilidad tecnológica  

---

##  Stack tecnológico

La aplicación está construida con:

- **Frontend:** JavaScript Vanilla  
- **Backend:** Node.js  
- **Base de datos:** MongoDB  

---


## Funcionalidades principales

- Generación dinámica de roadmaps  
- Gestión de contenidos formativos  
- Seguimiento de asistencia  
- Panel de control interno  
- Visualización para alumnado  

---

## Logger

El servidor usa un objeto `log` definido en `server.js` que silencia los mensajes de debug en producción:

```js
const IS_DEV = process.env.NODE_ENV !== 'production';
const log = {
  info:  (...a) => IS_DEV && console.log(...a),
  warn:  (...a) => console.warn(...a),      // siempre visible
  error: (...a) => console.error(...a),     // siempre visible
  debug: (...a) => IS_DEV && console.log('[debug]', ...a),
};
```

- En **desarrollo** (`NODE_ENV=development`): todos los niveles son visibles.
- En **producción** (`NODE_ENV=production`): solo `warn` y `error` aparecen en la consola.

Usa `log.debug(...)` para trazas de desarrollo, `log.warn(...)` para situaciones no críticas y `log.error(...)` para errores reales.

---

## Email

El módulo `backend/utils/email.js` usa **Gmail SMTP** vía Nodemailer.

Funciones exportadas:
- `sendPasswordEmail(email, name, password)` — envía credenciales a un nuevo teacher
- `sendReportEmail(to, subject, html)` — envía un informe por email

Si `EMAIL_USER` o `EMAIL_PASSWORD` están vacíos, el transporter no se inicializa y los envíos se ignoran con un aviso en consola (no rompen el servidor).

---

## Convenciones de código

- **ESModules**: el proyecto usa `"type": "module"` → todos los imports son `import/export`, no `require`.
- **IDs**: todos los IDs son **UUID v4** generados con `uuidv4()`.
- **JSON en TEXT**: los campos complejos se almacenan como `TEXT` con getter/setter en el modelo. No uses `DataTypes.JSON` (no es portable entre dialectos SQL).
- **`sqlSave`**: si mutas un array/objeto JSON sin reasignarlo, llama a `instance.changed('campo', true)` antes de `instance.save()`.
- **Sequelize queries**: usa siempre `{ where: { ... } }`. Nunca uses sintaxis MongoDB (`$or`, `$in`, etc.).
- **Autenticación en rutas públicas**: las rutas que no llevan `verifyToken` son accesibles sin login (útil para la vista pública de la promoción).
- **`verifyAdmin`**: siempre va **después** de `verifyToken` en la firma del handler.

---

## Errores frecuentes

### `Cannot read properties of undefined` en el frontend

Suele ser un error de parseo en otro script que impide que las funciones globales se definan. Revisa la consola del navegador en busca de `SyntaxError` previos — normalmente en `promotion-detail.js`.

### `SyntaxError: Unexpected token ':'` en un JS del frontend

Causado por un `console.log` multi-línea comentado solo en la primera línea:
```js
// Roto:
//console.log('algo:', {
    clave: valor  // ← esto es JS inválido fuera de un objeto
});

// Correcto — colapsar en una línea:
//console.log('algo:', { clave: valor });
```

### `else //console.log(...)` sin cuerpo

El `else` queda sin cuerpo válido. Mueve el `//` antes de `else`:
```js
// Roto:
else //console.log('x');

// Correcto:
//else console.log('x');
```

### El servidor arranca pero el dashboard no carga nada

Posibles causas:
1. **Queries con sintaxis MongoDB** (`$or`, `$in`) → usa `[Op.or]`, `[Op.in]` de Sequelize.
2. **`findOne({ campo })`** sin `where:` → Sequelize ignora el filtro y devuelve la primera fila.
3. **`backend/keys/public.pem` no existe** → todos los tokens son rechazados con 401.

### El servidor no conecta a la base de datos

Comprueba que `SQL_HOST`, `SQL_PORT`, `SQL_DATABASE`, `SQL_USER`, `SQL_PASSWORD` están correctamente definidos en `.env` y que el servidor SQL es accesible desde la máquina donde corre Node.

---

## Licencia

ISC — Factoría F5
