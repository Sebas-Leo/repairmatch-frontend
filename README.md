# Frontend de RepairMatch

Base mínima con React + TypeScript: rutas de inicio y página no encontrada (404), un cliente para la API JSON y verificaciones automatizadas. Las funcionalidades del producto se dejan intencionalmente para que las desarrolle el equipo.

## Iniciar en local

Usa Node.js 24 LTS (`.nvmrc`) y npm:

```sh
npm ci
cp .env.example .env
npm run dev
```

Abre http://localhost:5173. El backend se ejecuta por separado. Configura la dirección pública de su API en `.env` mediante `VITE_API_BASE_URL` (por defecto: `http://localhost:8080/api`). Todos los valores `VITE_*` son visibles en el navegador: nunca coloques secretos allí. Configura CORS en el backend para permitir el origen del frontend.

## Verificar y contribuir

```sh
npm run verify
```

Esto verifica el formato, los tipos estrictos, las reglas de análisis estático, las pruebas unitarias y de componentes con cobertura, y la compilación de producción. Usa `npm run format` para dar formato a los cambios.

Crea una rama de corta duración, implementa un cambio pequeño con sus pruebas y abre una solicitud de cambios (PR) hacia `main`. La verificación **Frontend verify** de integración continua (CI) debe pasar; no se exige aprobación humana ni una incidencia vinculada. Usa Conventional Commits sin líneas de atribución. Comprueba el acceso por teclado y la adaptación a distintos tamaños de pantalla al modificar la interfaz. Evalúa críticamente los hallazgos de las revisiones: las verificaciones en verde no garantizan que todo sea correcto.

Solicita una revisión de Codex comentando `@codex review` en un PR; la activación automática todavía no está habilitada.

## Estructura

| Ruta                | Responsabilidad                              |
| ------------------- | -------------------------------------------- |
| `src/app`           | Estructura de la aplicación, rutas y estilos |
| `src/pages`         | Pantallas asociadas a las rutas              |
| `src/shared/api`    | Transporte JSON y errores HTTP               |
| `src/shared/config` | Configuración pública del entorno            |

Agrega carpetas por funcionalidad solo cuando implementes comportamiento real. Mantén las pruebas junto al código que verifican. Reutiliza el cliente HTTP y contrasta los datos enviados y recibidos con el contrato del backend; los tipos de respuesta no validan los datos durante la ejecución. La autenticación y el almacenamiento de tokens no están implementados: acuerden primero un diseño seguro. La autorización sigue siendo responsabilidad del backend.

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

`npm run build` genera `dist/`. Configura la URL de la API de producción antes de compilar, usa HTTPS y configura el alojamiento para servir `index.html` en las rutas gestionadas por el frontend. Todavía no se ha verificado ningún despliegue ni la integración con un backend en ejecución.
