export type PopupDestinoTipo = "producto" | "categoria" | "promocion" | "enlace";

/** Lo que ve el panel. */
export type Popup = {
  imagenUrl: string;
  textoBoton: string;
  destinoTipo: PopupDestinoTipo;
  destinoRef: string; // _id del producto/promoción o slug de la categoría; vacío si es enlace libre
  enlace: string; // enlace final que usa la tienda
  activo: boolean;
  desde: string | null; // ISO
  hasta: string | null; // ISO
  updatedAt?: string;
};

export type PopupInput = Omit<Popup, "updatedAt">;

/** Lo que recibe la tienda: solo lo necesario para dibujarlo. */
export type PopupPublico = {
  imagenUrl: string;
  textoBoton: string;
  enlace: string;
  version: string; // updatedAt: cambia cuando se edita
};
