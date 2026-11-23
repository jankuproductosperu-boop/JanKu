# Pendientes detectados fuera de fase

Cosas vistas durante una fase que no se arreglan "de paso" (CLAUDE.md). Se resuelven en la fase indicada.

| Detectado en | Qué | Fase sugerida |
|---|---|---|
| Fase 03 (2026-11-13) | ✅ **Resuelto en la fase 28 (D-95).** El CSP no incluye `blob:` en `img-src`. Al subir una imagen en `/admin`, la consola muestra "Loading the image 'blob:…' violates the following Content Security Policy directive" y la vista previa temporal se bloquea. La imagen subida (Cloudinary) se ve bien. Existe desde que se activó el CSP (commit `7a97da2`), no lo causó la fase 03. Se arregló sin relajar la CSP: la vista previa se lee como `data:`. | — |
| Fase 28 (2026-11-22) | `lucide-react` marca como obsoletos los iconos `Facebook`, `Instagram` y `Youtube` del Navbar (aviso del editor, no de lint). Una versión futura de la librería podría quitarlos; habría que dibujarlos como SVG propios. | Cuando se actualice `lucide-react` |
| Fase 28 (2026-11-22) | `log.error` registra `error.message`. Un error de clave duplicada de Mongo (dos registros simultáneos con el mismo correo) incluye el correo en el mensaje. Antes de la fase 28 pasaba igual con `console.error`. Arreglo: en `server/logger.ts`, no registrar el mensaje de errores de Mongo con código 11000. | Próxima fase que toque el logger |
