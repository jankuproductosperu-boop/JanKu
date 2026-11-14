import { Schema, model, models } from "mongoose";

// Libro de registro del inventario: solo se inserta. Nunca se edita ni se borra un movimiento.
const StockMovementSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    tipo: { type: String, enum: ["entrada", "salida", "ajuste", "pedido", "devolucion"], required: true },
    cantidad: { type: Number, required: true }, // con signo; nunca 0
    stockAntes: { type: Number, required: true },
    stockDespues: { type: Number, required: true },
    motivo: { type: String, maxlength: 200 },
    orderId: { type: Schema.Types.ObjectId, ref: "Order" },
    adminId: { type: Schema.Types.ObjectId, ref: "AdminUser" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

StockMovementSchema.index({ productId: 1, createdAt: -1 });
StockMovementSchema.index({ orderId: 1 });

// Defensa en profundidad: cualquier intento de modificar o borrar un movimiento falla.
StockMovementSchema.pre(
  ["updateOne", "updateMany", "findOneAndUpdate", "findOneAndReplace", "replaceOne", "deleteOne", "deleteMany", "findOneAndDelete"],
  function () {
    throw new Error("StockMovement es un registro de solo inserción: no se edita ni se borra");
  },
);

export default models.StockMovement || model("StockMovement", StockMovementSchema);
