// Estadísticas de Google Analytics en el panel (fase 23b). Solo superadmin (`estadisticas.ver`).

export type RangoAnalytics = "7d" | "28d" | "90d";

export type KpiAnalytics = { actual: number; anterior: number; variacion: number | null };

export type AnalyticsResumen = {
  rango: RangoAnalytics;
  kpis: {
    usuarios: KpiAnalytics;
    sesiones: KpiAnalytics;
    vistas: KpiAnalytics;
    /** Segundos. */
    duracionMedia: KpiAnalytics;
    /** Porcentaje 0–100. */
    rebote: KpiAnalytics;
  };
  /** Un punto por día del rango, del más antiguo a hoy (días sin datos = 0). */
  serie: { fecha: string; usuarios: number; vistas: number }[];
  masVistos: { productoId: string; nombre: string; href: string; vistas: number }[];
  paginas: { ruta: string; vistas: number }[];
  origenes: { canal: string; sesiones: number }[];
  dispositivos: { tipo: string; usuarios: number }[];
  actualizado: string;
};

export type AnalyticsTiempoReal = { activos: number; actualizado: string };
