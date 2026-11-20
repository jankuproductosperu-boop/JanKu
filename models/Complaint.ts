import { Schema, model, models } from "mongoose";

// Hoja del Libro de Reclamaciones (fase 22b, D-79/D-80). Nunca se borra y la respuesta, una vez puesta,
// no se cambia: solo complaint.service la escribe con una actualización condicionada a estado "pendiente".
const DOCUMENTOS = ["DNI", "CE", "PASAPORTE"];

const ComplaintSchema = new Schema(
  {
    codigo: { type: String, required: true, unique: true, match: /^LR-\d{4}-\d{6}$/ },
    // Copia de LEGAL al crear: no cambia aunque LEGAL cambie.
    proveedor: {
      type: new Schema(
        {
          nombreComercial: { type: String, required: true },
          titular: { type: String, required: true },
          ruc: { type: String, required: true },
          domicilio: { type: String, required: true },
          correo: { type: String, required: true },
        },
        { _id: false },
      ),
      required: true,
    },
    consumidor: {
      type: new Schema(
        {
          nombre: { type: String, required: true, maxlength: 150 },
          tipoDocumento: { type: String, enum: DOCUMENTOS, required: true },
          numeroDocumento: { type: String, required: true, maxlength: 20 },
          domicilio: { type: String, required: true, maxlength: 300 },
          telefono: { type: String, required: true, maxlength: 20 },
          email: { type: String, required: true, maxlength: 200 },
        },
        { _id: false },
      ),
      required: true,
    },
    representante: {
      type: new Schema(
        {
          nombre: { type: String, required: true, maxlength: 150 },
          tipoDocumento: { type: String, enum: DOCUMENTOS, required: true },
          numeroDocumento: { type: String, required: true, maxlength: 20 },
        },
        { _id: false },
      ),
      default: undefined,
    },
    bien: {
      type: new Schema(
        {
          tipo: { type: String, enum: ["producto", "servicio"], required: true },
          descripcion: { type: String, required: true, maxlength: 500 },
          montoReclamado: { type: Number, min: 0 },
        },
        { _id: false },
      ),
      required: true,
    },
    pedidoCodigo: { type: String, maxlength: 30 },
    tipo: { type: String, enum: ["reclamo", "queja"], required: true },
    detalle: { type: String, required: true, maxlength: 3000 },
    pedidoConsumidor: { type: String, required: true, maxlength: 1000 },
    fechaLimite: { type: Date, required: true },
    estado: { type: String, enum: ["pendiente", "respondido"], required: true, default: "pendiente" },
    respuesta: {
      type: new Schema(
        {
          texto: { type: String, required: true, maxlength: 3000 },
          fecha: { type: Date, required: true },
          adminId: { type: Schema.Types.ObjectId, ref: "AdminUser", required: true },
          adminNombre: { type: String, required: true },
        },
        { _id: false },
      ),
      default: undefined,
    },
    copiaEnviada: { type: Boolean, required: true, default: false },
    respuestaEnviada: { type: Boolean, required: true, default: false },
    ip: { type: String, default: "" },
  },
  { timestamps: true },
);

// `codigo` ya es único por la opción del campo. Los tres índices los crea la migración 004.
ComplaintSchema.index({ estado: 1, fechaLimite: 1 });
ComplaintSchema.index({ createdAt: -1 });

// Defensa en profundidad (D-80): una hoja no se borra ni se reemplaza.
ComplaintSchema.pre(["deleteOne", "deleteMany", "findOneAndDelete", "findOneAndReplace", "replaceOne"], function () {
  throw new Error("Complaint es un registro: no se borra ni se reemplaza");
});

export default models.Complaint || model("Complaint", ComplaintSchema);
