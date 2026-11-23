# Fase 23d · Mapa de visitas (Perú y mundo) y barras de países en Estadísticas

> **Propuesta (2026-11-22), espera aprobación del dueño.** Modelo: Opus 5.5. Sigue a la 23b (estadísticas).

> Riesgo bajo. Solo cambia la pantalla `/admin/estadisticas` (solo superadmin). La tienda no carga nada nuevo (N1-1), sin dependencias nuevas en `package.json`, sin cambios en la base ni en la CSP.

Hoy el panel ya pide a Google Analytics los usuarios por país (tarjeta «Usuarios por país», top 10 en barras) y por ciudad (tarjeta de ciudades, que se puso «en lugar del mapa»). Esta fase añade el mapa y arregla las barras de países. El dueño mandó como modelo una captura de un panel con «Live Users By Country» (mapa de puntos con marcadores y tabla debajo) y «Sessions by Countries» (barras horizontales de alto fijo). Se toma la **disposición y el estilo**, no el código ni las imágenes de esa plantilla.

## 1. Objetivo

**Nueva primera fila** (en pantallas grandes, tres columnas; la del mapa algo más ancha que hoy):

| Izquierda (igual que hoy) | Centro (nuevo) | Derecha (arreglada) |
|---|---|---|
| Aviso de cookies, «Hoy van…» y los 4 indicadores | **Tarjeta del mapa** con selector **Perú · Mundo** en la cabecera y, debajo del mapa, la tabla de ciudades | **Usuarios por país** con barras de alto fijo, como el modelo |

En el celular, una tarjeta debajo de otra en ese mismo orden.

| # | Qué | Efecto |
|---|---|---|
| R1 | **Mapa con selector Perú · Mundo.** Dos botones pequeños en la cabecera, como «ALL · 1M · 6M» del modelo; empieza en Perú. La tierra se dibuja **con puntitos** (relleno de patrón SVG, sin datos extra), igual que el modelo. Los departamentos o países con visitas se tiñen con el color del panel, más fuerte cuantas más visitas, y llevan un **marcador redondo** (anillo claro con centro oscuro) cuyo tamaño crece con los usuarios. Líneas punteadas finas unen **Huancayo** con cada marcador. Al pasar el ratón o tocar: «Junín · 1 234 usuarios» | Se ve de dónde vienen las visitas de un vistazo, en el país y fuera |
| R2 | **Tabla bajo el mapa**: las ciudades que hoy tienen su propia tarjeta (Ciudad · Usuarios · Vistas · %, las 5 primeras), con el mismo tamaño en las dos vistas. La tarjeta «Usuarios por ciudad» desaparece: su contenido vive aquí | Una tarjeta menos y nada se pierde |
| R3 | **Barras de países arregladas.** El gráfico tiene **alto fijo** (el mismo que la tarjeta del mapa) y las barras se reparten ese alto, tengan 2 o 10 países; ya no se estira hacia abajo con 90 días. Máximo 10 países; si hay más, una línea pequeña «y N países más» al pie. Nombres a la izquierda, barra azul con su cifra al final, la primera en coral, eje inferior con marcas, como el modelo | Se ve igual con pocos o muchos países |
| R4 | **Datos.** Una consulta más a Google: usuarios por `region` filtrando `countryId = PE` (hasta 50 filas), dentro del segundo `batchRunReports`, que hoy lleva 4 de las 5 consultas permitidas. La consulta de países pasa de 10 a 100 filas para el mapa; las barras siguen con las 10 primeras | Una sola llamada más por carga (se guarda en la caché de informes que ya existe) |
| R5 | **Nada se pierde.** Una región que Google nombre de forma que no se pueda ubicar en el mapa sale bajo el mapa como «Sin ubicar en el mapa: …» con sus usuarios | Los números siempre cuadran con Google Analytics |

Funciona con el tema claro y el oscuro del panel (variables `--accent`, `--line`, `--bg`, `--muted`). El mapa lleva `role="img"` y `aria-label`; la tabla de ciudades y las barras son el texto alternativo.

**Fuera de esta fase** (se anota, no se toca):
- Puntos por ciudad: Google no da coordenadas.
- Mapa en tiempo real: el informe en tiempo real tiene otros límites de Google.
- Acercar o arrastrar el mapa.
- El resto de filas (audiencia, más vistos, dispositivos, fuentes, páginas) quedan como están.

## 2. Enfoque y peso

