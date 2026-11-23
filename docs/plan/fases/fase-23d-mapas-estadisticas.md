# Fase 23d · Mapas de visitas en Estadísticas (Perú por departamentos y mundo)

> **Propuesta (2026-11-22), espera aprobación del dueño.** Modelo: Opus 5.5. Sigue a la 23b (estadísticas).

> Riesgo bajo. Solo cambia la pantalla `/admin/estadisticas` (solo superadmin). La tienda no carga nada nuevo (N1-1), sin dependencias nuevas en `package.json`, sin cambios en la base ni en la CSP.

Hoy el panel ya pide a Google Analytics los usuarios por país (tarjeta «Usuarios por país», top 10 en barras) y por ciudad (tarjeta de ciudades, que se puso «en lugar del mapa»). Esta fase dibuja esos datos en dos mapas.

## 1. Objetivo

| # | Qué | Efecto |
|---|---|---|
| R1 | **Mapa de Perú por departamentos.** Cada departamento se pinta según sus usuarios en el periodo elegido (7, 28 o 90 días, como el resto de la pantalla). Al pasar el ratón o tocar, se ve «Junín · 1 234 usuarios» | Se ve de qué parte del país vienen las visitas. Para una tienda de Huancayo dice más que el mapa del mundo |
| R2 | **Mapa del mundo por país**, con el mismo estilo | Se ven las visitas de fuera de Perú de un vistazo |
| R3 | **Datos.** Una consulta más a Google: usuarios por `region` filtrando `countryId = PE` (hasta 50 filas), dentro del segundo `batchRunReports`, que hoy lleva 4 de las 5 consultas permitidas. La consulta de países pasa de 10 a 100 filas para el mapa; las barras siguen mostrando solo las 10 primeras | Una sola llamada más a Google por carga (se guarda en la caché de informes que ya existe) |
| R4 | **Nada se pierde.** Una región que Google nombre de forma que no se pueda ubicar en el mapa sale debajo como «Sin ubicar en el mapa: …» con sus usuarios. Los países y ciudades siguen en sus tarjetas de siempre | Los números siempre cuadran con Google Analytics |

**Cómo se ve.** Una fila nueva debajo de la primera, con dos tarjetas: «Visitas en Perú» y «Visitas en el mundo». En el celular, una debajo de la otra. Escala de un solo color (el acento del panel), de claro a fuerte en 5 escalones por cuantiles, gris suave para «sin visitas», con leyenda. Funciona con el tema claro y el oscuro del panel (variables `--accent`, `--line`, `--bg`). El SVG lleva `role="img"` y `aria-label`; las listas de países y ciudades quedan como texto alternativo.

**Fuera de esta fase** (se anota, no se toca):
- Mapa por ciudades o con puntos: Google no da coordenadas y las ciudades ya tienen su tarjeta.
- Mapa en tiempo real: el informe en tiempo real tiene otros límites de Google.
- Acercar o arrastrar el mapa: no hace falta con dos mapas fijos.

## 2. Enfoque y peso

- **Geometría hecha una sola vez, fuera del navegador.** Fuente: **Natural Earth** (dominio público, sin obligación de citar): `ne_110m_admin_0_countries` para el mundo (con el código `ISO_A2_EH`, que corrige Francia y Noruega; sin la Antártida) y `ne_10m_admin_1_states_provinces` filtrado a Perú (24 departamentos, el Callao y Lima Metropolitana). Se simplifica y proyecta con `npx mapshaper@<versión exacta>`, sin instalarlo, y `scripts/mapas/generar-mapas.mjs` lo convierte en un JSON compacto `{ id, nombre, d }` (el trazo SVG ya listo). Los archivos descargados no se suben a git (carpeta temporal fuera del repo).
- **Presupuesto de peso:** el script falla si el mundo pasa de 120 KB o Perú de 60 KB sin comprimir (unos 30–50 KB comprimidos entre los dos). Se carga con `import()` solo en Estadísticas: ninguna otra pantalla del panel lo descarga y la tienda tampoco.
- **Dibujo sin librerías:** un componente de cliente pinta `<path>` en un `<svg>` con `viewBox`. Sin D3 ni librerías de mapas.
- **Unir los nombres de Google con el mapa:** `lib/mapas.ts` (pura, con pruebas) quita tildes y mayúsculas, quita palabras como «Region» y «Department» y aplica una tabla de alias. Google y Natural Earth no escriben igual varios nombres (Junín/Junin, Lima/«Lima Region», Callao). La tabla se comprueba con datos reales al ejecutar (ver Q4). También calcula los cuantiles de la escala de color.
- **Contrato (N1-6):** `AnalyticsResumen` gana el campo opcional `regiones?: { region: string; usuarios: number }[]`; `paises` mantiene su forma. La ruta `/api/admin/analytics` no cambia de ruta, método ni guard.

## 3. Preguntas al dueño

| # | Pregunta | Por defecto |
|---|---|---|
| Q1 | ¿Dónde van los mapas? | Fila nueva con dos tarjetas (Perú y mundo) debajo de la primera fila; no se quita ninguna tarjeta |
| Q2 | ¿Colores? | Un solo tono (el acento del panel) en 5 escalones y gris para sin visitas |
| Q3 | ¿Permiso para descargar una vez los archivos de Natural Earth y ejecutar `npx mapshaper` (sin instalarlo)? | Sí, solo en esta fase |
| Q4 | Lima: Google suele separar «Lima» (Lima Metropolitana) y «Lima Region» (provincias). ¿Se muestran separadas? | Separadas, como las da Google. Si Google solo da «Lima», se pinta Lima Metropolitana |

## 4. Archivos

`scripts/mapas/generar-mapas.mjs` (nuevo), `app/(admin)/admin/estadisticas/_mapas/mundo.json` y `peru.json` (generados), `app/(admin)/admin/estadisticas/_mapas/MapaVisitas.tsx` (nuevo, cliente), `lib/mapas.ts` y `lib/__tests__/mapas.test.ts` (nuevos), `app/(admin)/admin/estadisticas/page.tsx`, `server/services/analytics.service.ts`, `types/analytics.ts`, `docs/plan/03-decisiones.md` (D-94).

Sin dependencias nuevas en `package.json`. Sin cambios en la tienda, la base, la CSP ni el smoke (la ruta ya se comprueba sin sesión).

## 5. Verificación

- Pruebas de `lib/mapas.ts`: nombres con y sin tilde, alias de Lima y Callao, región desconocida (va a «Sin ubicar»), cuantiles con 0, 1 y muchos valores.
- Peso de los dos JSON y del fragmento de JavaScript de Estadísticas, antes y después, anotado en D-94. Comprobar en el build que la tienda no lo carga.
- El dueño abre Estadísticas con datos reales (en local o tras el despliegue) y comprueba: los departamentos se pintan, «Sin ubicar» sale vacío o con lo que haya que añadir a los alias, los mapas se ven bien en el celular y en tema oscuro, y los totales cuadran con Google Analytics.
- `typecheck`, `lint`, `test`, `build` y smoke en verde; fase 00 (la tienda no cambia).
