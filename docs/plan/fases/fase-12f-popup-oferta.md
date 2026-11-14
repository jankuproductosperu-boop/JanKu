# Fase 12f · Popup de oferta

> ⚠️ **Cambia lo que ve el público (N1-1).** Requiere tu aprobación explícita antes de fusionar. Con el popup **inactivo o sin crear**, la tienda se ve y se comporta exactamente igual que hoy.

## 1. Objetivo y por qué va en este orden

Una ventana con una imagen de oferta y un botón que aparece al entrar a la tienda, con el fondo oscurecido. Se configura desde el panel (imagen, texto y destino del botón, interruptor activo/inactivo y fechas opcionales) (D-59).

Va después de la 12d (necesita el panel con su estilo final) y no depende de la 13 ni de pedidos. No choca con la fase 16: ésta solo toca carrito y checkout; lo único en común es `scripts/smoke.mjs` (líneas distintas).

**Cambio visible anunciado (tienda):** ventana de oferta al entrar, **solo si el popup está activo y dentro de sus fechas**.

## 2. Prerrequisitos

- Fases 12d y 12e fusionadas. Sin migración (colección nueva, aditiva, N1-3).
- Probar la subida de imagen requiere Cloudinary real: hazlo tú con una imagen de prueba y bórrala después (N1-8).
- Rama: `fase-12f-popup-oferta`. Modelo: **Sonnet**.

## 3. Archivos a crear, modificar o mover

| Acción | Ruta | Qué cambia |
|---|---|---|
| Crear | `lib/popup.ts` + `lib/__tests__/popup.test.ts` | `enlaceSeguro`, `popupVigente`, `debeMostrarPopup` (puras, con pruebas) |
| Crear | `types/popup.ts` · Modificar `types/index.ts` | Tipos `Popup`, `PopupInput`, `PopupPublico` |
| Crear | `models/Popup.ts` | Un único documento (`clave: "principal"`) |
| Crear | `server/validation/popup.schema.ts` | Esquema `.strict()` con las reglas de seguridad (sección 5) |
| Crear | `server/services/popup.service.ts` | `obtenerPopupAdmin`, `guardarPopup`, `obtenerPopupPublico` |
| Crear | `app/api/popup/route.ts` | `GET` público: popup vigente o `null` |
| Crear | `app/api/admin/popup/route.ts` | `GET` y `PUT` con `requireAdmin("catalogo.editar")` |
| Crear | `Components/OfferPopup/OfferPopup.tsx` | La ventana de la tienda |
| Modificar | `app/(tienda)/layout.tsx` | Monta `<OfferPopup />` |
| Crear | `app/(admin)/admin/popup/page.tsx` | Pantalla del panel |
| Crear | `app/(admin)/admin/_components/PopupForm.tsx` | Formulario con vista previa |
| Modificar | `app/(admin)/admin/_components/AdminSidebar.tsx` | Enlace «Popup de oferta» |
| Modificar | `scripts/smoke.mjs` | `GET /api/popup` → 200; `GET` y `PUT /api/admin/popup` sin cookie → 401 |

La imagen se sube por el `/api/upload` existente (entidad `banner`, subcarpeta `campanas`): no se toca el servicio de subida de la fase 11.

## 4. Pasos de implementación

1. Lógica pura y pruebas; tipos; modelo.
2. Esquema de validación, servicio y rutas (ruta delgada: guard → esquema → servicio → respuesta).
3. `OfferPopup`: consulta `/api/popup` (`cache: "no-store"`); si hay popup y no se cerró hace menos de 24 h (o el popup cambió), lo muestra tras 800 ms. Cierra con la X, con clic fuera o con Esc; al cerrar o pulsar el botón guarda el cierre en `localStorage` (dentro de `try/catch`). Bloquea el desplazamiento de fondo mientras está abierto.
4. Pantalla del panel: interruptor, imagen, texto del botón, destino (producto, categoría, promoción o enlace), fechas, vista previa y botón Guardar. El panel calcula el enlace final y lo guarda junto con el tipo y la referencia.
5. Enlace en el menú del panel y comprobaciones de humo.
6. typecheck, lint, test, build, smoke. Ejecutar la fase 00.

