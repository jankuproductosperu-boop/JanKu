# Fase 22b · Libro de Reclamaciones virtual

> **PROPUESTA pendiente de aprobación del dueño** (redactada el 2026-11-19). Requiere la fase 22a fusionada.

> ⚠️ **Riesgo medio-alto:** modelo y colección nuevos, endpoint público de escritura, correo a clientes con Resend real y migración 004 (índices). Datos personales con DNI.

> Los requisitos legales de esta fase se basan en el Reglamento del Libro de Reclamaciones (D.S. 011-2011-PCM y sus modificaciones). **Confirma con un abogado o con INDECOPI** los plazos y campos vigentes antes de publicarla; si algo cambió, se ajusta el contrato de la sección 5 antes de escribir código.

## 1. Objetivo y por qué va en este orden

El Código del Consumidor obliga a toda tienda, también a las virtuales, a tener un **Libro de Reclamaciones** accesible desde la web. Hoy Janku no lo tiene, y es el incumplimiento más fácil de sancionar.

Esta fase añade:
- Página pública `/libro-de-reclamaciones` con la hoja de reclamación.
- Copia automática por correo al consumidor y aviso a la tienda.
- Pantalla Panel → Reclamos para leerlos, responderlos dentro del plazo y enviar la respuesta por correo.

Va después de la 22a porque usa `LEGAL` (datos del titular) y enlaza a sus páginas.

**Cambios visibles anunciados:** enlace "Libro de Reclamaciones" con el icono de libro en el pie (y en `/contacto`); página nueva; en el panel, enlace "Reclamos".

## 2. Prerrequisitos y preguntas al dueño

- Fase 22a fusionada; `LEGAL.correo` definido (Q1 de la 22a).
- Resend funcionando con el dominio de `FROM_EMAIL` (ya se usa en los correos de cuenta).
- Rama: `fase-22b-reclamaciones` desde `main`.

| # | Pregunta | Por defecto |
|---|---|---|
| **Q5** | ¿Quién atiende los reclamos en el panel? | Ven la lista quienes tienen `pedidos.ver`; responden quienes tienen `pedidos.gestionar` (superadmin, gestor y ventas). Sin permiso nuevo |
| **Q6** | La copia para la tienda, ¿al correo de `LEGAL`? | Sí. `ADMIN_NOTIFY_EMAIL` sigue sin usarse |
| **Q7** | ¿Mostrar en el Resumen del panel una tarjeta "Reclamos por responder"? | Sí, solo con permiso `pedidos.ver` (D-52: datos reales) |

## 3. Archivos a crear, modificar o mover

| Acción | Ruta | Contenido |
|---|---|---|
| Crear | `models/Complaint.ts` | Hoja de reclamación (sección 5) |
| Crear | `models/Counter.ts` | Correlativo anual (`_id: "reclamos-AAAA"`, `seq`) |
| Crear | `types/complaint.ts` (+ export en `types/index.ts`) | `ComplaintPublic`, `Complaint`, `ComplaintTipo`, `ComplaintEstado` |
| Crear | `lib/diasHabiles.ts` + prueba | `sumarDiasHabiles(fecha, n)` (lunes a viernes) y `diasHabilesRestantes` |
| Crear | `server/validation/complaint.schema.ts` | `reclamoCrearSchema` y `reclamoResponderSchema`, ambos `.strict()` |
| Crear | `server/services/complaint.service.ts` | `crearReclamo`, `listarReclamos`, `obtenerReclamo`, `responderReclamo` |
| Crear | `server/email/complaint-emails.ts` | Copia al consumidor, aviso a la tienda, respuesta |
| Crear | `app/api/complaints/route.ts` | `POST` público |
| Crear | `app/api/admin/complaints/route.ts` | `GET` (paginado) |
| Crear | `app/api/admin/complaints/[id]/route.ts` | `GET` y `PATCH` (responder) |
| Crear | `app/(tienda)/libro-de-reclamaciones/page.tsx` | Formulario y constancia |
| Crear | `app/(admin)/admin/reclamos/page.tsx` y `reclamos/[id]/page.tsx` | Lista y detalle con respuesta |
| Modificar | `app/(admin)/admin/_components/AdminSidebar.tsx` | "Reclamos" en el grupo Ventas, tras "Pedidos" |
| Modificar | `app/(admin)/admin/page.tsx` | Tarjeta del Resumen (Q7) |
| Modificar | `server/auth/rateLimit.ts` | Política `"reclamo:ip"`: 5 por hora |
| Modificar | `Components/Footer/Footer.tsx` · `app/(tienda)/contacto/page.tsx` · `app/(tienda)/terminos/page.tsx` | Enlace al libro |
| Crear | `scripts/migrations/004-reclamos-indices.mjs` | Índices de `complaints` |
| Modificar | `scripts/smoke.mjs` | `GET /libro-de-reclamaciones` 200; `POST /api/complaints {}` 400; admin sin cookie 401 |
| Modificar | `docs/plan/02-datos.md` · `03-decisiones.md` | Modelo, migración 004, D-79 a D-82 |

