// Libro de Reclamaciones (fase 22b). Fechas como texto ISO.

export type ComplaintTipo = "reclamo" | "queja";
export type ComplaintEstado = "pendiente" | "respondido";
export type TipoDocumento = "DNI" | "CE" | "PASAPORTE";
export type ComplaintBienTipo = "producto" | "servicio";

export type ComplaintProveedor = {
  nombreComercial: string;
  titular: string;
  ruc: string;
  domicilio: string;
  correo: string;
};

export type ComplaintConsumidor = {
  nombre: string;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  domicilio: string;
  telefono: string;
  email: string;
};

export type ComplaintRepresentante = { nombre: string; tipoDocumento: TipoDocumento; numeroDocumento: string };

export type ComplaintBien = { tipo: ComplaintBienTipo; descripcion: string; montoReclamado?: number };

/** Lo que envía el formulario público (POST /api/complaints). */
export type ComplaintCreateInput = {
  consumidor: ComplaintConsumidor;
  representante?: ComplaintRepresentante;
  bien: ComplaintBien;
  pedidoCodigo?: string;
  tipo: ComplaintTipo;
  detalle: string;
  pedidoConsumidor: string;
  declaraVeracidad: true;
  website?: string;
};

/** Respuesta pública al registrar una hoja: nada más. */
export type ComplaintPublic = { codigo: string; fechaLimite: string };

/** Hoja completa, solo para el panel. */
export type Complaint = {
  _id: string;
  codigo: string;
  proveedor: ComplaintProveedor;
  consumidor: ComplaintConsumidor;
  representante?: ComplaintRepresentante;
  bien: ComplaintBien;
  pedidoCodigo?: string;
  tipo: ComplaintTipo;
  detalle: string;
  pedidoConsumidor: string;
  fechaLimite: string;
  estado: ComplaintEstado;
  respuesta?: { texto: string; fecha: string; adminId: string; adminNombre: string };
  copiaEnviada: boolean;
  respuestaEnviada: boolean;
  ip: string;
  createdAt: string;
  updatedAt: string;
};
