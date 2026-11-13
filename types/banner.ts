export type BannerPosicion = "top-left" | "top-right" | "middle-full" | "bottom-left" | "bottom-right";
export type Banner = {
  _id: string;
  titulo: string;
  imagenUrl: string;
  enlace?: string;
  posicion?: BannerPosicion;
  ubicaciones?: string[];
  activo: boolean;
};
export type BannerInput = Omit<Banner, "_id">;
