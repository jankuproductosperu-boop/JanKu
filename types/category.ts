export type Category = {
  _id: string;
  nombre: string;
  slug: string;
  descripcion?: string;
  imagenUrl?: string;
  activo: boolean;
  orden?: number;
};
export type CategoryInput = Omit<Category, "_id" | "slug"> & { slug?: string };
