import { Schema, model, models } from "mongoose";

// Pedido (fase 15). El precio, el nombre y el costo de cada ítem son una copia del momento de la compra.
const ItemSchema = new Schema(
  {
    tipo: { type: String, enum: ["producto", "promocion"], required: true },
    refId: { type: Schema.Types.ObjectId, required: true },
    varianteId: { type: Schema.Types.ObjectId },
    varianteEtiqueta: { type: String, maxlength: 200 },
    nombre: { type: String, required: true },
    codigo: { type: String, default: "" },
    imagenUrl: { type: String, default: "" },
    precioUnitario: { type: Number, required: true, min: 0 },
    cantidad: { type: Number, required: true, min: 1, max: 99 },
    subtotal: { type: Number, required: true, min: 0 },
    precioCosto: { type: Number, default: 0, min: 0 }, // nunca sale en respuestas públicas
  },
  { _id: false },
);

const HistorialSchema = new Schema(
  {
    estado: { type: String, required: true },
    fecha: { type: Date, required: true },
    adminId: { type: Schema.Types.ObjectId, ref: "AdminUser" },
    nota: { type: String, maxlength: 500 },
  },
  { _id: false },
);

const OrderSchema = new Schema(
  {
    codigo: { type: String, required: true, unique: true, uppercase: true, trim: true },
    tokenAccesoHash: { type: String, required: true, select: false },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    cliente: {
      nombre: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
      telefono: { type: String, required: true, match: /^519\d{8}$/ },
      email: { type: String, default: "", lowercase: true, trim: true, maxlength: 200 },
    },
    entrega: {
      // "recojo" se conserva solo para pedidos antiguos (D-72).
      metodo: { type: String, enum: ["delivery_huancayo", "punto_entrega", "envio_provincia", "recojo"], required: true },
      direccion: { type: String, default: "", maxlength: 200 },
      referencia: { type: String, default: "", maxlength: 200 },
      ciudad: { type: String, default: "", maxlength: 100 },
      departamento: { type: String, default: "", maxlength: 100 },
      provincia: { type: String, default: "", maxlength: 100 }, // fase 16b (D-73)
      // Copia del punto al momento del pedido (D-72): editar el punto después no cambia este pedido.
      puntoEntrega: {
        type: new Schema(
          {
            puntoId: { type: Schema.Types.ObjectId, ref: "DeliveryPoint" },
            nombre: { type: String, maxlength: 100 },
            direccion: { type: String, maxlength: 200 },
            referencia: { type: String, maxlength: 200 },
            horario: { type: String, maxlength: 200 },
          },
          { _id: false },
        ),
        default: null,
      },
    },
    items: {
      type: [ItemSchema],
      required: true,
      validate: { validator: (v: unknown[]) => v.length >= 1 && v.length <= 50, message: "Entre 1 y 50 ítems" },
    },
    subtotal: { type: Number, required: true, min: 0 },
    descuentoNivel: {
      type: new Schema(
        {
          nivelId: { type: Schema.Types.ObjectId },
          nombre: { type: String },
          monto: { type: Number },
        },
        { _id: false },
      ),
      default: null,
    },
    cupon: {
      type: new Schema(
        {
          couponId: { type: Schema.Types.ObjectId },
          codigo: { type: String },
          monto: { type: Number },
        },
        { _id: false },
      ),
      default: null,
    },
    descuentoTotal: { type: Number, required: true, default: 0, min: 0 },
    costoEnvio: { type: Number, required: true, default: 0, min: 0 },
    envioPorCoordinar: { type: Boolean, required: true, default: false },
    total: { type: Number, required: true, min: 0 },
    estado: {
      type: String,
      enum: ["pendiente", "confirmado", "enviado", "entregado", "cancelado"],
      required: true,
      default: "pendiente",
    },
    pago: {
      estado: { type: String, enum: ["pendiente", "pagado", "reembolsado"], required: true, default: "pendiente" },
      metodo: { type: String, enum: ["", "yape", "plin", "transferencia", "efectivo", "otro"], default: "" },
      referencia: { type: String, default: "", maxlength: 100 },
      fecha: { type: Date, default: null },
    },
    stockDescontado: { type: Boolean, required: true, default: false },
    notasCliente: { type: String, default: "", maxlength: 500 },
    notasInternas: { type: String, default: "", maxlength: 2000 },
    historial: { type: [HistorialSchema], required: true },
    origen: {
      ip: { type: String },
      userAgent: { type: String, maxlength: 200 },
    },
  },
  { timestamps: true },
);

// `codigo` ya es único por la opción del campo.
OrderSchema.index({ estado: 1, createdAt: -1 });
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ "cliente.telefono": 1, createdAt: -1 });

export default models.Order || model("Order", OrderSchema);
