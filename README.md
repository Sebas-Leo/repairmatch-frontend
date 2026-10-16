# Frontend de RepairMatch

Base con React + TypeScript: autenticación y sesión, rutas protegidas por rol, cliente HTTP autenticado y verificaciones automatizadas. Las pantallas, los tipos y las funciones de API de cada funcionalidad los entrega cada responsable de módulo (ver «Reparto inicial del trabajo» y «Cómo agregar tu módulo»).

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

El contrato de la API vive en `docs/API_CONTRACT.md` del repositorio del backend. Los tipos compartidos de `src/shared/api/types` cubren solo autenticación y errores; cada módulo define los tipos de sus propios endpoints a partir de ese contrato.

## Verificar y contribuir

```sh
npm run verify
```

Esto verifica el formato, los tipos estrictos, las reglas de análisis estático, las pruebas unitarias y de componentes con cobertura, y la compilación de producción. Usa `npm run format` para dar formato a los cambios.

Crea una rama de corta duración, implementa un cambio pequeño con sus pruebas y abre una solicitud de cambios (PR) hacia `main`. La verificación **Frontend verify** de integración continua (CI) debe pasar; no se exige aprobación humana ni una incidencia vinculada. Usa Conventional Commits sin líneas de atribución. Comprueba el acceso por teclado y la adaptación a distintos tamaños de pantalla al modificar la interfaz. Evalúa críticamente los hallazgos de las revisiones: las verificaciones en verde no garantizan que todo sea correcto.

Solicita una revisión de Codex comentando `@codex review` en un PR; la activación automática todavía no está habilitada.

## Estructura

