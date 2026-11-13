# Pendientes detectados fuera de fase

Cosas vistas durante una fase que no se arreglan "de paso" (CLAUDE.md). Se resuelven en la fase indicada.

| Detectado en | Qué | Fase sugerida |
|---|---|---|
| Fase 03 (2026-11-13) | El CSP no incluye `blob:` en `img-src`. Al subir una imagen en `/admin`, la consola muestra "Loading the image 'blob:…' violates the following Content Security Policy directive" y la vista previa temporal se bloquea. La imagen subida (Cloudinary) se ve bien. Existe desde que se activó el CSP (commit `7a97da2`), no lo causó la fase 03. Arreglo: añadir `blob:` a `img-src` en `next.config.ts`. | 11 (subida a Cloudinary) o 12 (panel) |