## 4. Pasos de implementación

1. **Modelos y tipos** (sección 5). `Complaint` con `timestamps`. Sin `strict: false`.
2. **`lib/diasHabiles.ts`** con pruebas (fin de semana, cambio de mes y de año). Los feriados no se descuentan: la fecha límite que se muestra es **la más exigente** (cuenta solo sábados y domingos como no hábiles), así nunca se pasa del plazo real.
3. **Esquemas Zod** con mensajes en español. `reclamoCrearSchema` rechaza campos desconocidos (`.strict()`).
4. **Servicio**:
   - `crearReclamo(datos, { ip })`: obtiene el correlativo con `Counter.findOneAndUpdate({ _id: "reclamos-AAAA" }, { $inc: { seq: 1 } }, { upsert: true, new: true })` (año en hora de Lima), arma el código `LR-AAAA-NNNNNN`, copia los datos del proveedor desde `LEGAL` (quedan fijos en la hoja aunque `LEGAL` cambie), calcula `fechaLimite` = 15 días hábiles y guarda. Si se envía `pedidoCodigo`, solo se guarda como texto: no se revela si existe.
   - Correos **sin `await`** dentro de la petición: `void enviarCopiaReclamo(...).catch((e) => log.error(...))`. Un fallo de correo no impide registrar el reclamo; queda `copiaEnviada: false` y se ve en el panel.
   - `responderReclamo(id, { respuesta }, actor)`: solo si está `pendiente`; guarda respuesta, fecha y admin, pasa a `respondido` y envía la respuesta por correo. Una respuesta **no se edita ni se borra** después (la hoja es un registro).
   - Nada se borra (N1-3); los reclamos se conservan al menos 2 años.
5. **Rutas** con los 4 pasos de siempre. `POST /api/complaints`: `registrarIntento("reclamo:ip", …)` antes de validar; respuesta `201 { codigo, fechaLimite }` y nada más.
6. **Página pública**:
   - Arriba, los datos del proveedor (de `LEGAL`) y la fecha.
   - Formulario en tres bloques: "1. Tus datos", "2. Producto o servicio", "3. Detalle del reclamo".
   - Explicación de **reclamo** frente a **queja** junto a la elección.
   - Casilla sin marcar: "Declaro que los datos son verdaderos" y enlace a la política de privacidad.
   - Al enviar: constancia en pantalla con código, fecha, plazo de respuesta y "Te enviamos una copia a {correo}", con botón **Imprimir**.
   - Textos fijos obligatorios (sección 5).
7. **Panel**:
   - Lista con código, fecha, tipo, consumidor, estado, días hábiles restantes (rojo si quedan 3 o menos o si está vencido) y un aviso si la copia no se envió.
   - Detalle: la hoja completa en solo lectura y un campo de respuesta con confirmación ("La respuesta se enviará al correo del consumidor y no se podrá cambiar").
8. **Migración 004**: crea los índices si no existen (`createIndex`), simula por defecto, no borra nada. La corre el dueño: primero en `janku-dev`, luego en producción **antes** de desplegar.
9. Typecheck, lint, test, build, smoke y fase 00.

## 5. Contratos

### Hoja de reclamación (`Complaint`)

| Campo | Tipo | Notas |
|---|---|---|
| `codigo` | string, único | `LR-2026-000001` |
| `proveedor` | `{ nombreComercial, titular, ruc, domicilio, correo }` | Copia de `LEGAL` al crear |
| `consumidor` | `{ nombre, tipoDocumento: "DNI" \| "CE" \| "PASAPORTE", numeroDocumento, domicilio, telefono, email }` | Todos obligatorios; `telefono` con `lib/phone` |
| `representante` | `{ nombre, tipoDocumento, numeroDocumento }` opcional | Padre, madre o apoderado si el consumidor es menor de edad |
| `bien` | `{ tipo: "producto" \| "servicio", descripcion, montoReclamado? }` | `montoReclamado` en soles con `redondear2` |
| `pedidoCodigo` | string opcional | `JK-…` como texto |
| `tipo` | `"reclamo" \| "queja"` | |
| `detalle` | string (20–3000) | |
| `pedidoConsumidor` | string (5–1000) | Lo que el consumidor pide |
| `fechaLimite` | Date | +15 días hábiles |
| `estado` | `"pendiente" \| "respondido"` | |
| `respuesta` | `{ texto, fecha, adminId, adminNombre }` opcional | Inmutable una vez puesta |
| `copiaEnviada` · `respuestaEnviada` | boolean | Resultado del envío de correo |
| `ip` | string | Solo para abuso; no se muestra fuera del panel |

Índices (migración 004): `{ codigo: 1 }` único, `{ estado: 1, fechaLimite: 1 }`, `{ createdAt: -1 }`.

