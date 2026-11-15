# Plan de arquitectura · Janku

Plan para ordenar el repositorio, cerrar los huecos de seguridad detectados y añadir pedidos guardados, control de inventario, cupones y roles de administrador, **sin alterar el sitio público salvo donde cada fase lo anuncia**.

Estado: **pendiente de aprobación del dueño.** Nada de este plan se ha implementado.

---

## Cómo leer este plan

| Documento | Para qué |
|---|---|
| [00-diagnostico.md](00-diagnostico.md) | Qué hay hoy: funciones, deuda técnica, riesgos, servicios externos y variables de entorno |
| [01-arquitectura.md](01-arquitectura.md) | Estructura de carpetas antes/después, convenciones, capa de servicios, tipos, tabla de movimientos |
| [02-datos.md](02-datos.md) | Modelos nuevos y modificados campo por campo; scripts de migración |
| [03-decisiones.md](03-decisiones.md) | **Reglas de Nivel 1** y las 47 decisiones tomadas, con su porqué |
| [fases/](fases/) | Un archivo por fase, autosuficiente |

### Para quien ejecuta una fase

1. Lee `CLAUDE.md` (raíz), las **Reglas de Nivel 1** de `03-decisiones.md` y **solo** el archivo de tu fase. Los demás documentos son de consulta cuando la fase los cita.
2. Trabaja en una rama `fase-NN-nombre` creada desde `main` actualizado.
3. No tomes decisiones de arquitectura. Si algo no está especificado o contradice lo que encuentras en el código, **detente y pregunta**.
4. Cierra con la [fase 00](fases/fase-00-verificacion-visual.md) y reporta resultados reales.
5. No hagas `push`, no fusiones, no ejecutes `--apply`, no llames a servicios externos sin permiso explícito en la sesión.

> `CLAUDE.md` todavía no existe. Lo redacta el arquitecto **después de la aprobación de este plan y antes de la fase 01**; la fase 21 lo actualiza al estado final.

---

## Fases y orden de ejecución

⚠️ = alto riesgo: modelo superior o revisión del dueño antes de fusionar.
"Sesiones" = sesiones de trabajo del modelo ejecutor. "Tu tiempo" = revisión y pruebas manuales del dueño (incluye la fase 00).

