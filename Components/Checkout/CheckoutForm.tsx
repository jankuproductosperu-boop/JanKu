"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { lineaId } from "@/lib/variantes";
import { normalizarTelefono } from "@/lib/phone";
import { DEPARTAMENTOS, esDepartamento } from "@/lib/shipping";
import { CouponField } from "@/Components/Checkout/CouponField";
import type {
  CouponValidateResult,
  DeliveryPointPublic,
  MetodoEntrega,
  OrderCreateInput,
  OrderCreateResult,
} from "@/types";

type CuponValido = Extract<CouponValidateResult, { valido: true }>;

type Errores = Record<string, string>;
type Aviso = { texto: string; productos?: { nombre: string; motivo: string }[]; volverAlCarrito?: boolean };

// Textos de la fase 16b (D-71/72/73). "recojo" ya no se ofrece.
const AYUDA_DELIVERY_ADICIONAL = "Se cobrará un adicional por el delivery; te avisaremos el costo por WhatsApp";
const AVISO_PROVINCIA = "La agencia de envío, tu DNI y el resto de datos los coordinamos por WhatsApp.";

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NOTAS = 500;

const clase = (error?: string) =>
  `w-full border-2 rounded-lg px-3 py-2.5 text-base outline-none transition focus:border-[#2C2C6C] ${
    error ? "border-red-400" : "border-gray-300"
  }`;

function Campo(props: { id: string; etiqueta: string; error?: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={props.id} className="block text-sm font-semibold text-gray-700 mb-1">
        {props.etiqueta}
      </label>
      {props.children}
      {props.ayuda && !props.error && <p className="text-xs text-gray-500 mt-1">{props.ayuda}</p>}
      {props.error && (
        <p id={`${props.id}-error`} role="alert" className="text-sm text-red-600 mt-1">
          {props.error}
        </p>
      )}
    </div>
  );
}

type Props = {
  metodo: MetodoEntrega;
  onMetodoChange: (metodo: MetodoEntrega) => void;
  /** Solo para mostrar (D-71); null mientras se calcula. El servidor decide. */
  deliveryGratis: boolean | null;
  nombreInicial?: string;
  emailInicial?: string;
  /** El teléfono vive en la página: el cupón aplicado depende de él (fase 19). */
  telefono: string;
  onTelefonoChange: (telefono: string) => void;
  /** Cupón validado por el servidor para el carrito y teléfono actuales; null si no hay. */
  cupon: { codigo: string; resultado: CuponValido } | null;
  /** Había un cupón, pero cambió el carrito o el teléfono: hay que volver a aplicarlo. */
  cuponCaducado: boolean;
  onCuponAplicar: (r: CuponValido) => void;
  onCuponQuitar: () => void;
};

