# Frontend de RepairMatch

Base con React + TypeScript: autenticación y sesión, rutas protegidas por rol, tipos y funciones de API para todo el contrato del backend, y verificaciones automatizadas. Las pantallas de cada funcionalidad se dejan intencionalmente para que las desarrolle el equipo.

## Iniciar en local

Usa Node.js 24 LTS (`.nvmrc`) y npm:

```sh
npm ci
cp .env.example .env
npm run dev
```

Abre http://localhost:5173. El backend se ejecuta por separado. Configura la dirección pública de su API en `.env` mediante `VITE_API_BASE_URL` (por defecto: `http://localhost:8080/api`). Todos los valores `VITE_*` son visibles en el navegador: nunca coloques secretos allí.

### Ejecutar contra el backend

1. Levanta el backend (por defecto escucha en `http://localhost:8080`; ver el repositorio del backend).
2. Deja `VITE_API_BASE_URL=http://localhost:8080/api` en `.env` (o la URL que uses).
3. CORS: el backend solo acepta los orígenes de `CORS_ALLOWED_ORIGINS`; su valor por defecto ya incluye `http://localhost:5173` (el puerto fijo de `npm run dev`) y `http://localhost:3000`. Si cambias el origen del frontend, ajusta esa variable. Las credenciales de CORS están desactivadas: la API usa la cabecera `Authorization: Bearer`, no cookies.
4. Abre http://localhost:5173, crea una cuenta en `/register` (cliente o técnico) e inicia sesión.

El contrato de la API vive en `docs/API_CONTRACT.md` del repositorio del backend. Los tipos de `src/shared/api/types` lo reflejan; si el backend cambia, actualiza los tipos y sus pruebas.

## Verificar y contribuir

```sh
npm run verify
```

Esto verifica el formato, los tipos estrictos, las reglas de análisis estático, las pruebas unitarias y de componentes con cobertura, y la compilación de producción. Usa `npm run format` para dar formato a los cambios.

Crea una rama de corta duración, implementa un cambio pequeño con sus pruebas y abre una solicitud de cambios (PR) hacia `main`. La verificación **Frontend verify** de integración continua (CI) debe pasar; no se exige aprobación humana ni una incidencia vinculada. Usa Conventional Commits sin líneas de atribución. Comprueba el acceso por teclado y la adaptación a distintos tamaños de pantalla al modificar la interfaz. Evalúa críticamente los hallazgos de las revisiones: las verificaciones en verde no garantizan que todo sea correcto.

Solicita una revisión de Codex comentando `@codex review` en un PR; la activación automática todavía no está habilitada.

## Estructura

| Ruta                         | Responsabilidad                                                                                                      |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `src/app`                    | Layout, tabla de rutas (`router.tsx`), rutas de cada área (`clientRoutes.tsx`, `technicianRoutes.tsx`) y estilos     |
| `src/pages`                  | Pantallas asociadas a las rutas (inicio de sesión, registro, inicio por rol, 404, no autorizado)                     |
| `src/features/auth`          | Proveedor de sesión, `useAuth()`, guards de ruta, redirecciones y validación de formularios                          |
| `src/features/<área>/api.ts` | Funciones tipadas de endpoints: `applianceTypes`, `requests`, `proposals`, `services`, `technicians`                 |
| `src/shared/api`             | Transporte JSON y errores HTTP, cliente autenticado (`client.ts`), endpoints de auth y tipos del contrato (`types/`) |
| `src/shared/auth`            | Almacén de tokens (`tokenStore.ts`) y sesión (`session.ts`), sin dependencias de React                               |
| `src/shared/ui`              | Piezas mínimas y accesibles de formulario (`TextField`, `FormErrorSummary`, `LoadingState`)                          |
| `src/shared/config`          | Configuración pública del entorno                                                                                    |
| `src/test`                   | Utilidades de pruebas (API falsa en memoria y render de la app)                                                      |

Agrega carpetas por funcionalidad solo cuando implementes comportamiento real; las pantallas nuevas se registran en `clientRoutes.tsx` o `technicianRoutes.tsx`. Mantén las pruebas junto al código que verifican. Llama al backend con las funciones de `src/features/<área>/api.ts` (o con `api` de `src/shared/api/client.ts`), nunca con `fetch` directo, y contrasta los datos con el contrato del backend: los tipos de respuesta no validan los datos durante la ejecución. La autorización sigue siendo responsabilidad del backend; los guards de rutas solo deciden qué mostrar.

