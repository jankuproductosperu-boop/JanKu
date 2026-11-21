export type Category = {
  _id: string;
  nombre: string;
  slug: string;
  descripcion?: string;
  imagenUrl?: string;
  activo: boolean;
  orden?: number;
  padre?: string; // slug de la categoría madre (D-57, D-88); "" o ausente = categoría principal
};
export type CategoryInput = Omit<Category, "_id" | "slug"> & { slug?: string };
