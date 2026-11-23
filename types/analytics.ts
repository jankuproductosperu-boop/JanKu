// Estadísticas de Google Analytics en el panel (fase 23b). Solo superadmin (`estadisticas.ver`).

export type RangoAnalytics = "7d" | "28d" | "90d";

export type KpiAnalytics = { actual: number; anterior: number; variacion: number | null };

export type AnalyticsResumen = {
  rango: RangoAnalytics;
  /** Mismo criterio que Google Analytics: el periodo termina AYER (hoy aún está incompleto). */
  kpis: {
    usuarios: KpiAnalytics;
    sesiones: KpiAnalytics;
    vistas: KpiAnalytics;
    /** Segundos. */
    duracionMedia: KpiAnalytics;
    /** Porcentaje 0–100. */
    rebote: KpiAnalytics;
  };
  /** Hoy hasta ahora (para el Resumen). */
  hoy: { usuarios: number; vistas: number };
  /** Un punto por día del rango, del más antiguo a ayer (días sin datos = 0). */
  serie: { fecha: string; usuarios: number; vistas: number }[];
  /** Usuarios por mes: este año frente al año pasado. `mes` 1–12. */
  mensual: { mes: number; esteAnio: number; anioPasado: number }[];
  masVistos: { productoId: string; nombre: string; href: string; vistas: number }[];
  /** `porcentaje`: parte de los usuarios del periodo que vio la página (0–100). */
  paginas: { ruta: string; vistas: number; usuarios: number; porcentaje: number }[];
  /** `codigo`: país ISO de 2 letras ("PE"), o "" si Google no lo sabe. Hasta 100, de más a menos usuarios (fase 23d). */
  paises: { codigo: string; usuarios: number }[];
  /** Usuarios por región del Perú, con el nombre tal como lo da Google («Junin», «Lima Region»). Fase 23d. */
  regiones?: { region: string; usuarios: number }[];
  /** Ciudades con más usuarios; `porcentaje` sobre los usuarios del periodo (0–100). */
  ciudades: { ciudad: string; usuarios: number; vistas: number; porcentaje: number }[];
  /** Las 4 fuentes principales y "Otros"; `porcentaje` de las sesiones. */
  fuentes: { fuente: string; sesiones: number; porcentaje: number }[];
  dispositivos: { tipo: string; usuarios: number; variacion: number | null }[];
  actualizado: string;
};

export type AnalyticsTiempoReal = { activos: number; actualizado: string };
