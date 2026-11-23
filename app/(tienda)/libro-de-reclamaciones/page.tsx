"use client";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import { BookOpen, Printer } from "lucide-react";
import { LEGAL } from "@/lib/siteConfig";
import { MENSAJE_TURNSTILE_PENDIENTE, TURNSTILE_ACTIVO, Turnstile } from "@/Components/Turnstile";
import type { ComplaintBienTipo, ComplaintPublic, ComplaintTipo, TipoDocumento } from "@/types";

// Libro de Reclamaciones virtual (fase 22b). Los datos del proveedor salen de LEGAL; el servidor los copia
// en la hoja por su cuenta (no se envían desde aquí).

// Textos fijos obligatorios (sección 5 de la fase 22b). Los mismos que lleva la copia por correo.
const TEXTO_OTRAS_VIAS =
  "La formulación del reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo para interponer una denuncia ante el INDECOPI.";
const TEXTO_PLAZO =
  "El proveedor deberá dar respuesta al reclamo en un plazo no mayor a quince (15) días hábiles.";

const DOCUMENTOS: { valor: TipoDocumento; etiqueta: string }[] = [
  { valor: "DNI", etiqueta: "DNI" },
  { valor: "CE", etiqueta: "Carné de extranjería" },
  { valor: "PASAPORTE", etiqueta: "Pasaporte" },
];
const ETIQUETA_DOC: Record<TipoDocumento, string> = { DNI: "DNI", CE: "Carné de extranjería", PASAPORTE: "Pasaporte" };

type Errores = Record<string, string>;

const fechaLarga = (d: Date) =>
  d.toLocaleDateString("es-PE", { timeZone: "America/Lima", day: "numeric", month: "long", year: "numeric" });
const fechaHora = (d: Date) =>
  d.toLocaleString("es-PE", { timeZone: "America/Lima", dateStyle: "long", timeStyle: "short" });

// La fecha de hoy solo en el navegador (la página se genera al construir): sin efectos ni desajuste de hidratación.
const sinSuscripcion = () => () => {};
const hoyEnLima = () => fechaLarga(new Date());
const hoyEnServidor = () => "";

const campo =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#2C2C6C] focus:ring-1 focus:ring-[#2C2C6C]";

function Campo({
  id,
  etiqueta,
  error,
  ayuda,
  children,
}: {
  id: string;
  etiqueta: string;
  error?: string;
  ayuda?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {etiqueta}
      </label>
      {children}
      {ayuda && !error && <p className="mt-1 text-xs text-gray-500">{ayuda}</p>}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-gray-200 bg-white p-4 md:p-6 space-y-4">
      <legend className="px-2 text-lg font-semibold text-[#2C2C6C]">{titulo}</legend>
      {children}
    </fieldset>
  );
}

function DatosProveedor() {
  return (
    <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
      <div>
        <dt className="inline text-gray-500">Nombre comercial: </dt>
        <dd className="inline">{LEGAL.nombreComercial}</dd>
      </div>
      <div>
        <dt className="inline text-gray-500">Titular: </dt>
        <dd className="inline">{LEGAL.titular}</dd>
      </div>
      <div>
        <dt className="inline text-gray-500">RUC: </dt>
        <dd className="inline">{LEGAL.ruc}</dd>
      </div>
      <div>
        <dt className="inline text-gray-500">Correo: </dt>
        <dd className="inline">{LEGAL.correo}</dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="inline text-gray-500">Domicilio: </dt>
        <dd className="inline">{LEGAL.domicilio}</dd>
      </div>
    </dl>
  );
}

type Constancia = ComplaintPublic & {
  fecha: Date;
  email: string;
  nombre: string;
  documento: string;
  tipo: ComplaintTipo;
  bien: string;
  detalle: string;
  pedidoConsumidor: string;
};

