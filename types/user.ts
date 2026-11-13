export type SessionUser = { id: string; nombre: string; email: string; emailVerificado?: boolean };
export type UserProfile = {
  _id: string;
  nombre: string;
  email: string;
  emailVerificado: boolean;
  direccion?: { calle?: string; ciudad?: string; departamento?: string; codigoPostal?: string };
  createdAt?: string;
  ultimoAcceso?: string;
};
