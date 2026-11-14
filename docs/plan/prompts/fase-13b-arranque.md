# Prompts de arranque · Fase 13b (variantes)

Pega cada prompt **tal cual** en una sesión nueva (tras `/clear`). El modelo recomendado es uno superior (Opus). Antes de empezar, `main` debe incluir el plan de la 13b (`docs/plan/fases/fase-13b-variantes.md`).

Antes de lanzar la sesión: reinicia tu `npm run dev` **después** de cada cambio de modelos y deja el servidor corriendo tú; el modelo no lo lanza.

---

## Sesión A · backend

```
Vas a ejecutar la sesión A de la fase 13b de Janku (variantes de producto, parte backend).

Lee, en este orden y solo esto:
1. CLAUDE.md (raíz) y sus Reglas de Nivel 1.
2. docs/plan/README.md.
3. docs/plan/fases/fase-13b-variantes.md (solo esa fase). Haz SOLO los pasos 1 a 7 (sesión A) y la lista "Sesión A · backend".
4. Las decisiones D-56, D-57 y D-60 a D-67 de docs/plan/03-decisiones.md.
5. Para entender lo que ya existe: server/services/inventory.service.ts, server/services/product.service.ts, models/Product.ts, models/StockMovement.ts, lib/stock.ts y las notas de implementación al final de docs/plan/fases/fase-13-inventario-movimientos.md.

Reglas de esta sesión:
- Rama fase-13b-variantes creada desde main actualizado.
- Empieza por lib/variantes.ts y sus pruebas (paso 1), antes de tocar nada más.
- No tomes decisiones de arquitectura: están en la fase y en las decisiones. Si algo no está especificado o el código contradice el plan, DETENTE y pregúntame.
- No toques archivos fuera de la lista de la sesión A. No instales dependencias.
- No abras ni muestres .env*. No ejecutes scripts contra la base, ni --apply, ni git push. No lances npm run dev (lo corro yo).
- La integridad del stock es lo crítico: toda escritura de stockCantidad (de producto o de variante) pasa por ajustarStock dentro de una transacción, con escritura condicional. Piensa en concurrencia antes de escribir.
- Commits pequeños, en español, con la línea Co-Authored-By.

Al terminar: npm run typecheck, npm run lint (la línea base son 4 errores en lib/cache.ts y server/db.ts; no deben aparecer nuevos), npm test, npm run build y npm run smoke. Reporta resultados REALES (si algo falla, pega la salida). Lista: qué hiciste, qué desviaciones del plan hubo y por qué, y qué debo revisar yo a mano (inventory.service.ts y product.service.ts). No fusiones a main: pregúntame primero.
```

---

## Sesión B · panel y tienda

```
Vas a ejecutar la sesión B de la fase 13b de Janku (variantes de producto, panel y tienda). La sesión A (backend) ya está hecha y fusionada o en la rama fase-13b-variantes: comprueba con git log y dime en qué estado la encuentras antes de empezar.

Lee, en este orden y solo esto:
1. CLAUDE.md (raíz) y sus Reglas de Nivel 1.
2. docs/plan/README.md.
3. docs/plan/fases/fase-13b-variantes.md. Haz SOLO los pasos 8 a 15 (sesión B) y la lista "Sesión B · panel y tienda".
4. Las decisiones D-60 a D-67 de docs/plan/03-decisiones.md.
5. Para entender lo que ya existe: context/CartContext.tsx, app/(tienda)/producto/[slug]/ProductPageClient.tsx, Components/ProductCard/ProductCard.tsx, Components/Cart/CartSidebar.tsx, app/(tienda)/carrito/page.tsx, app/(admin)/admin/_components/ProductoForm.tsx, app/(admin)/admin/inventario/page.tsx y lib/variantes.ts (ya creado en la sesión A).

Reglas de esta sesión:
- Continúa en la rama fase-13b-variantes (o créala desde main si la sesión A ya se fusionó).
- N1-1 es la regla clave: un producto SIN variantes debe verse y comportarse exactamente igual que hoy, incluida la tarjeta, la ficha, el carrito y el mensaje de WhatsApp. Un carrito ya guardado en localStorage en el formato antiguo debe seguir funcionando.
- No tomes decisiones de arquitectura. Si algo no está especificado o el código contradice el plan, DETENTE y pregúntame.
- No toques archivos fuera de la lista de la sesión B (los avisos en las fases 14, 15 y 17 son solo texto). No instales dependencias.
- Sigue el estilo del panel: componentes en app/(admin)/admin/_components/, imports con @/..., colores con los tokens var(--surface), var(--ink), var(--line), etc. (modo claro y oscuro). Texto visible en español, de tú.
- No abras ni muestres .env*. No ejecutes scripts contra la base, ni --apply, ni git push. No lances npm run dev (lo corro yo). Subir imágenes a Cloudinary real solo si yo te lo autorizo en esta sesión.
- Commits pequeños, en español, con la línea Co-Authored-By.

Al terminar: npm run typecheck, npm run lint (la línea base son 4 errores en lib/cache.ts y server/db.ts), npm test, npm run build y npm run smoke. Reporta resultados REALES. Entrégame el checklist de la sección 8 de la fase para que lo pruebe yo. Avisa qué debo revisar a mano (sobre todo context/CartContext.tsx). No fusiones a main: pregúntame primero.
```

---

## Si algo se tuerce

- El modelo se detiene a preguntar: responde con la decisión; si cambia el plan, pídele que actualice `fase-13b-variantes.md` y las decisiones.
- El modelo propone «arreglar de paso» algo fuera de la fase: que lo anote en `docs/plan/pendientes.md` y siga.
- Si el typecheck encadena muchos errores en `CartContext.tsx`: detener, `git stash` y revisar contigo el diseño de `lineaId` antes de seguir.