export function CheckoutForm({
  metodo,
  onMetodoChange,
  deliveryGratis,
  nombreInicial = "",
  emailInicial = "",
  telefono,
  onTelefonoChange: setTelefono,
  cupon,
  cuponCaducado,
  onCuponAplicar,
  onCuponQuitar,
}: Props) {
  const router = useRouter();
  const { cart } = useCart();

  const [nombre, setNombre] = useState(nombreInicial);
  const [email, setEmail] = useState(emailInicial);
  const [direccion, setDireccion] = useState("");
  const [referencia, setReferencia] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [provincia, setProvincia] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [puntoId, setPuntoId] = useState("");
  const [notas, setNotas] = useState("");
  const [website, setWebsite] = useState(""); // trampa anti-bots: un humano nunca lo ve ni lo llena

  const [errores, setErrores] = useState<Errores>({});
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [errorCupon, setErrorCupon] = useState("");
  const [enviando, setEnviando] = useState(false);
  const enviandoRef = useRef(false); // el estado llega tarde para un doble clic muy rápido

  // Puntos de entrega activos, sin caché: lo que se edita en el panel se ve al momento. null = cargando.
  const [puntos, setPuntos] = useState<DeliveryPointPublic[] | null>(null);
  const [recargaPuntos, setRecargaPuntos] = useState(0);
  useEffect(() => {
    let activo = true;
    fetch("/api/delivery-points", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((d: unknown) => {
        if (activo) setPuntos(Array.isArray(d) ? (d as DeliveryPointPublic[]) : []);
      })
      .catch(() => {
        if (activo) setPuntos([]);
      });
    return () => {
      activo = false;
    };
  }, [recargaPuntos]);

  const esDelivery = metodo === "delivery_huancayo";
  const esPunto = metodo === "punto_entrega";
  const esProvincia = metodo === "envio_provincia";
  const puntoElegido = puntos?.find((p) => p._id === puntoId);

  const opciones: { valor: MetodoEntrega; etiqueta: string; ayuda: string }[] = [
    {
      valor: "delivery_huancayo",
      etiqueta: "Delivery en Huancayo",
      ayuda: deliveryGratis === null ? "" : deliveryGratis ? "Gratis" : AYUDA_DELIVERY_ADICIONAL,
    },
    // Sin puntos activos la opción no se ofrece.
    ...(puntos && puntos.length
      ? [{ valor: "punto_entrega" as const, etiqueta: "Puntos de entrega", ayuda: "Sin costo adicional" }]
      : []),
    { valor: "envio_provincia", etiqueta: "Envío a provincia", ayuda: "El costo de envío se coordina por WhatsApp" },
  ];

  function validar(): Errores {
    const e: Errores = {};
    const n = nombre.trim();
    if (n.length < 2 || n.length > 100) e["cliente.nombre"] = "Ingresa tu nombre completo (2 a 100 letras)";
    if (!normalizarTelefono(telefono)) e["cliente.telefono"] = "Ingresa un celular válido de 9 dígitos que empiece en 9";
    if (email.trim() && !EMAIL_VALIDO.test(email.trim())) e["cliente.email"] = "Ingresa un correo válido";
    if (esDelivery) {
      if (!direccion.trim()) e["entrega.direccion"] = "Ingresa tu dirección";
      if (direccion.trim().length > 200) e["entrega.direccion"] = "Máximo 200 caracteres";
      if (referencia.trim().length > 200) e["entrega.referencia"] = "Máximo 200 caracteres";
    }
    if (esPunto && !puntoElegido) e["entrega.puntoEntregaId"] = "Elige un punto de entrega";
    if (esProvincia) {
      if (!esDepartamento(departamento)) e["entrega.departamento"] = "Elige tu departamento";
      if (!provincia.trim()) e["entrega.provincia"] = "Ingresa tu provincia";
      if (!ciudad.trim()) e["entrega.ciudad"] = "Ingresa tu ciudad";
    }
    if (notas.trim().length > MAX_NOTAS) e["notas"] = `Máximo ${MAX_NOTAS} caracteres`;
    return e;
  }

  // Solo se envían los campos del método elegido: el servidor rechaza los demás (esquema estricto).
  function datosEntrega(): OrderCreateInput["entrega"] {
    if (esPunto) return { metodo, puntoEntregaId: puntoId };
    if (esProvincia) return { metodo, departamento, provincia: provincia.trim(), ciudad: ciudad.trim() };
    return {
      metodo,
      direccion: direccion.trim(),
      ...(referencia.trim() ? { referencia: referencia.trim() } : {}),
    };
  }

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    if (enviandoRef.current) return;

    setAviso(null);
    setErrorCupon("");
    const locales = validar();
    setErrores(locales);
    if (Object.keys(locales).length) return;

    enviandoRef.current = true;
    setEnviando(true);
    let redirigiendo = false;
    try {
      // N1-5: solo ids y cantidades; el servidor recalcula precios, descuentos y totales.
      const cuerpo: OrderCreateInput = {
        items: cart.map((i) => ({
          id: i._id,
          ...(i.varianteId ? { varianteId: i.varianteId } : {}),
          cantidad: i.cantidad,
        })),
        cliente: {
          nombre: nombre.trim(),
          telefono: telefono.trim(),
          ...(email.trim() ? { email: email.trim() } : {}),
        },
        entrega: datosEntrega(),
        ...(notas.trim() ? { notas: notas.trim() } : {}),
        // Solo el código (N1-5). Con cuponAplicado: false en la respuesta se sigue igual: el pedido muestra lo aplicado.
        ...(cupon ? { cupon: cupon.codigo } : {}),
        website,
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const datos: unknown = await res.json().catch(() => null);

      if (res.status === 201 && datos && typeof datos === "object" && "codigo" in datos && "token" in datos) {
        const { codigo, token } = datos as OrderCreateResult;
        // No se vacía el carrito aquí: lo hace la página del pedido, así un fallo de navegación no lo pierde.
        redirigiendo = true;
        router.push(`/pedido/${encodeURIComponent(codigo)}?t=${encodeURIComponent(token)}&nuevo=1`);
        return;
      }

      const fields: Errores =
        datos && typeof datos === "object" && "fields" in datos && datos.fields && typeof datos.fields === "object"
          ? (datos.fields as Errores)
          : {};

      const code = datos && typeof datos === "object" && "code" in datos ? String(datos.code) : "";
      if (res.status === 409 && code.startsWith("CUPON_")) {
        // El cupón dejó de valer entre la validación y el pedido: se quita y el cliente decide si confirma sin él.
        const mensaje =
          datos && typeof datos === "object" && "error" in datos && typeof datos.error === "string"
            ? datos.error
            : "Este cupón no es válido.";
        onCuponQuitar();
        setErrorCupon(`${mensaje} Quitamos el cupón; puedes confirmar tu pedido sin él.`);
      } else if (res.status === 429) {
        setAviso({ texto: "Has hecho demasiados pedidos seguidos. Intenta más tarde o escríbenos por WhatsApp." });
      } else if (res.status === 409 || res.status === 400) {
        // Las claves que son líneas del carrito (producto o producto:variante) se muestran con el nombre del producto.
        const porLinea = new Map(cart.map((i) => [lineaId(i._id, i.varianteId), i]));
        const productos: { nombre: string; motivo: string }[] = [];
        const campos: Errores = {};
        for (const [clave, motivo] of Object.entries(fields)) {
          const item = porLinea.get(clave);
          if (item) {
            productos.push({
              nombre: item.varianteEtiqueta ? `${item.nombre} (${item.varianteEtiqueta})` : item.nombre,
              motivo,
            });
          } else {
            campos[clave] = motivo;
          }
        }
        setErrores(campos);
        if (res.status === 409 && campos["entrega.puntoEntregaId"]) {
          // El punto se desactivó mientras el cliente llenaba el formulario: se recarga la lista.
          setPuntoId("");
          setRecargaPuntos((n) => n + 1);
          setAviso({ texto: "El punto de entrega que elegiste ya no está disponible. Elige otro." });
        } else if (productos.length) {
          setAviso({
            texto:
              res.status === 409
                ? "Algunos productos de tu carrito no se pueden pedir ahora:"
                : "Revisa estos productos de tu carrito:",
            productos,
            volverAlCarrito: true,
          });
        } else if (res.status === 400) {
          const hayCampoVisible = Object.keys(campos).some((k) => CLAVES_VISIBLES.has(k));
          if (!hayCampoVisible) setAviso({ texto: "Revisa los datos de tu pedido e inténtalo de nuevo." });
        } else {
          setAviso({ texto: "No pudimos registrar tu pedido. Inténtalo de nuevo." });
        }
      } else {
        setAviso({ texto: "No pudimos registrar tu pedido. Inténtalo de nuevo." });
      }
    } catch {
      setAviso({ texto: "No pudimos registrar tu pedido. Inténtalo de nuevo." });
    } finally {
      // Si navegamos, el botón se queda bloqueado hasta que la página cambie (evita un segundo pedido).
      if (!redirigiendo) {
        enviandoRef.current = false;
        setEnviando(false);
      }
    }
  }

  const err = (k: string) => errores[k];

  return (
    <form onSubmit={enviar} noValidate className="bg-white rounded-xl shadow-lg p-4 md:p-6 space-y-5">
      <h2 className="text-xl md:text-2xl font-bold text-gray-900">Tus datos</h2>

      {aviso && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm flex gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p>{aviso.texto}</p>
            {aviso.productos && (
              <ul className="list-disc pl-5">
                {aviso.productos.map((p, i) => (
                  <li key={i}>
                    <strong>{p.nombre}</strong>: {p.motivo}
                  </li>
                ))}
              </ul>
            )}
            {aviso.volverAlCarrito && (
              <Link href="/carrito" className="inline-block font-bold underline">
                Volver al carrito
              </Link>
            )}
          </div>
        </div>
      )}

      <Campo id="nombre" etiqueta="Nombre completo" error={err("cliente.nombre")}>
        <input
          id="nombre"
          type="text"
          autoComplete="name"
          maxLength={100}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          aria-invalid={!!err("cliente.nombre")}
          aria-describedby={err("cliente.nombre") ? "nombre-error" : undefined}
          className={clase(err("cliente.nombre"))}
        />
      </Campo>

      <Campo id="telefono" etiqueta="Celular (WhatsApp)" error={err("cliente.telefono")}>
        <input
          id="telefono"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="9XXXXXXXX"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          aria-invalid={!!err("cliente.telefono")}
          aria-describedby={err("cliente.telefono") ? "telefono-error" : undefined}
          className={clase(err("cliente.telefono"))}
        />
      </Campo>

      <Campo id="email" etiqueta="Correo (opcional)" error={err("cliente.email")}>
        <input
          id="email"
          type="email"
          autoComplete="email"
          maxLength={200}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!err("cliente.email")}
          aria-describedby={err("cliente.email") ? "email-error" : undefined}
          className={clase(err("cliente.email"))}
        />
      </Campo>

      <fieldset>
        <legend className="block text-sm font-semibold text-gray-700 mb-2">¿Cómo quieres recibirlo?</legend>
        <div className="space-y-2">
          {opciones.map((o) => (
            <label
              key={o.valor}
              className={`flex items-start gap-3 border-2 rounded-lg p-3 cursor-pointer transition ${
                metodo === o.valor ? "border-[#2C2C6C] bg-[#2C2C6C]/5" : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="metodo"
                value={o.valor}
                checked={metodo === o.valor}
                onChange={() => onMetodoChange(o.valor)}
                className="mt-1 accent-[#2C2C6C]"
              />
              <span>
                <span className="block font-semibold text-gray-800">{o.etiqueta}</span>
                {o.ayuda && <span className="block text-sm text-gray-500">{o.ayuda}</span>}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {esDelivery && (
        <>
          <Campo id="direccion" etiqueta="Dirección" error={err("entrega.direccion")}>
            <input
              id="direccion"
              type="text"
              autoComplete="street-address"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              aria-invalid={!!err("entrega.direccion")}
              aria-describedby={err("entrega.direccion") ? "direccion-error" : undefined}
              className={clase(err("entrega.direccion"))}
            />
          </Campo>
          <Campo id="referencia" etiqueta="Referencia (opcional)" error={err("entrega.referencia")}>
            <input
              id="referencia"
              type="text"
              autoComplete="off"
              maxLength={200}
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              className={clase(err("entrega.referencia"))}
            />
          </Campo>
        </>
      )}

      {esPunto && (
        <Campo id="puntoEntrega" etiqueta="Punto de entrega" error={err("entrega.puntoEntregaId")}>
          {puntos && puntos.length ? (
            <select
              id="puntoEntrega"
              value={puntoId}
              onChange={(e) => setPuntoId(e.target.value)}
              aria-invalid={!!err("entrega.puntoEntregaId")}
              aria-describedby={err("entrega.puntoEntregaId") ? "puntoEntrega-error" : undefined}
              className={`${clase(err("entrega.puntoEntregaId"))} bg-white`}
            >
              <option value="">Elige un punto…</option>
              {puntos.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-gray-500">
              {puntos === null ? "Cargando puntos de entrega…" : "No hay puntos de entrega disponibles ahora."}
            </p>
          )}
          {puntoElegido && (
            <div className="mt-2 rounded-lg bg-gray-50 border border-gray-200 p-3 text-sm text-gray-700">
              <p>
                {puntoElegido.direccion}
                {puntoElegido.referencia ? ` (${puntoElegido.referencia})` : ""}
              </p>
              {puntoElegido.horario && <p className="text-gray-500 mt-0.5">{puntoElegido.horario}</p>}
            </div>
          )}
        </Campo>
      )}

      {esProvincia && (
        <>
          <Campo id="departamento" etiqueta="Departamento" error={err("entrega.departamento")}>
            <select
              id="departamento"
              autoComplete="address-level1"
              value={departamento}
              onChange={(e) => setDepartamento(e.target.value)}
              aria-invalid={!!err("entrega.departamento")}
              aria-describedby={err("entrega.departamento") ? "departamento-error" : undefined}
              className={`${clase(err("entrega.departamento"))} bg-white`}
            >
              <option value="">Elige tu departamento…</option>
              {DEPARTAMENTOS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Campo>
          <div className="grid sm:grid-cols-2 gap-4">
            <Campo id="provincia" etiqueta="Provincia" error={err("entrega.provincia")}>
              <input
                id="provincia"
                type="text"
                maxLength={100}
                value={provincia}
                onChange={(e) => setProvincia(e.target.value)}
                aria-invalid={!!err("entrega.provincia")}
                aria-describedby={err("entrega.provincia") ? "provincia-error" : undefined}
                className={clase(err("entrega.provincia"))}
              />
            </Campo>
            <Campo id="ciudad" etiqueta="Ciudad" error={err("entrega.ciudad")}>
              <input
                id="ciudad"
                type="text"
                autoComplete="address-level2"
                maxLength={100}
                value={ciudad}
                onChange={(e) => setCiudad(e.target.value)}
                aria-invalid={!!err("entrega.ciudad")}
                aria-describedby={err("entrega.ciudad") ? "ciudad-error" : undefined}
                className={clase(err("entrega.ciudad"))}
              />
            </Campo>
          </div>
          <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3">{AVISO_PROVINCIA}</p>
        </>
      )}

      <Campo id="notas" etiqueta="Notas para tu pedido (opcional)" error={err("notas")}>
        <textarea
          id="notas"
          rows={3}
          maxLength={MAX_NOTAS}
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          className={clase(err("notas"))}
        />
        <p className="text-xs text-gray-400 mt-1 text-right">
          {notas.length}/{MAX_NOTAS}
        </p>
      </Campo>

      <div>
        <CouponField
          items={cart.map((i) => ({
            id: i._id,
            ...(i.varianteId ? { varianteId: i.varianteId } : {}),
            cantidad: i.cantidad,
          }))}
          telefono={telefono}
          aplicado={
            cupon
              ? { codigo: cupon.codigo, mensaje: cupon.resultado.mensaje, aplicado: cupon.resultado.aplicado }
              : null
          }
          onAplicar={(r) => {
            setErrorCupon("");
            onCuponAplicar(r);
          }}
          onQuitar={onCuponQuitar}
        />
        {cuponCaducado && !errorCupon && (
          <p role="status" className="text-sm text-amber-700 mt-1">
            Cambió tu carrito o tu celular. Vuelve a aplicar tu cupón.
          </p>
        )}
        {errorCupon && (
          <p role="alert" className="text-sm text-red-600 mt-1">
            {errorCupon}
          </p>
        )}
      </div>

      {/* Trampa anti-bots: fuera de pantalla, sin foco, ignorada por lectores de pantalla. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Sitio web</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <div>
        <button
          type="submit"
          disabled={enviando}
          className="w-full bg-[#2C2C6C] text-white py-3 md:py-4 px-6 rounded-lg font-bold text-base md:text-lg hover:bg-[#241B57] transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {enviando ? "Enviando…" : "Confirmar pedido"}
        </button>
        <p className="text-xs text-gray-500 mt-3">
          Al confirmar, registramos tu pedido y te llevamos a WhatsApp para coordinar el pago y la entrega. Aún no se
          realiza ningún cobro.
        </p>
      </div>
    </form>
  );
}

// Claves de error que el formulario sabe mostrar bajo un campo; si el servidor rechaza otra cosa, va el aviso general.
const CLAVES_VISIBLES = new Set([
  "cliente.nombre",
  "cliente.telefono",
  "cliente.email",
  "entrega.direccion",
  "entrega.referencia",
  "entrega.ciudad",
  "entrega.departamento",
  "entrega.provincia",
  "entrega.puntoEntregaId",
  "notas",
]);
