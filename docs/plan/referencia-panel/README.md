# Referencia visual del panel

| Archivo | Qué es |
|---|---|
| `panel-referencia-v2.html` | **La referencia vigente.** Ábrela en el navegador. Pantallas: Resumen, Productos (lista), Editar producto. Barra lateral a la izquierda, modo oscuro (botón ◐), versión móvil (☰). |
| `original-del-dueno.html` | El diseño original que hizo el dueño. Solo para consultar; **no es la referencia**. |

Reglas de uso (válidas para el modelo que ejecute las fases 12b a 12d):

1. Es una **referencia visual**: captura el esqueleto, las proporciones y el estilo. No se copia el HTML; el panel real usa Tailwind 4, componentes React y rutas.
2. Los datos del HTML son de ejemplo. Lo que no exista en la base de datos todavía (pedidos, clientes, cupones, visitas) **no se muestra** hasta que su fase lo cree (ver `fase-12b`, paso 5).
3. Sin fuentes externas: el CSP solo permite `'self'` (N1-4).
4. Los ítems de menú del HTML cuyas pantallas aún no existen (Novedades, Pedidos, Clientes, Descuentos y cupones, Popup, Estadísticas, Usuarios, Registro) se añaden al menú real **en la fase que los crea**.
5. Descartado a propósito (D-51): Proveedores, Biblioteca de medios, Configuración de la tienda y campana de alertas.
