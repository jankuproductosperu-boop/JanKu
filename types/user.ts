export type SessionUser = { id: string; nombre: string; email: string; emailVerificado?: boolean };
export type UserProfile = {
  _id: string;
  nombre: string;
  email: string;
  emailVerificado: boolean;
  /** "51" + 9 dígitos, o "" si no lo guardó (fase 20). */
  telefono?: string;
  direccion?: { calle?: string; ciudad?: string; departamento?: string; codigoPostal?: string };
  createdAt?: string;
  ultimoAcceso?: string;
};