export default function LibroDeReclamacionesPage() {
  const hoy = useSyncExternalStore(sinSuscripcion, hoyEnLima, hoyEnServidor);

  // 1. Consumidor
  const [nombre, setNombre] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>("DNI");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [domicilio, setDomicilio] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [esMenor, setEsMenor] = useState(false);
  const [repNombre, setRepNombre] = useState("");
  const [repTipoDocumento, setRepTipoDocumento] = useState<TipoDocumento>("DNI");
  const [repNumero, setRepNumero] = useState("");
  // 2. Bien
  const [bienTipo, setBienTipo] = useState<ComplaintBienTipo>("producto");
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [pedidoCodigo, setPedidoCodigo] = useState("");
  // 3. Detalle
  const [tipo, setTipo] = useState<ComplaintTipo>("reclamo");
  const [detalle, setDetalle] = useState("");
  const [pedidoConsumidor, setPedidoConsumidor] = useState("");
  const [declara, setDeclara] = useState(false); // sin marcar por defecto
  const [website, setWebsite] = useState(""); // trampa anti-bots

  const [errores, setErrores] = useState<Errores>({});
  const [aviso, setAviso] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [constancia, setConstancia] = useState<Constancia | null>(null);
  // Fase 26c (D-93): token de Turnstile. Cada uno vale una vez: tras un envío fallido se pide otro.
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileReinicio, setTurnstileReinicio] = useState(0);

  const err = (clave: string) => errores[clave];
  const describe = (clave: string) => (errores[clave] ? { "aria-invalid": true, "aria-describedby": `${clave}-error` } : {});

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (enviando || !declara) return;
    setErrores({});
    if (TURNSTILE_ACTIVO && !turnstileToken) {
      setAviso(MENSAJE_TURNSTILE_PENDIENTE);
      return;
    }
    setEnviando(true);
    setAviso("");

    const montoTexto = monto.trim().replace(",", ".");
    const cuerpo = {
      consumidor: {
        nombre: nombre.trim(),
        tipoDocumento,
        numeroDocumento: numeroDocumento.trim(),
        domicilio: domicilio.trim(),
        telefono: telefono.trim(),
        email: email.trim(),
      },
      ...(esMenor
        ? { representante: { nombre: repNombre.trim(), tipoDocumento: repTipoDocumento, numeroDocumento: repNumero.trim() } }
        : {}),
      bien: {
        tipo: bienTipo,
        descripcion: descripcion.trim(),
        ...(montoTexto ? { montoReclamado: montoTexto } : {}),
      },
      ...(pedidoCodigo.trim() ? { pedidoCodigo: pedidoCodigo.trim() } : {}),
      tipo,
      detalle: detalle.trim(),
      pedidoConsumidor: pedidoConsumidor.trim(),
      declaraVeracidad: true as const,
      website,
    };

    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(turnstileToken ? { ...cuerpo, turnstileToken } : cuerpo),
      });
      const datos: unknown = await res.json().catch(() => null);

      if (res.status === 201 && datos && typeof datos === "object" && "codigo" in datos && "fechaLimite" in datos) {
        const r = datos as ComplaintPublic;
        setConstancia({
          ...r,
          fecha: new Date(),
          email: cuerpo.consumidor.email,
          nombre: cuerpo.consumidor.nombre,
          documento: `${ETIQUETA_DOC[tipoDocumento]} ${cuerpo.consumidor.numeroDocumento.toUpperCase()}`,
          tipo,
          bien: cuerpo.bien.descripcion,
          detalle: cuerpo.detalle,
          pedidoConsumidor: cuerpo.pedidoConsumidor,
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      const code = datos && typeof datos === "object" && "code" in datos ? String(datos.code) : "";
      if (code.startsWith("VERIFICACION_")) {
        // Turnstile (fase 26c): el mensaje del servidor dice qué hacer.
        setAviso(
          datos && typeof datos === "object" && "error" in datos && typeof datos.error === "string"
            ? datos.error
            : "No pudimos registrar tu hoja. Intenta de nuevo o escríbenos a " + LEGAL.correo + ".",
        );
      } else if (res.status === 429) {
        setAviso("Enviaste demasiadas hojas seguidas. Intenta más tarde o escríbenos a " + LEGAL.correo + ".");
      } else if (res.status === 400) {
        const fields =
          datos && typeof datos === "object" && "fields" in datos && datos.fields && typeof datos.fields === "object"
            ? (datos.fields as Errores)
            : {};
        setErrores(fields);
        setAviso("Revisa los campos marcados.");
      } else {
        setAviso("No pudimos registrar tu hoja. Intenta de nuevo o escríbenos a " + LEGAL.correo + ".");
      }
    } catch {
      setAviso("Error de conexión. Revisa tu internet e intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
    // Llegó aquí sin constancia: el token ya se gastó o pudo gastarse.
    if (TURNSTILE_ACTIVO) {
      setTurnstileToken(null);
      setTurnstileReinicio((n) => n + 1);
    }
  };

  if (constancia) {
    return (
      <section className="w-full max-w-3xl mx-auto px-4 py-10 text-gray-800">
        {/* Al imprimir solo se ve la constancia, sin menú ni pie. */}
        <style>{`@media print {
          body * { visibility: hidden !important; }
          #constancia, #constancia * { visibility: visible !important; }
          #constancia { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; border: none; }
        }`}</style>
        <div id="constancia" className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-[#2C2C6C]" aria-hidden="true" />
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-[#2C2C6C]">Hoja de reclamación registrada</h1>
              <p className="text-sm text-gray-500">Libro de Reclamaciones virtual · {LEGAL.nombreComercial}</p>
            </div>
          </div>

          <dl className="grid gap-3 sm:grid-cols-3 rounded-xl bg-indigo-50 p-4 text-sm">
            <div>
              <dt className="text-indigo-900/70">Código</dt>
              <dd className="font-mono font-bold text-lg text-indigo-950">{constancia.codigo}</dd>
            </div>
            <div>
              <dt className="text-indigo-900/70">Fecha</dt>
              <dd className="font-semibold text-indigo-950">{fechaHora(constancia.fecha)}</dd>
            </div>
            <div>
              <dt className="text-indigo-900/70">Responderemos a más tardar el</dt>
              <dd className="font-semibold text-indigo-950">{fechaLarga(new Date(constancia.fechaLimite))}</dd>
            </div>
          </dl>

          <p className="text-sm">
            Te enviamos una copia a <b>{constancia.email}</b>. Guarda el código: lo necesitarás para cualquier consulta.
          </p>

          <div className="space-y-3 text-sm">
            <div>
              <h2 className="font-semibold text-[#2C2C6C]">Proveedor</h2>
              <DatosProveedor />
            </div>
            <div>
              <h2 className="font-semibold text-[#2C2C6C]">Consumidor</h2>
              <p>
                {constancia.nombre} · {constancia.documento}
              </p>
            </div>
            <div>
              <h2 className="font-semibold text-[#2C2C6C]">{constancia.tipo === "reclamo" ? "Reclamo" : "Queja"}</h2>
              <p className="text-gray-500">Producto o servicio</p>
              <p className="whitespace-pre-line">{constancia.bien}</p>
              <p className="mt-2 text-gray-500">Detalle</p>
              <p className="whitespace-pre-line">{constancia.detalle}</p>
              <p className="mt-2 text-gray-500">Pedido del consumidor</p>
              <p className="whitespace-pre-line">{constancia.pedidoConsumidor}</p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 space-y-2 text-xs text-gray-600">
            <p>{TEXTO_PLAZO}</p>
            <p>{TEXTO_OTRAS_VIAS}</p>
          </div>

          <div className="flex flex-wrap gap-3 print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2C2C6C] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#241B57] transition"
            >
              <Printer className="w-4 h-4" aria-hidden="true" /> Imprimir
            </button>
            <Link href="/" className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold hover:bg-gray-50 transition">
              Volver a la tienda
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full max-w-3xl mx-auto px-4 py-10 text-gray-800">
      <div className="flex items-center gap-3">
        <BookOpen className="w-9 h-9 text-[#2C2C6C] flex-none" aria-hidden="true" />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#2C2C6C]">Libro de Reclamaciones</h1>
          <p className="text-sm text-gray-500">Hoja de reclamación virtual{hoy ? ` · ${hoy}` : ""}</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-indigo-950">
        <p className="font-semibold text-sm mb-2">Datos del proveedor</p>
        <DatosProveedor />
      </div>

      <form onSubmit={enviar} noValidate className="mt-8 space-y-6">
        <Bloque titulo="1. Tus datos">
          <Campo id="consumidor.nombre" etiqueta="Nombre completo" error={err("consumidor.nombre")}>
            <input
              id="consumidor.nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={150}
              autoComplete="name"
              className={campo}
              {...describe("consumidor.nombre")}
            />
          </Campo>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id="consumidor.tipoDocumento" etiqueta="Tipo de documento" error={err("consumidor.tipoDocumento")}>
              <select
                id="consumidor.tipoDocumento"
                value={tipoDocumento}
                onChange={(e) => setTipoDocumento(e.target.value as TipoDocumento)}
                className={campo}
              >
                {DOCUMENTOS.map((d) => (
                  <option key={d.valor} value={d.valor}>
                    {d.etiqueta}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo id="consumidor.numeroDocumento" etiqueta="Número de documento" error={err("consumidor.numeroDocumento")}>
              <input
                id="consumidor.numeroDocumento"
                value={numeroDocumento}
                onChange={(e) => setNumeroDocumento(e.target.value)}
                maxLength={20}
                inputMode={tipoDocumento === "DNI" ? "numeric" : "text"}
                className={campo}
                {...describe("consumidor.numeroDocumento")}
              />
            </Campo>
          </div>
          <Campo id="consumidor.domicilio" etiqueta="Domicilio" error={err("consumidor.domicilio")}>
            <input
              id="consumidor.domicilio"
              value={domicilio}
              onChange={(e) => setDomicilio(e.target.value)}
              maxLength={300}
              autoComplete="street-address"
              className={campo}
              {...describe("consumidor.domicilio")}
            />
          </Campo>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id="consumidor.telefono" etiqueta="Celular" error={err("consumidor.telefono")}>
              <input
                id="consumidor.telefono"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                maxLength={20}
                inputMode="tel"
                autoComplete="tel"
                placeholder="9XX XXX XXX"
                className={campo}
                {...describe("consumidor.telefono")}
              />
            </Campo>
            <Campo
              id="consumidor.email"
              etiqueta="Correo electrónico"
              error={err("consumidor.email")}
              ayuda="Te enviaremos una copia de la hoja y la respuesta."
            >
              <input
                id="consumidor.email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={200}
                autoComplete="email"
                className={campo}
                {...describe("consumidor.email")}
              />
            </Campo>
          </div>

          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={esMenor}
              onChange={(e) => setEsMenor(e.target.checked)}
              className="mt-0.5 h-4 w-4 flex-none accent-[#2C2C6C]"
            />
            <span>Soy menor de edad: presenta la hoja mi padre, madre o apoderado.</span>
          </label>
          {esMenor && (
            <div className="space-y-4 rounded-lg bg-gray-50 p-4">
              <Campo id="representante.nombre" etiqueta="Nombre del padre, madre o apoderado" error={err("representante.nombre")}>
                <input
                  id="representante.nombre"
                  value={repNombre}
                  onChange={(e) => setRepNombre(e.target.value)}
                  maxLength={150}
                  className={campo}
                  {...describe("representante.nombre")}
                />
              </Campo>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo id="representante.tipoDocumento" etiqueta="Tipo de documento" error={err("representante.tipoDocumento")}>
                  <select
                    id="representante.tipoDocumento"
                    value={repTipoDocumento}
                    onChange={(e) => setRepTipoDocumento(e.target.value as TipoDocumento)}
                    className={campo}
                  >
                    {DOCUMENTOS.map((d) => (
                      <option key={d.valor} value={d.valor}>
                        {d.etiqueta}
                      </option>
                    ))}
                  </select>
                </Campo>
                <Campo id="representante.numeroDocumento" etiqueta="Número de documento" error={err("representante.numeroDocumento")}>
                  <input
                    id="representante.numeroDocumento"
                    value={repNumero}
                    onChange={(e) => setRepNumero(e.target.value)}
                    maxLength={20}
                    className={campo}
                    {...describe("representante.numeroDocumento")}
                  />
                </Campo>
              </div>
            </div>
          )}
        </Bloque>

        <Bloque titulo="2. Producto o servicio">
          <div role="radiogroup" aria-label="Tipo de bien" className="flex flex-wrap gap-4 text-sm">
            {(["producto", "servicio"] as const).map((t) => (
              <label key={t} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="bien.tipo"
                  value={t}
                  checked={bienTipo === t}
                  onChange={() => setBienTipo(t)}
                  className="h-4 w-4 accent-[#2C2C6C]"
                />
                {t === "producto" ? "Producto" : "Servicio"}
              </label>
            ))}
          </div>
          {err("bien.tipo") && <p className="text-xs text-red-600">{err("bien.tipo")}</p>}
          <Campo id="bien.descripcion" etiqueta="Descripción" error={err("bien.descripcion")}>
            <textarea
              id="bien.descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              maxLength={500}
              rows={2}
              className={campo}
              {...describe("bien.descripcion")}
            />
          </Campo>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id="bien.montoReclamado" etiqueta="Monto reclamado en soles (opcional)" error={err("bien.montoReclamado")}>
              <input
                id="bien.montoReclamado"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                inputMode="decimal"
                maxLength={12}
                placeholder="0.00"
                className={campo}
                {...describe("bien.montoReclamado")}
              />
            </Campo>
            <Campo id="pedidoCodigo" etiqueta="Código de pedido (opcional)" error={err("pedidoCodigo")} ayuda="Por ejemplo, JK-261119-AB12.">
              <input
                id="pedidoCodigo"
                value={pedidoCodigo}
                onChange={(e) => setPedidoCodigo(e.target.value)}
                maxLength={30}
                className={campo}
                {...describe("pedidoCodigo")}
              />
            </Campo>
          </div>
        </Bloque>

        <Bloque titulo="3. Detalle del reclamo">
          <div role="radiogroup" aria-label="Tipo de hoja" className="grid gap-3 sm:grid-cols-2">
            {(
              [
                {
                  valor: "reclamo",
                  titulo: "Reclamo",
                  texto: "Disconformidad relacionada con los productos o servicios.",
                },
                {
                  valor: "queja",
                  titulo: "Queja",
                  texto:
                    "Disconformidad no relacionada con los productos o servicios, o malestar o descontento con la atención al público.",
                },
              ] as const
            ).map((o) => (
              <label
                key={o.valor}
                className={`flex items-start gap-2 rounded-lg border p-3 text-sm cursor-pointer transition ${
                  tipo === o.valor ? "border-[#2C2C6C] bg-indigo-50" : "border-gray-200"
                }`}
              >
                <input
                  type="radio"
                  name="tipo"
                  value={o.valor}
                  checked={tipo === o.valor}
                  onChange={() => setTipo(o.valor)}
                  className="mt-0.5 h-4 w-4 flex-none accent-[#2C2C6C]"
                />
                <span>
                  <b>{o.titulo}:</b> {o.texto}
                </span>
              </label>
            ))}
          </div>
          {err("tipo") && <p className="text-xs text-red-600">{err("tipo")}</p>}
          <Campo id="detalle" etiqueta="Detalle: cuéntanos qué pasó" error={err("detalle")} ayuda="Mínimo 20 caracteres.">
            <textarea
              id="detalle"
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              maxLength={3000}
              rows={5}
              className={campo}
              {...describe("detalle")}
            />
          </Campo>
          <Campo id="pedidoConsumidor" etiqueta="¿Qué pides?" error={err("pedidoConsumidor")} ayuda="Por ejemplo: cambio del producto, devolución del dinero.">
            <textarea
              id="pedidoConsumidor"
              value={pedidoConsumidor}
              onChange={(e) => setPedidoConsumidor(e.target.value)}
              maxLength={1000}
              rows={3}
              className={campo}
              {...describe("pedidoConsumidor")}
            />
          </Campo>
        </Bloque>

        {/* Trampa anti-bots: invisible para personas. */}
        <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
          <label htmlFor="website">No llenes este campo</label>
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

        <div className="space-y-2 rounded-xl bg-gray-50 p-4 text-xs text-gray-600">
          <p>{TEXTO_PLAZO}</p>
          <p>{TEXTO_OTRAS_VIAS}</p>
        </div>

        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={declara}
            onChange={(e) => setDeclara(e.target.checked)}
            className="mt-0.5 h-4 w-4 flex-none accent-[#2C2C6C]"
          />
          <span>
            Declaro que los datos son verdaderos. Tus datos se usan solo para atender esta hoja, según la{" "}
            <Link href="/privacidad" target="_blank" className="text-[#2C2C6C] font-semibold underline">
              Política de privacidad
            </Link>
            .
          </span>
        </label>
        {err("declaraVeracidad") && <p className="text-xs text-red-600">{err("declaraVeracidad")}</p>}

        <Turnstile onToken={setTurnstileToken} reinicio={turnstileReinicio} />

        {aviso && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {aviso}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando || !declara}
          className="w-full bg-[#2C2C6C] text-white py-3 md:py-4 px-6 rounded-lg font-bold text-base md:text-lg hover:bg-[#241B57] transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {enviando ? "Enviando…" : "Enviar hoja de reclamación"}
        </button>
      </form>
    </section>
  );
}