| Nº | Fase | Riesgo | Modelo | Sesiones | Tu tiempo | ¿Cambia algo visible? |
|---|---|:-:|---|:-:|:-:|---|
| 00 | [Verificación visual](fases/fase-00-verificacion-visual.md) *(se repite al cerrar cada fase)* | — | — | — | 45 min la primera vez; 15–20 min cada cierre | — |
| 01 | [Línea base y herramientas](fases/fase-01-linea-base-herramientas.md) | Bajo | Sonnet | 1 | 20 min | No |
| 02 | [Tipos compartidos](fases/fase-02-tipos-compartidos.md) | Bajo | Sonnet | 1 | 20 min | No |
| 03 | [Reorganizar `lib/`](fases/fase-03-reorganizar-lib.md) | Bajo | Sonnet | 1 | 30 min | No |
| 04 | [Grupos de rutas y layouts](fases/fase-04-grupos-de-rutas-y-layouts.md) | Medio | Sonnet | 1 | 30 min | Panel sin menú de tienda |
| 05 | [Base HTTP y validación](fases/fase-05-base-http-y-validacion.md) | Bajo | Sonnet | 1 | 15 min | No |
| 06 | [Servicios de catálogo](fases/fase-06-servicios-catalogo.md) | Medio | Sonnet + revisión | 1–2 | 45 min | No |
| 07 | [Límite de intentos unificado](fases/fase-07-rate-limit-unificado.md) | ⚠️ Alto | Superior | 1 | 45 min | No |
| 08 | [Sesiones y guards](fases/fase-08-sesiones-y-guards.md) | ⚠️ Alto | Superior | 1–2 | 1 h | No |
| 09 | [Roles y permisos](fases/fase-09-roles-y-permisos.md) | ⚠️ Alto · migración 001 | Sonnet + revisión | 1 | 1 h | No |
| 10 | [API admin y proyección pública](fases/fase-10-api-admin-y-proyeccion-publica.md) | ⚠️ Alto | Sonnet + revisión | 1 | 45 min | Inactivos ocultos en tienda |
| 11 | [Subida a Cloudinary](fases/fase-11-subida-cloudinary.md) | Medio | Sonnet | 1 | 30 min | Panel rechaza no-imágenes |
| 12 | [Dividir panel admin](fases/fase-12-dividir-panel-admin.md) | Medio | Sonnet | 1–2 | 45 min | Barra de navegación del panel |
| 12b | [Panel: barra lateral izquierda, estilo y Resumen](fases/fase-12b-panel-estructura.md) | Medio | Sonnet | 1 | 1 h | Panel rediseñado; catálogo en rutas propias |
| 12c | [Panel: lista y formulario de productos](fases/fase-12c-panel-productos.md) | Medio | Sonnet | 1–2 | 1 h | Tabla con búsqueda y filtros; formulario en página propia |
| 12d | [Panel: restilo del resto de pantallas](fases/fase-12d-panel-restilo.md) | Bajo | Sonnet | 1–2 | 45 min | Colores y tarjetas del panel |
| 12e | [Novedades de la semana](fases/fase-12e-novedades.md) | Bajo | Sonnet | 1 | 30 min | Sección «Novedades» en el inicio y etiqueta «Nuevo» (solo con productos marcados) |
| 12f | [Popup de oferta](fases/fase-12f-popup-oferta.md) | Medio | Sonnet | 1 | 30 min | Ventana de oferta al entrar (solo si está activo) |
| 13 | [Inventario con movimientos](fases/fase-13-inventario-movimientos.md) | ⚠️ Alto · migración 002 | Superior + Sonnet | 2 | 1 h | Formulario de stock del panel |
| 13b | [Variantes de producto y base de subcategorías](fases/fase-13b-variantes.md) | ⚠️ Alto | **Superior** | 2 | 1 h 30 | Panel: sección Variantes. Tienda: solo en productos con variantes |
| 14 | [Precios y carrito](fases/fase-14-precios-y-carrito.md) | Medio | Sonnet + revisión de pruebas | 1 | 30 min | No |
| 15 | [Pedidos: backend](fases/fase-15-pedidos-backend.md) | ⚠️ Alto · migración 003 | Superior + Sonnet | 2 | 45 min | No |
| 16 | [Checkout (interfaz)](fases/fase-16-checkout-ui.md) | Medio | Sonnet | 1–2 | 45 min | Solo con el interruptor encendido |
| 16b | [Entrega: delivery gratis por producto, puntos de entrega, envío a provincia](fases/fase-16b-entrega.md) *(propuesta)* | Medio-alto | Superior + Sonnet | 2 | 1 h | Checkout y `/carrito`; panel: Puntos de entrega |
| 17 | [Pedidos en el panel](fases/fase-17-pedidos-admin.md) | ⚠️ Alto | Superior + Sonnet | 2 | 1 h 30 | Pantalla nueva en el panel |
| 18 | [Cupones: backend](fases/fase-18-cupones-backend.md) | ⚠️ Alto | Superior + Sonnet | 2 | 45 min | No |
| 19 | [Cupones (interfaz)](fases/fase-19-cupones-ui.md) | Medio | Sonnet | 1 | 30 min | Pantalla en panel; campo en checkout |
| 20 | [Correos y "Mis pedidos"](fases/fase-20-emails-y-mis-pedidos.md) | Medio | Sonnet | 1 | 45 min | Enlace y campo en el perfil |
| 21 | [Usuarios admin y cierre](fases/fase-21-usuarios-admin-y-cierre.md) | Bajo | Sonnet | 1 | 1 h | Pantalla nueva en el panel |

**Total estimado:** 25–30 sesiones de modelo y unas 14–16 horas del dueño repartidas en las 21 fases.