## Autenticación y sesión

- **Tokens.** El token de acceso (1 h) vive **solo en memoria**. El token de refresco (7 días, de un solo uso) se guarda en `localStorage` con la clave `repairmatch.auth.refreshToken`. Si el almacenamiento falla o está bloqueado, la aplicación sigue funcionando y la sesión dura mientras la pestaña esté abierta. Los componentes nunca ven los tokens: usan `useAuth()` (`status`, `user`, `login`, `register`, `logout`).
- **Compromiso (XSS).** Cualquier script que se ejecute en este origen puede leer `localStorage` y robar el token de refresco. Una cookie `HttpOnly` lo evitaría, pero el backend usa la cabecera Bearer con CORS sin credenciales, así que hoy no es posible. Mitigaciones: el token de refresco rota en cada uso, `logout` lo revoca en el servidor, el de acceso no se persiste y no se renderiza HTML sin escapar. Cambiar de estrategia (`sessionStorage`, solo memoria, cookies) es tocar un archivo: implementa `TokenStore` y pásalo a `createSession` en `src/shared/auth/appSession.ts`.
- **Inicio de sesión y registro.** El backend no devuelve tokens al registrar, por lo que `register` crea la cuenta y luego inicia sesión con las mismas credenciales. Después se carga `GET /users/me`.
- **Al abrir la app.** Si hay token de refresco, se llama una sola vez a `POST /auth/refresh` (también con StrictMode) y se carga el usuario; mientras tanto `status` es `loading` y los guards muestran un estado de carga.
- **401 en una petición.** Las respuestas 401 simultáneas comparten **un solo** refresco; luego se reintenta la petición original **una vez**. Si el refresco es rechazado (400/401/403), se limpia la sesión y `status` pasa a `anonymous`. Si falla por red o 5xx no se borra el token guardado (no se sabe si sigue siendo válido). Nunca se refresca ni se envía Bearer en `/auth/*`, así que no hay bucles.
- **Cierre de sesión.** Se limpia el estado local de inmediato y después se llama a `POST /auth/logout` sin esperar que tenga éxito.
- **Rutas.** `/login`, `/register`, `/` (redirige según el rol), `/client/*` (solo `CLIENT`), `/technician/*` (solo `TECHNICIAN`), `/unauthorized` (rol incorrecto) y `*` (404). Un visitante anónimo es enviado a `/login` y, al iniciar sesión, vuelve a donde quería ir si su rol puede abrirlo; si no, va al inicio de su rol.
- **Pendiente.** No se sincroniza el cierre de sesión entre pestañas (`storage` event) y las pruebas E2E siguen pospuestas (ver más abajo).

## Reparto inicial del trabajo

**Propuesta ajustable, no un acuerdo confirmado del equipo.** Estos módulos todavía no están implementados. Cada responsable entrega la interfaz de su módulo, la integración con la API, los estados de carga y error, y las pruebas; no solamente documentación o pruebas.

| Responsable        | Módulo propuesto                                                    |
| ------------------ | ------------------------------------------------------------------- |
| Sebas-Leo          | Autenticación, sesión y navegación según el rol                     |
| AdrianPacheco12343 | Solicitudes del cliente y catálogo de electrodomésticos             |
| andrehcv           | Perfil del técnico, zonas de servicio y visualización de reputación |
| becomon            | Propuestas: oportunidades, envío, listado y aceptación              |
| camilaalfaro-afk   | Seguimiento del servicio, cambios de estado y calificaciones        |

Orden de integración: sesión → solicitudes/perfil → propuestas → servicios. Confirmen cada flujo con el contrato del backend antes de implementarlo y coordinen los cambios en el código compartido.

Las pruebas de extremo a extremo (E2E) en navegador se posponen para mantener ligera esta base; las pruebas unitarias no cubren la integración real entre navegador y backend. Reincorpórenlas con el primer flujo real de sesión (responsable propuesto: Sebas-Leo).

## Despliegue

`npm run build` genera `dist/`. Configura la URL de la API de producción antes de compilar, usa HTTPS, configura `CORS_ALLOWED_ORIGINS` del backend con el origen desplegado del frontend y configura el alojamiento para servir `index.html` en las rutas gestionadas por el frontend. Todavía no se ha verificado ningún despliegue ni la integración con el backend real: el flujo de sesión se probó con pruebas automatizadas y, a mano en un navegador, contra una API simulada.