- **Geometría hecha una sola vez, fuera del navegador.** Fuente: **Natural Earth** (dominio público, sin obligación de citar): `ne_110m_admin_0_countries` para el mundo (con el código `ISO_A2_EH`, que corrige Francia y Noruega; sin la Antártida) y `ne_10m_admin_1_states_provinces` filtrado a Perú (24 departamentos, el Callao y Lima Metropolitana). Se simplifica, se proyecta y se calcula un punto interior de cada forma (para el marcador) con `npx mapshaper@<versión exacta>`, sin instalarlo. `scripts/mapas/generar-mapas.mjs` lo convierte en un JSON compacto `{ id, nombre, d, x, y }` (trazo SVG ya listo y punto del marcador). Los archivos descargados no se suben a git (carpeta temporal fuera del repo).
- **Presupuesto de peso:** el script falla si el mundo pasa de 120 KB o Perú de 60 KB sin comprimir (unos 30–50 KB comprimidos entre los dos). Se carga con `import()` solo en Estadísticas: ninguna otra pantalla del panel lo descarga y la tienda tampoco.
- **Dibujo sin librerías:** un componente de cliente pinta `<path>`, el patrón de puntos, los marcadores y las líneas en un `<svg>` con `viewBox`. Sin D3 ni librerías de mapas ni de gráficos. Las barras siguen siendo HTML, como hoy, pero dentro de un alto fijo.
- **Unir los nombres de Google con el mapa:** `lib/mapas.ts` (pura, con pruebas) quita tildes y mayúsculas, quita palabras como «Region» y «Department» y aplica una tabla de alias. Google y Natural Earth no escriben igual varios nombres (Junín/Junin, Lima/«Lima Region», Callao). La tabla se comprueba con datos reales al ejecutar (ver Q4). También calcula los escalones de color (cuantiles) y el tamaño de los marcadores.
- **Contrato (N1-6):** `AnalyticsResumen` gana el campo opcional `regiones?: { region: string; usuarios: number }[]`; `paises` y `ciudades` mantienen su forma. La ruta `/api/admin/analytics` no cambia de ruta, método ni guard.

## 3. Preguntas al dueño

| # | Pregunta | Por defecto |
|---|---|---|
| Q1 | ¿La disposición de la sección 1 (mapa al centro con Perú · Mundo y ciudades debajo; países a la derecha)? | Sí |
| Q2 | ¿Las líneas punteadas desde Huancayo hasta cada marcador, como el modelo? | Sí, finas y suaves; se quitan si recargan la vista |
| Q3 | ¿Permiso para descargar una vez los archivos de Natural Earth y ejecutar `npx mapshaper` (sin instalarlo)? | Sí, solo en esta fase |
| Q4 | Lima: Google suele separar «Lima» (Lima Metropolitana) y «Lima Region» (provincias). ¿Se muestran separadas? | Separadas, como las da Google. Si Google solo da «Lima», se pinta Lima Metropolitana |

## 4. Archivos

`scripts/mapas/generar-mapas.mjs` (nuevo), `app/(admin)/admin/estadisticas/_mapas/mundo.json` y `peru.json` (generados), `app/(admin)/admin/estadisticas/_mapas/MapaVisitas.tsx` (nuevo, cliente), `lib/mapas.ts` y `lib/__tests__/mapas.test.ts` (nuevos), `app/(admin)/admin/estadisticas/page.tsx` (fila 1, barras de países, tabla de ciudades), `server/services/analytics.service.ts`, `types/analytics.ts`, `docs/plan/03-decisiones.md` (D-94).

Sin dependencias nuevas en `package.json`. Sin cambios en la tienda, la base, la CSP ni el smoke (la ruta ya se comprueba sin sesión).

## 5. Verificación

- Pruebas de `lib/mapas.ts`: nombres con y sin tilde, alias de Lima y Callao, región desconocida (va a «Sin ubicar»), cuantiles y tamaños de marcador con 0, 1 y muchos valores.
- Peso de los dos JSON y del fragmento de JavaScript de Estadísticas, antes y después, anotado en D-94. Comprobar en el build que la tienda no lo carga.
- Barras de países con 1, 3 y 10 países (y con más de 10): mismo alto de tarjeta en los tres casos.
- El dueño abre Estadísticas con datos reales (en local o tras el despliegue) con 7, 28 y 90 días y comprueba: el selector cambia de mapa, los departamentos y países se pintan, «Sin ubicar» sale vacío o con lo que haya que añadir a los alias, la primera fila no se estira, se ve bien en el celular y en tema oscuro, y los totales cuadran con Google Analytics.
- `typecheck`, `lint`, `test`, `build` y smoke en verde; fase 00 (la tienda no cambia).
