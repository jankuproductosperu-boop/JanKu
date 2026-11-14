# Propuestas posteriores al rediseño del panel

Alcance y decisiones ya acordadas con el dueño. **Aún no son fases ejecutables**: cuando toque cada una se redacta su archivo en `fases/` con los 11 apartados. Decisiones D-55 a D-59 en `03-decisiones.md`.

| Id | Propuesta | Riesgo | Modelo | Va después de | ¿Cambia la tienda? |
|---|---|---|---|---|---|
| **13b** | Variantes opcionales de producto + `padre` opcional en categoría | ⚠️ Alto | **Superior** | 13 | Solo si un producto tiene variantes |
| **12e** | Novedades de la semana | Bajo | Sonnet | 12c | Sí: sección en el inicio y etiqueta «Nuevo» |
| **12f** | Popup de oferta con interruptor | Medio | Sonnet | 12d | Sí: ventana al entrar, solo si está activo |
| **21b** | Visitas y productos más vistos | Medio | Sonnet | 12b | No (el registro es invisible); el Resumen gana tarjetas |

## 13b · Variantes y categorías escalables

- **Variantes** (D-56): opcionales y de ejes libres (color, talla, material…). Un producto sin variantes funciona exactamente como hoy. Con variantes: cada combinación tiene su stock, y opcionalmente precio e imagen. El stock total del producto es la suma. El inventario muestra una fila por variante; carrito, pedido y mensaje de WhatsApp llevan la variante elegida («Mochila – Negro»).
- **Toca**: modelo `Product` (campo opcional `variantes`), `inventory.service` (el stock de una variante pasa por el mismo servicio y deja `StockMovement`), `lib/pricing.ts`, carrito, pedidos (fase 15), ficha de producto de la tienda. Por eso es alto riesgo y se hace con modelo superior.
- **Orden**: justo después de la 13 y **antes de la 14/15**, para no rehacer pedidos.
- **Categorías** (D-57): solo la base. Campo opcional `padre` en `Category`; sin interfaz pública ni en el panel hasta que el catálogo lo pida. Atributos por categoría (capacidad, talla…) quedan descritos pero no se construyen.
- **Migración**: aditiva (N1-3). Los campos nuevos son opcionales; no hace falta migrar datos.

## 12e · Novedades de la semana

> **Ya tiene su archivo de fase:** [fase-12e-novedades.md](fases/fase-12e-novedades.md). Lo de abajo es el borrador original (la pantalla «Novedades» opcional no se construyó: la gestión es desde Productos).

- Campo opcional `nuevoHasta` (fecha) en `Product`. Si es posterior a hoy, el producto es «novedad»: sin tareas programadas, el estado se calcula al consultar (D-58).
- Panel: interruptor «Novedad de la semana» en el formulario de producto (rellena `nuevoHasta` = hoy + 7 días) y acción masiva «Marcar como novedad» en la lista. Pantalla «Novedades» opcional con la lista vigente.
- Tienda: sección «Novedades» en el inicio y etiqueta «Nuevo» en la tarjeta. **El producto no se mueve de su categoría**; aparece además en Novedades.
- La proyección pública debe exponer `nuevoHasta` (campo opcional añadido, N1-6).

## 12f · Popup de oferta

> **Ya tiene su archivo de fase:** [fase-12f-popup-oferta.md](fases/fase-12f-popup-oferta.md). Lo de abajo es el borrador original.

- Colección nueva con un único documento «popup» (D-59): `imagenUrl` (Cloudinary, mismas reglas de subida que los banners), `textoBoton`, `destino` (producto, categoría, promoción o enlace libre), `activo`, `desde`, `hasta` (opcionales).
- Panel: pantalla «Popup de oferta» con vista previa, selector de destino y interruptor Activo/Inactivo.
- Tienda: al entrar, si está activo y dentro de fechas, tarjeta centrada con fondo oscurecido y botón de cierre; al cerrarla no vuelve a salir durante 24 h (`localStorage` dentro de `try/catch`). Inactivo = la tienda carga igual que hoy.
- Sin `dangerouslySetInnerHTML`; el enlace libre se valida (solo `https:` o rutas internas). **Va con aprobación explícita del dueño** porque cambia lo que ve el público (N1-1).

## 21b · Visitas y más vistos

- Registro propio y simple (D-55): colección `ProductView` con `productId`, día y contador (un documento por producto y día, incremento atómico). Se registra al abrir la ficha del producto con una llamada ligera; se ignoran bots conocidos y recargas seguidas de la misma sesión. Sin guardar IP ni datos personales.
- Panel: tarjetas «Visitas a productos hoy» y «Más vistos esta semana» en el Resumen; pantalla «Estadísticas» con rango de fechas.
- Todo lo demás (orígenes de tráfico, dispositivos, embudos) se sigue viendo en Google Analytics (`NEXT_PUBLIC_GA_ID`); no se reinventa.
- Las cifras son aproximadas: sirven para comparar productos, no como contabilidad.

## Secciones del diseño de referencia que NO se construyen

Proveedores, Biblioteca de medios, Configuración de la tienda y campana de alertas (D-51). «Clientes», «Registro de cambios» y «Reportes» quedan como ideas para después; no tienen fase.
