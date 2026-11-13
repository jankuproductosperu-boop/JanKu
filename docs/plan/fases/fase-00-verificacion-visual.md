# Fase 00 · Verificación visual del sitio público (transversal)

> **Esta fase no se ejecuta una vez: se repite al cerrar CADA fase (01 a 21).** Ninguna fase está terminada hasta que esta lista pasa completa. Es la aplicación práctica de la regla N1-1.

## 1. Objetivo y por qué va en este orden

Comprobar que el sitio que ven los clientes sigue igual después de cada cambio. El proyecto no tiene pruebas automáticas de interfaz, así que la red de seguridad es: (a) una prueba de humo automática que hace el ejecutor y (b) un recorrido visual que hace el dueño.

Va primero porque define el "antes": las capturas de referencia se toman **antes de empezar la fase 01**.

## 2. Prerrequisitos

- **Paso manual del dueño (una sola vez, antes de la fase 01):** con el sitio tal como está hoy, tomar las capturas de la sección 8 en escritorio (1440 px de ancho) y móvil (390 px) y guardarlas en `docs/plan/capturas/referencia/` con los nombres indicados. Esa carpeta no se sube a git si pesa mucho (añadirla a `.gitignore` es decisión del dueño).
- Servidor local funcionando: `npm run dev` en `http://localhost:3000`.
- El script `npm run smoke` existe desde la fase 01. Durante la fase 01 se crea; antes de eso solo aplica la parte manual.

## 3. Archivos a crear, modificar o mover

Ninguno. Esta fase solo lee y observa. (El script `scripts/smoke.mjs` lo crea la fase 01.)

## 4. Pasos de implementación

Para el **ejecutor**, al terminar cualquier fase:

1. `npm run typecheck` → 0 errores.
2. `npm run lint` → el número de errores no supera el de `docs/plan/linea-base.md`.
3. `npm test` → todo en verde.
4. `npm run build` → termina sin errores. Anotar si aparece algún aviso nuevo.
5. Arrancar `npm run dev` y ejecutar `npm run smoke` en otra terminal → todo en verde.
6. Revisar la consola del servidor durante el smoke: no debe aparecer ningún error ni traza nueva.
7. Reportar al dueño el resultado de los pasos 1–6 **con la salida real** y pedirle que haga la sección 8.

El ejecutor **no** declara la verificación visual como aprobada: solo el dueño puede hacerlo.

## 5. Contratos

`npm run smoke` (definido en la fase 01) comprueba contra `SMOKE_BASE_URL` (por defecto `http://localhost:3000`):

| Petición | Esperado |
|---|---|
| `GET /`, `/promociones`, `/carrito`, `/favoritos`, `/busqueda?q=a`, `/contacto`, `/nosotros`, `/auth/login`, `/auth/registro`, `/auth/recuperar-contrasena`, `/login-admin` | 200 y `content-type` HTML |
| `GET /admin` sin cookie | redirección (307/308) a `/login-admin` |
| `GET /auth/perfil` sin cookie | redirección a `/auth/login` |
| `GET /api/products`, `/api/categories`, `/api/banners`, `/api/promotions`, `/api/discounts` | 200 y cuerpo JSON que es un arreglo |
| `POST /api/products` sin cookie, cuerpo `{}` | 401 |
| `DELETE /api/upload/delete` sin cookie | 401 |
| `GET /api/auth/check` y `/api/auth-user/check` sin cookie | 401 |
| Cabeceras de `GET /` | incluyen `content-security-policy`, `x-frame-options: DENY`, `x-content-type-options: nosniff` |

Solo hace lecturas y peticiones que deben ser rechazadas: **nunca escribe datos**. Cada fase que añade rutas públicas añade sus líneas a esta tabla y al script.

## 6. Reglas de Nivel 1 que esta fase podría romper y cómo evitarlo

- **N1-8**: el smoke apunta a `localhost` por defecto. No ejecutarlo contra producción salvo que el dueño lo pida y fije `SMOKE_BASE_URL` él mismo.
- **N1-10**: no maquillar resultados. Si un paso falla, se reporta el fallo.

## 7. Criterios de aceptación verificables

- Los pasos 1–6 de la sección 4 pasan.
- El dueño marca como correcta toda la lista de la sección 8, o las diferencias que encuentra son exactamente las que la fase anunciaba en su propio documento.

## 8. Checklist de pruebas manuales para mí

Hacerlo en **escritorio (1440 px)** y **móvil (390 px)**. Comparar contra `docs/plan/capturas/referencia/`.

**Páginas (captura con el mismo nombre)**
- [ ] `inicio` — `/`: banner superior, carrusel/encabezado, productos destacados, banners intermedios, sección de información y beneficios, pie.
- [ ] `categoria` — entrar a una categoría desde el menú: banner, productos en el orden manual configurado, filtros y orden funcionan.
- [ ] `producto` — abrir un producto: galería, precio, etiqueta de stock, características, video si tiene, productos relacionados, botón de WhatsApp.
- [ ] `promociones` y `promocion` — listado y detalle.
- [ ] `busqueda` — buscar una palabra con resultados y otra sin resultados.
- [ ] `carrito-vacio` y `carrito-lleno` — `/carrito`.
- [ ] `favoritos` — `/favoritos` con al menos un producto.
- [ ] `login`, `registro` — `/auth/login`, `/auth/registro`.
- [ ] `contacto`, `nosotros`.

**Comportamiento**
- [ ] El menú muestra las categorías activas y se esconde/aparece al hacer scroll.
- [ ] Añadir un producto al carrito: aparece el aviso, sube el contador del botón flotante, se abre el panel lateral.
- [ ] Cambiar cantidades en el panel y en `/carrito`: subtotal y total se actualizan.
- [ ] Con un carrito que supera un descuento por monto: aparece "¡Descuento aplicado!" y el total baja. Con uno que no llega: aparece "Agrega S/ X más…".
- [ ] Recargar la página: el carrito y los favoritos siguen ahí.
- [ ] Botón de pedido → abre WhatsApp con el detalle correcto (productos, cantidades, descuento, total). *(Desde la fase 16, con el interruptor encendido, lleva a `/checkout`.)*
- [ ] Botón flotante de WhatsApp abre el chat.
- [ ] Marcar y desmarcar un favorito.
- [ ] Compartir el enlace de un producto por WhatsApp: se ve título, descripción e imagen (vista previa).
- [ ] Un enlace viejo de producto (guardado antes) sigue abriendo el producto.

**Consola del navegador (F12)**
- [ ] Sin errores en rojo nuevos en inicio, categoría, producto y carrito.
- [ ] Sin avisos de "Content Security Policy" bloqueando recursos.

**Sesión de cliente**
- [ ] Iniciar sesión con una cuenta de prueba, ver `/auth/perfil`, cerrar sesión.

**Panel admin** (rápido; cada fase añade lo suyo)
- [ ] `/login-admin` permite entrar; `/admin` carga productos, banners, categorías y promociones.

## 9. Plan de reversa

No aplica: esta fase no cambia nada. Si la verificación falla, se revierte **la fase que se estaba cerrando** según su propio plan de reversa.

## 10. Qué NO tocar en esta fase

Todo. No se corrige nada "de paso" durante la verificación: lo que falle se reporta y se arregla dentro de la fase que lo causó.

## 11. Modelo recomendado

**Sonnet** para los pasos automáticos. La parte visual es del dueño; ningún modelo la sustituye.