### Hitos

| Hito | Se alcanza al cerrar | Qué se gana |
|---|---|---|
| **A · Casa ordenada** | Fase 06 | Código en su sitio, tipos únicos, validación de entradas, sin asignación masiva |
| **B · Seguridad cerrada** | Fase 11 | Límites persistentes, sesiones revocables, roles, costos fuera de la API pública, subidas verificadas |
| **C · Inventario fiable** | Fase 13 | Cada cambio de stock queda registrado |
| **D · Pedidos** | Fase 17 | Checkout con pedido guardado, gestión en el panel, stock descontado al confirmar |
| **E · Cupones y cierre** | Fase 21 | Cupones, correos, "Mis pedidos", documentación final |

Se puede parar tras cualquier hito y el sitio queda coherente. **El hito B es el de mayor valor inmediato**: hoy cualquiera puede leer precios de costo y proveedores desde `/api/products`.

---

## Dependencias entre fases

```
01 ─► 02 ─► 03 ─► 04 ─► 05 ─► 06 ─► 07 ─► 08 ─► 09 ─► 10 ─► 11 ─► 12 ─► 12b ─► 12c ─► 12d ─► 13 ─► 13b ─► 14 ─► 15 ─► 16 ─► 17 ─► 18 ─► 19 ─► 20 ─► 21
```

El orden recomendado es lineal. Dependencias **estrictas** (por si hubiera que reordenar):

| Fase | Necesita |
|---|---|
| 02 | 01 |
| 03 | 02 |
| 04 | 03 |
| 05 | 03 |
| 06 | 05 |
| 07 | 03, 05 |
| 08 | 07 |
| 09 | 08 |
| 10 | 06, 09 |
| 11 | 05, 08 |
| 12 | 04, 10 (y conviene 11) |
| 12b | 12 |
| 12c | 12b |
| 12d | 12b (y conviene 12c) |
| 12e | 12c |
| 12f | 12d |
| 13 | 06, 09 (ejecutor de migraciones), 12d |
| 13b | 13 (y debe ir antes de 14, 15 y 17) |
| 14 | 05 (y 13b) |
| 15 | 07, 08, 14 |
| 16 | 04, 15 |
| 17 | 12, 13, 15 |
| 18 | 15, 17 |
| 19 | 12, 16, 18 |
| 20 | 17 |
| 21 | 09, 12 y todas las demás para el cierre |

Único adelanto razonable: la **fase 14** puede hacerse en cualquier momento después de la 05.

> **Propuestas posteriores** (21b visitas): ver [propuestas-panel.md](propuestas-panel.md). Aún sin archivo de fase.

### Migraciones y pasos manuales del dueño

| Cuándo | Qué | Dónde |
|---|---|---|
| Antes de la fase 01 | Capturas de referencia; resolver el cambio pendiente de `next.config.ts` | Local |
| Fase 07 | Confirmar a qué base apunta `.env.local` | Atlas |
| **Pendiente tras desplegar la fase 07** | Entrar al panel en jan-ku.com y buscar en los logs de Render la línea `login_admin.ok`: su `ip` debe ser tu IP real (la de "cuál es mi IP"). Si sale una de Cloudflare (104.x, 172.64–71.x), ajustar `ENTRADAS_DE_PROXY` en `lib/clientIp.ts`. Recordárselo al dueño en cuanto haga push a `main`. | Render |
| Fase 09 | Simular y aplicar **001** (roles) — antes de desplegar | Dev → Prod |
| Fase 13 | Simular y aplicar **002** (campos de producto) — antes de desplegar | Dev → Prod |
| Fase 15 | Simular y aplicar **003** (índices) — antes de desplegar | Dev → Prod |
| Fase 16 | `NEXT_PUBLIC_CHECKOUT_ENABLED=true` solo en local | `.env.local` |
| Fase 17 | `NEXT_PUBLIC_CHECKOUT_ENABLED=true` + redeploy, cuando decidas abrir el checkout | Render |
| Fase 18 | Reaplicar **003** (añade índices de cupones) | Dev → Prod |
| Fase 20 | `ADMIN_NOTIFY_EMAIL`; verificar dominio remitente | Render, Resend |