## 5. Contratos y seguridad

```ts
// GET /api/popup  →  PopupPublico | null   (solo si activo y dentro de fechas)
type PopupPublico = { imagenUrl: string; textoBoton: string; enlace: string; version: string };
// PUT /api/admin/popup  (cuerpo estricto)  →  Popup
type PopupInput = {
  imagenUrl: string; textoBoton: string; destinoTipo: "producto" | "categoria" | "promocion" | "enlace";
  destinoRef: string; enlace: string; activo: boolean; desde: string | null; hasta: string | null;
};
```

- `enlace`: solo ruta interna (`/…`, nunca `//host`) o `https://…`; se rechaza `javascript:`, `data:` y `http:`.
- `imagenUrl`: debe empezar por `https://res.cloudinary.com/`.
- Para guardar con `activo: true` deben existir imagen, texto del botón y enlace; `hasta` no puede ser anterior a `desde`.
- El `GET` público no expone `destinoRef`, fechas ni identificadores internos.
- Sin `dangerouslySetInnerHTML`. Los enlaces externos se abren con `rel="noopener noreferrer"`.
- Limitación conocida: si un producto cambia de nombre, el enlace guardado en el popup puede quedar desactualizado (el código corto del final sigue funcionando); se corrige volviendo a guardar el popup.

## 6. Reglas de Nivel 1 que esta fase podría romper

- **N1-1**: anunciado arriba. Verificar con el popup inactivo que la tienda es idéntica a la de la fase 00.
- **N1-4**: no se toca el CSP (la imagen sale de `res.cloudinary.com`, ya permitido); el endpoint de escritura tiene guard dentro del handler.
- **N1-6/N1-7**: rutas nuevas, sin cambios en contratos existentes ni dependencias nuevas.
- **No hacer**: ampliar el servicio de subida; tocar `proxy.ts`.

## 7. Criterios de aceptación verificables

- `npm test` incluye y pasa `popup.test.ts`.
- `git diff main -- next.config.ts proxy.ts server/services/upload.service.ts` → vacío.
- typecheck, lint (sin errores nuevos), test, build y smoke en verde.

## 8. Checklist de pruebas manuales para mí

- [ ] Fase 00 con el popup sin crear o inactivo: la tienda se ve igual.
- [ ] `/admin/popup`: subir una imagen de prueba, poner texto de botón, elegir destino (probar producto, categoría, promoción y enlace), activar y guardar. La vista previa coincide.
- [ ] Abrir la tienda en una ventana de incógnito: tras un instante aparece la ventana con fondo oscurecido; el botón lleva al destino elegido.
- [ ] Cerrar con la X, con clic fuera y con Esc. Recargar: no vuelve a salir (24 h). Guardar cambios en el panel: vuelve a salir.
- [ ] Desactivarlo: la tienda carga normal, sin ventana.
- [ ] Fechas: con «Hasta» en el pasado no aparece; con «Desde» en el futuro tampoco.
- [ ] En móvil se ve completo, sin cortarse, y la X es fácil de pulsar.
- [ ] Probar un enlace libre inválido (`javascript:alert(1)`, `http://…`): el panel lo rechaza.
- [ ] Borrar la imagen de prueba de Cloudinary al terminar.

## 9. Plan de reversa

`git revert` del commit de fusión. La colección `popups` queda en la base sin uso (N1-3: no se borran colecciones).

## 10. Qué NO tocar

Servicio de subida; `proxy.ts`; los banners existentes; el carrito.

## 11. Modelo recomendado

**Sonnet**, una sesión. Si hace falta ampliar el servicio de subida o relajar el CSP, detenerse y preguntar.