| Ruta                    | Responsabilidad                                                                                                                                                      |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app`               | Layout, tabla de rutas (`router.tsx`), rutas de cada área (`clientRoutes.tsx`, `technicianRoutes.tsx`) y registro automático de rutas por módulo (`moduleRoutes.ts`) |
| `src/pages`             | Pantallas asociadas a las rutas (inicio de sesión, registro, inicio por rol, 404, no autorizado)                                                                     |
| `src/features/auth`     | Proveedor de sesión, `useAuth()`, guards de ruta, redirecciones y validación de formularios                                                                          |
| `src/features/<módulo>` | Un módulo por responsable: pantallas, `api.ts`, tipos, `client.routes.tsx` / `technician.routes.tsx` y pruebas                                                       |
| `src/shared/api`        | Cliente axios (`axiosClient.ts`), transporte y errores (`http.ts`), cliente autenticado (`client.ts`), endpoints de auth y tipos (`types/`)                          |
| `src/shared/auth`       | Almacén de tokens (`tokenStore.ts`) y sesión (`session.ts`), sin dependencias de React                                                                               |
| `src/shared/ui`         | Piezas mínimas y accesibles de formulario (`TextField`, `FormErrorSummary`, `LoadingState`)                                                                          |
| `src/shared/config`     | Configuración pública del entorno                                                                                                                                    |
| `src/test`              | Utilidades de pruebas (API falsa en memoria y render de la app)                                                                                                      |

Agrega carpetas por funcionalidad solo cuando implementes comportamiento real. Mantén las pruebas junto al código que verifican. Llama al backend con `api` de `src/shared/api/client.ts`, nunca con `fetch` ni `axios` directos, y contrasta los datos con el contrato del backend: los tipos de respuesta no validan los datos durante la ejecución. La autorización sigue siendo responsabilidad del backend; los guards de rutas solo deciden qué mostrar.

## Cómo agregar tu módulo

1. Crea `src/features/<tu-módulo>/` (por ejemplo `requests`). Allí van tus pantallas, tus funciones de API (`api.ts`), tus tipos y tus pruebas.
2. Llama al backend con el cliente autenticado, que ya adjunta el token y renueva la sesión en un 401:

   ```ts
   import { api } from '../../shared/api/client';

   export const listMyRequests = () => api.request<MyRequest[]>('/requests');

   export const cancelRequest = (id: number) =>
     api.request<MyRequest>(`/requests/${id}/cancel`, { method: 'PATCH' });
   ```

   `api.request<T>(path, { method?, body?, signal? })` espera un cuerpo JSON en la respuesta; usa `api.send(...)` cuando la respuesta no tiene cuerpo (204). El `body` es un valor JSON (no `FormData` ni `Blob`). Acepta un `AbortSignal` para cancelar (ver «Cliente HTTP (axios)»).

   Verifica rutas, métodos y cuerpos contra `docs/API_CONTRACT.md` del backend. Los errores HTTP llegan como `ApiError` (`status`, `message`, `errors`, `body`).

3. Registra tus pantallas **sin editar archivos compartidos**: crea `client.routes.tsx` (área del cliente, `/client/...`) o `technician.routes.tsx` (área del técnico, `/technician/...`) dentro de tu carpeta con un `export default` de `RouteObject[]`. Se descubren automáticamente y sus rutas son relativas al área:

   ```tsx
   import type { RouteObject } from 'react-router';
   import { RequestsPage } from './RequestsPage';

   export default [
     { path: 'requests', element: <RequestsPage /> },
   ] satisfies RouteObject[];
   ```

4. Lee la sesión con `useAuth()` (`user`, `status`); nunca accedas a los tokens. El guard del área ya garantiza el rol, pero la autorización real la hace el backend.
5. Las páginas de inicio (`ClientHomePage`, `TechnicianHomePage`) son marcadores de posición: el módulo dueño de cada flujo las reemplaza.
6. Antes de abrir tu PR ejecuta `npm run verify`.

## Autenticación y sesión

- **Tokens.** El token de acceso (1 h) vive **solo en memoria**. El token de refresco (7 días, de un solo uso) se guarda en `localStorage` con la clave `repairmatch.auth.refreshToken`. Si el almacenamiento falla o está bloqueado, la aplicación sigue funcionando y la sesión dura mientras la pestaña esté abierta. Los componentes nunca ven los tokens: usan `useAuth()` (`status`, `user`, `login`, `register`, `logout`).
- **Compromiso (XSS).** Cualquier script que se ejecute en este origen puede leer `localStorage` y robar el token de refresco. Una cookie `HttpOnly` lo evitaría, pero el backend usa la cabecera Bearer con CORS sin credenciales, así que hoy no es posible. Mitigaciones: el token de refresco rota en cada uso, `logout` lo revoca en el servidor, el de acceso no se persiste y no se renderiza HTML sin escapar. Cambiar de estrategia (`sessionStorage`, solo memoria, cookies) es tocar un archivo: implementa `TokenStore` y pásalo a `createSession` en `src/shared/auth/appSession.ts`.
- **Inicio de sesión y registro.** El backend no devuelve tokens al registrar, por lo que `register` crea la cuenta y luego inicia sesión con las mismas credenciales. Después se carga `GET /users/me`.
- **Al abrir la app.** Si hay token de refresco, se llama una sola vez a `POST /auth/refresh` (también con StrictMode) y se carga el usuario; mientras tanto `status` es `loading` y los guards muestran un estado de carga.
- **401 en una petición.** El interceptor de respuesta delega en la sesión: las respuestas 401 simultáneas comparten **un solo** refresco; luego se reintenta la petición original **una vez**. Si el refresco es rechazado (400/401/403), se limpia la sesión y `status` pasa a `anonymous`. Si falla por red o 5xx no se borra el token guardado (no se sabe si sigue siendo válido). Nunca se refresca ni se envía Bearer en `/auth/*`, así que no hay bucles.
- **Cierre de sesión.** Se limpia el estado local de inmediato y después se llama a `POST /auth/logout` sin esperar que tenga éxito.
- **Rutas.** `/login`, `/register`, `/` (redirige según el rol), `/client/*` (solo `CLIENT`), `/technician/*` (solo `TECHNICIAN`), `/unauthorized` (rol incorrecto) y `*` (404). Un visitante anónimo es enviado a `/login` y, al iniciar sesión, vuelve a donde quería ir si su rol puede abrirlo; si no, va al inicio de su rol.
- **Varias pestañas y tiempos de espera.** Si otra pestaña cierra sesión o cambia de cuenta (evento `storage`), esta pestaña pasa a `anonymous`. Las llamadas de autenticación tienen un tiempo de espera, y los resultados de operaciones que terminan después de un cierre o cambio de sesión se descartan.
- **Pendiente.** Las pruebas E2E siguen pospuestas (ver más abajo).

## Cliente HTTP (axios)

**Por qué axios.** La rúbrica y los materiales del curso piden una capa de cliente abstraída con axios: configuración centralizada (`baseURL`, cabeceras por defecto) e interceptores. Los interceptores son un único lugar para la autenticación, el refresco de tokens y la normalización de errores, y axios aporta timeout y cancelación integrados. **Compromiso:** una dependencia más frente a `fetch`: según `npm run build`, el bundle pasa de 330,84 kB (104,29 kB gzip) a 384,36 kB (123,75 kB gzip), es decir +53,5 kB (+19,5 kB gzip). Los módulos no lo notan: `api.request` / `api.send` siguen siendo la API estable y **nunca** deben importar `axios` ni llamar a `fetch`.

**Configuración central** (`src/shared/api/axiosClient.ts`, una sola instancia): `baseURL` desde `VITE_API_BASE_URL`; `Accept` y `Content-Type: application/json`; timeout de 30 s (10 s en las llamadas de auth); `withCredentials: false` (la API usa Bearer, sin cookies); las rutas absolutas no pueden cambiar de origen; se usa el adaptador `fetch` con `redirect: 'error'`, así que una redirección es un error y nunca se reenvía el token. El cuerpo (`body`) se serializa siempre con `JSON.stringify` (una cadena `'123'` viaja como `"123"`); `Blob`, `FormData`, binarios y streams se rechazan. Se rechazan también las rutas con segmentos `.`/`..` o `%2e`/`%2f`.

**Cabeceras: el gotcha de CORS.** El adaptador `fetch` de axios añade por defecto `User-Agent: axios/x` (y `X-XSRF-TOKEN` si hay una cookie). Según el navegador, esas cabeceras irían al preflight CORS porque no son «seguras», y el backend solo permite `Authorization` y `Content-Type`: el preflight fallaría y **cada llamada** terminaría en `NetworkError`. Por eso la instancia las desactiva (`'User-Agent': false`, `withXSRFToken: false`) y una prueba comprueba que lo único que sale es `Accept`, `Authorization` y `Content-Type`.

**Interceptores y sesión.** Los interceptores no tienen reglas de autenticación propias; preguntan a la sesión (`RequestAuthorizer` en `http.ts`, implementado en `session.ts`), que sigue siendo la única fuente de verdad:

- _Petición:_ adjunta `Authorization: Bearer <token en memoria>`, solo si la URL final tiene el origen de la API (ni con otro `baseURL` ni con una URL absoluta de otro origen). Nunca en `/auth/*` (se evalúa la ruta ya normalizada: `/x/../auth/login` o `/%41uth/login` cuentan como `/auth/*`) ni en una petición que ya trae su propio token.
- _Respuesta:_ convierte todo fallo en un error propio y, ante un 401 de una llamada autenticada, pide a la sesión recuperarse (refresco único compartido, descarte de resultados tras logout o cambio de usuario) y reintenta **una sola vez**. Una petición reintentada nunca se reintenta de nuevo.

**Errores que recibe un módulo** (nunca tipos de axios):

| Error                                              | Cuándo                                                                   |
| -------------------------------------------------- | ------------------------------------------------------------------------ |
| `ApiError` (`status`, `message`, `errors`, `body`) | La respuesta no es 2xx, o es 2xx pero no JSON                            |
| `NetworkError`                                     | No hubo respuesta: sin conexión, CORS o redirección bloqueada            |
| `TimeoutError` (`DOMException`)                    | Se superó el timeout                                                     |
| `AbortError` (`DOMException`)                      | La cancelaste con tu `AbortSignal`; no se muestra como error (ver abajo) |

**Cancelación (`AbortController`).** Toda función de API debería aceptar `CallOptions` (`{ signal? }`, de `client.ts`) y pasarla a `api.request`. Cancela al desmontar:

```ts
// api.ts
export const listMyRequests = (options?: CallOptions) =>
  api.request<MyRequest[]>('/requests', options);

// componente
useEffect(() => {
  const controller = new AbortController();
  listMyRequests({ signal: controller.signal })
    .then(setRequests)
    .catch((error: unknown) => {
      if (!isAbortError(error)) setError(error);
    });
  return () => controller.abort();
}, []);
```

**Contrato de la cancelación.** Una llamada cancelada rechaza con el _motivo de la señal_: con `controller.abort()` (sin argumentos, o con algo que no es un error) recibes un `AbortError` y `isAbortError(error)` es `true`; si abortas con tu propio motivo (`controller.abort(reason)`) recibes **ese motivo tal cual**, y `isAbortError` solo es `true` cuando su `name` es `AbortError` (un `TimeoutError` es un fallo, no una cancelación).

Cancelar rechaza **de inmediato**, también si la petición está esperando un refresco tras un 401 (no espera a que termine). El refresco compartido que ya está en curso **no se cancela** (otros llamadores dependen de él): sigue en segundo plano, su resultado se guarda y se libera el estado; si mientras tanto hubo un cierre de sesión o un cambio de usuario, se descarta y el token nuevo se revoca. La petición cancelada nunca se reenvía.

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

`npm run build` genera `dist/`. Configura la URL de la API de producción antes de compilar, usa HTTPS, configura `CORS_ALLOWED_ORIGINS` del backend con el origen desplegado del frontend y configura el alojamiento para servir `index.html` en las rutas gestionadas por el frontend. Todavía no se ha verificado ningún despliegue ni la integración con el backend real: el flujo de sesión se probó con pruebas automatizadas y, tras migrar a axios, a mano en un navegador (servidor de desarrollo de Vite) contra una API simulada local con CORS: inicio de sesión, restauración al recargar, tres 401 simultáneos con un único refresco, cierre de sesión, cancelación, timeout y redirección bloqueada (el preflight CORS no se probó contra el backend real).