No hay pasos en Cloudflare en ninguna fase (salvo lo que resulte de la pregunta P3).

---

## Fuera del alcance de este plan

Se detectaron, se documentaron en el diagnóstico y **no** se abordan aquí:

- Pasarela de pago en línea (Culqi, Mercado Pago, Izipay, Niubiz…).
- Resolver el catálogo en el servidor (hoy cada página descarga todos los productos y filtra en el navegador): paginación, filtros en servidor, mejora de SEO.
- `sitemap.xml`, `robots.txt`, datos estructurados.
- Endurecer el CSP quitando `'unsafe-inline'`.
- Limpieza automática de imágenes huérfanas en Cloudinary.
- Comprobantes electrónicos (boleta/factura).
- Cupones por producto o categoría, tarjetas de regalo, puntos.
- Pruebas automáticas de interfaz (end-to-end) e integración continua.
- Sustituir las imágenes fijas alojadas en `postimg.cc`.

---

## Preguntas abiertas para el dueño

Ninguna respuesta se da por hecha. Donde el plan necesitaba avanzar, usa el **valor por defecto** indicado y lo marca en `03-decisiones.md`; cambiar la respuesta cambia solo las fases señaladas.

### Bloquean el inicio

| # | Pregunta | Por defecto | Afecta |
|---|---|---|---|
| **P0** | El encargo menciona "reglas de Nivel 1", pero no existen en el repositorio. ¿Apruebas las 10 propuestas en `03-decisiones.md`, o tienes las tuyas? | Las propuestas | Todo |
| **P1** | ¿`MONGODB_URI` de tu `.env.local` apunta a la **misma base que producción**? ¿Existe una base de desarrollo? Si no, recomiendo crear una (misma instancia de Atlas, otra base, copia de datos) antes de la fase 07. | Se asume que no hay base separada → hay que crearla | 07, 09, 13, 15, 17, 18 |
| **P2** | ¿Render despliega solo al hacer `push` a `main`? ¿Hay entorno de pruebas (staging)? ¿Quién fusiona las ramas: tú a mano, o quieres *pull requests* en GitHub? | Despliegue automático desde `main`; fusionas tú | Todas |
| **P17** | `scripts/create-admin.js` crea el usuario `admin` con la contraseña `admin123`. ¿Esa contraseña se cambió en producción? Si no estás seguro, cámbiala **hoy**, con independencia de este plan. | — | Seguridad actual |

### Infraestructura

| # | Pregunta | Por defecto | Afecta |
|---|---|---|---|
| **P3** | ¿Todo el tráfico de `jan-ku.com` pasa por el proxy de Cloudflare (nube naranja)? ¿Qué sirve `img.jan-ku.com` (R2, otro servidor)? ¿Se puede llegar a Render directamente por su URL `*.onrender.com`? | Sí pasa por Cloudflare; se confía en `cf-connecting-ip` | 07 |
| **P9** | ¿Qué plan de Resend tienes y está verificado el dominio de `FROM_EMAIL`? ¿A qué dirección quieres recibir el aviso de pedido nuevo? | Plan gratuito; dominio verificado | 20 |
| **P18** | `ADMIN_PASSWORD` y `MONGODB_DB` están definidas pero ningún archivo las usa, y `NEXT_PUBLIC_SITE_URL` está dos veces en `.env.local`. ¿Las limpio de `.env.example` y las retiras tú de Render? | Se omiten de `.env.example` | 01 |

### Catálogo e inventario