### API

| Método y ruta | Guard | Entrada | Respuesta |
|---|---|---|---|
| `POST /api/complaints` | ninguno + límite `reclamo:ip` 5/h | `reclamoCrearSchema` | `201 { codigo, fechaLimite }` |
| `GET /api/admin/complaints?estado=&page=` | `pedidos.ver` | — | `{ items, total, page, pageSize }` |
| `GET /api/admin/complaints/[id]` | `pedidos.ver` | — | `Complaint` |
| `PATCH /api/admin/complaints/[id]` | `pedidos.gestionar` | `{ respuesta: string(10–3000) }` | `Complaint`; 409 `YA_RESPONDIDO` |

### Textos fijos de la página y de la copia por correo

- "**Reclamo:** disconformidad relacionada con los productos o servicios. **Queja:** disconformidad no relacionada con los productos o servicios, o malestar o descontento con la atención al público."
- "La formulación del reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo para interponer una denuncia ante el INDECOPI."
- "El proveedor deberá dar respuesta al reclamo en un plazo no mayor a quince (15) días hábiles."

### Correos (texto escapado con `escapeHtml`, con el timeout de `send.ts`)

| Correo | Para | Contenido |
|---|---|---|
| Copia de la hoja | Consumidor | Todos los datos de la hoja, código, fecha y plazo, y los textos fijos |
| Aviso | `LEGAL.correo` | Código, tipo, fecha límite y enlace al panel. **Sin** DNI ni domicilio |
| Respuesta | Consumidor | Código, respuesta y fecha |

### Decisiones nuevas (se pasan a `03-decisiones.md` al aprobar)

- **D-79 · Libro de Reclamaciones propio**, en la base, con correlativo anual `LR-AAAA-NNNNNN` y copia de los datos del proveedor en cada hoja.
- **D-80 · Las hojas no se borran y la respuesta es inmutable** (N1-3 y valor de registro).
- **D-81 · Plazo mostrado** = 15 días hábiles contando solo sábados y domingos como no hábiles (nunca más permisivo que el real).
- **D-82 · Permisos de reclamos** = los de pedidos (Q5).

## 6. Reglas de Nivel 1 que esta fase podría romper y cómo evitarlo

- **N1-2 y logs:** DNI, domicilio, correo y texto del reclamo nunca van al log; solo `codigo` y `tipo`.
- **N1-3:** colecciones nuevas (`complaints`, `counters`); índices solo por la migración 004, que simula por defecto. Sin `syncIndexes`.
- **N1-4:** endpoint público con límite de intentos y `.strict()`; la respuesta no revela si un `pedidoCodigo` existe.
- **N1-6:** solo endpoints nuevos.
- **N1-8:** el ejecutor no envía correos reales ni corre la migración: las pruebas con Resend real y `--apply` las hace el dueño.

## 7. Criterios de aceptación verificables

- Enviar una hoja válida → constancia con código y fecha límite; en la base, `codigo` correlativo y `proveedor` copiado.
- Dos envíos simultáneos → códigos distintos y consecutivos.
- Campo desconocido o faltante → 400 con `fields`; el sexto envío en una hora desde la misma IP → 429.
- Si Resend falla, el reclamo igual se guarda y el panel muestra "Copia no enviada".
- Panel: un `ventas` ve y responde; responder dos veces → 409; la respuesta llega por correo (prueba del dueño).
- `diasHabiles`: viernes + 1 día hábil = lunes; pruebas en verde.
- La migración 004 simulada en `janku-dev` lista los 3 índices; una segunda simulación tras aplicar no tiene nada que hacer.
- typecheck, lint (0 errores), test, build y smoke en verde.

## 8. Checklist de pruebas manuales para el dueño

- [ ] Simular y aplicar la 004 en `janku-dev`; luego simular en producción.
- [ ] Hoja de prueba con tu correo: llega la copia y el aviso a `LEGAL.correo`.
- [ ] Responder desde el panel; llega la respuesta.
- [ ] Imprimir la constancia desde el móvil y desde la computadora.
- [ ] Aplicar la 004 en producción **antes** de desplegar.
- [ ] Fase 00 completa.

## 9. Plan de reversa

`git revert` del commit de fusión: desaparecen la página, el panel y el enlace. Las colecciones `complaints` y `counters` y sus índices se quedan (N1-3); los reclamos ya recibidos se deben seguir atendiendo por correo hasta reponer el libro.

## 10. Qué NO tocar en esta fase

- Pedidos, cupones, precios y stock.
- Los textos legales de la 22a, salvo el enlace en `/terminos`.
- Dependencias (sin librerías de PDF: la constancia se imprime con el navegador).

## 11. Modelo recomendado

**Superior** para `complaint.service.ts`, el esquema, la ruta pública y la migración 004. **Sonnet** para la página pública y el panel.