| # | Pregunta | Por defecto | Afecta |
|---|---|---|---|
| **P4** | Los productos marcados como **inactivos** hoy se siguen viendo en la tienda. ¿Deben ocultarse? | Sí, se ocultan | 10 |
| **P7** | Las promociones tienen etiqueta de stock manual pero no cantidad. ¿Basta así, o un pedido con una promoción debería descontar stock de los productos que la componen? | Basta así; no descuentan | 15, 17 |
| **P12** | ¿Usas banners animados (GIF)? El plan deja de aceptarlos al subir. | No se aceptan | 11 |
| **P13** | ¿Las cantidades de stock del panel son reales, o siguen siendo las estimaciones de la migración antigua (20 / 3 / 0)? Si son estimaciones, conviene un inventario real antes de abrir el checkout, porque los pedidos se validarán contra ellas. | Se asume que son reales | 13, 15, 17 |

### Pedidos

| # | Pregunta | Por defecto | Afecta |
|---|---|---|---|
| **P5** | ¿Confirmas que por ahora **no** hay pago en línea, y que el pago se coordina por WhatsApp y lo marcas tú en el panel? ¿Qué métodos aceptas (Yape, Plin, transferencia, efectivo…)? | Sin pasarela; esos cuatro + "otro" | 15, 17 |
| **P6** | ¿El delivery en Huancayo es siempre gratis? ¿Envías a otras ciudades, y cómo se calcula el costo? | Huancayo gratis; provincia "por coordinar" | 15, 16 |
| **P8** | ¿Solo aceptas celulares de Perú (9 dígitos)? ¿Tienes clientes en el extranjero? | Solo Perú | 15, 16 |
| **P14** | ¿Qué opciones de entrega quieres ofrecer y con qué nombre? ¿Existe "recojo en tienda"? | Delivery Huancayo, Recojo, Envío a otra ciudad | 16 |
| **P15** | ¿72 horas es un buen plazo para cancelar automáticamente un pedido que nadie confirmó? | 72 h | 17 |
| **P19** | ¿Necesitas pedir DNI o RUC en el checkout (para boleta o factura)? | No se pide | 15, 16 |
| **P20** | Al guardar nombre, teléfono y dirección de clientes aplica la Ley 29733 de protección de datos personales. ¿Tienes política de privacidad y términos publicados? El checkout debería enlazarlos. | No se enlaza nada (pendiente tuyo) | 16 |
| **P21** | El stock se descuenta al **confirmar** tú el pedido, no cuando el cliente lo crea (para que pedidos falsos no vacíen el inventario). ¿De acuerdo, o prefieres reservar al crear? | Al confirmar | 15, 17 |

### Cupones

| # | Pregunta | Por defecto | Afecta |
|---|---|---|---|
| **P10** | Si un cliente tiene descuento por monto **y** un cupón, ¿se suman o recibe solo el mayor? | Solo el mayor; cada cupón puede marcarse "acumulable" | 14, 18 |
| **P11** | ¿Se exige tener cuenta para usar un cupón? Sin cuenta, el límite "una vez por cliente" se controla por número de celular. | No se exige cuenta | 18, 19 |
| **P22** | ¿Necesitas desde ya cupones limitados a ciertos productos o categorías, o de "primera compra"? | No; solo cupones generales | 18 |

### Equipo y proceso

| # | Pregunta | Por defecto | Afecta |
|---|---|---|---|
| **P16** | El sitio declara un icono `/icon.png` que no existe (404 en cada visita). ¿Lo quito de la configuración o subes el archivo? | Se quita | 21 |
| **P23** | ¿Cuántas personas usan el panel hoy y cuántas lo usarán? ¿Los tres roles propuestos (superadmin, gestor, ventas) encajan con cómo trabajan? | Tres roles | 09, 21 |
| **P24** | Para las fases de alto riesgo, ¿usarás un modelo superior (Opus) para ejecutarlas, o Sonnet con tu revisión? Cada fase indica qué archivos concretos conviene dejar al modelo superior. | Modelo superior en 07, 08, 13, 15, 17, 18 | 07–18 |
| **P25** | ¿Hay algo que esperabas ver en este plan y no está, o algo de "Fuera del alcance" que quieras incluir? | — | — |
