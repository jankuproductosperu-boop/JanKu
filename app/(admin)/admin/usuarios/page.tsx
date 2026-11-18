"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Plus, Users, X } from "lucide-react";
import type { AdminRol, AdminUserPublic } from "@/types";
import Seccion from "@/app/(admin)/admin/_components/Seccion";
import { Chip, Switch, type Tono } from "@/app/(admin)/admin/_components/ui";
import { useAdminSession } from "@/app/(admin)/admin/_components/useAdminSession";

// Administradores (fase 21). La autoridad es la API: el último superadmin y la autoedición
// los impide el servidor; aquí solo se evita ofrecerlos. Las contraseñas no se muestran y se
// borran del estado en cuanto responde el servidor.

const ROLES: { valor: AdminRol; etiqueta: string; descripcion: string; tono: Tono }[] = [
  { valor: "superadmin", etiqueta: "Superadministrador", descripcion: "Acceso total, incluida la gestión de administradores.", tono: "acento" },
  { valor: "gestor", etiqueta: "Gestor", descripcion: "Catálogo, inventario, costos, pedidos, descuentos y cupones. No gestiona administradores.", tono: "ok" },
  { valor: "ventas", etiqueta: "Ventas", descripcion: "Ve inventario (sin costos) y gestiona pedidos. No edita catálogo, descuentos ni cupones.", tono: "aviso" },
];
const rolDe = (r: AdminRol) => ROLES.find((x) => x.valor === r) ?? ROLES[2];

// Las mismas reglas que server/validation/admin-user.schema.ts, para avisar antes de enviar.
function errorPassword(p: string): string {
  if (p.length < 10) return "Mínimo 10 caracteres";
  if (p.length > 200) return "Máximo 200 caracteres";
  if (!/[A-Z]/.test(p)) return "Debe tener una mayúscula";
  if (!/[a-z]/.test(p)) return "Debe tener una minúscula";
  if (!/[0-9]/.test(p)) return "Debe tener un número";
  return "";
}

type FormNuevo = { username: string; nombre: string; email: string; rol: AdminRol; password: string; password2: string };
const VACIO: FormNuevo = { username: "", nombre: "", email: "", rol: "ventas", password: "", password2: "" };

type FormClave = { actual: string; nueva: string; nueva2: string };
const CLAVE_VACIA: FormClave = { actual: "", nueva: "", nueva2: "" };

const claseInput =
  "w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-60";

const fechaCorta = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "Nunca";

type Respuesta = { error?: string; code?: string; fields?: Record<string, string> };

export default function UsuariosPage() {
  const router = useRouter();
  const { admin } = useAdminSession();

  const [admins, setAdmins] = useState<AdminUserPublic[] | null>(null);
  const [errorCarga, setErrorCarga] = useState("");
  const [sinPermiso, setSinPermiso] = useState(false);
  const [recarga, setRecarga] = useState(0);
  const [exito, setExito] = useState("");
  const [errorAccion, setErrorAccion] = useState("");

  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState<FormNuevo>(VACIO);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const [claveDe, setClaveDe] = useState<AdminUserPublic | null>(null);
  const [clave, setClave] = useState<FormClave>(CLAVE_VACIA);
  const [erroresClave, setErroresClave] = useState<Record<string, string>>({});
  const [errorClave, setErrorClave] = useState("");
  const [guardandoClave, setGuardandoClave] = useState(false);

  useEffect(() => {
    let activo = true;
    const cargar = async () => {
      try {
        const res = await fetch("/api/admin/users", { cache: "no-store" });
        const cuerpo: unknown = await res.json().catch(() => null);
        if (!activo) return;
        if (res.status === 403) {
          setSinPermiso(true);
          setAdmins([]);
        } else if (!res.ok || !Array.isArray(cuerpo)) {
          setErrorCarga("No se pudieron cargar los administradores");
          setAdmins([]);
        } else {
          setErrorCarga("");
          setAdmins(cuerpo as AdminUserPublic[]);
        }
      } catch {
        if (activo) {
          setErrorCarga("Error de conexión al cargar los administradores");
          setAdmins([]);
        }
      }
    };
    cargar();
    return () => {
      activo = false;
    };
  }, [recarga]);

  const avisar = (texto: string) => {
    setExito(texto);
    setTimeout(() => setExito(""), 2500);
  };

  const esPropio = (a: AdminUserPublic) => !!admin && admin.username === a.username;

  // ── Alta ──────────────────────────────────────────────────────────────────
  const abrirNuevo = () => {
    setForm(VACIO);
    setErrores({});
    setError("");
    setAbierto(true);
  };

  const cerrarNuevo = () => {
    setAbierto(false);
    setForm(VACIO);
  };

  const crear = async (e: FormEvent) => {
    e.preventDefault();
    const locales: Record<string, string> = {};
    if (!/^[a-zA-Z0-9._-]{3,50}$/.test(form.username.trim())) locales.username = "3 a 50 caracteres: letras, números, punto o guion";
    if (form.nombre.trim().length < 2) locales.nombre = "Escribe el nombre";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) locales.email = "Correo no válido";
    const ep = errorPassword(form.password);
    if (ep) locales.password = ep;
    else if (form.password !== form.password2) locales.password2 = "Las contraseñas no coinciden";
    setErrores(locales);
    setError("");
    if (Object.keys(locales).length) return;

    setGuardando(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username.trim(),
          nombre: form.nombre.trim(),
          email: form.email.trim(),
          rol: form.rol,
          password: form.password,
        }),
      });
      const datos: Respuesta = await res.json().catch(() => ({}));
      // Las contraseñas no se conservan tras la respuesta, haya ido bien o mal.
      setForm((f) => ({ ...f, password: "", password2: "" }));
      if (!res.ok) {
        if (res.status === 403) {
          setError("No tienes permiso para gestionar administradores");
          return;
        }
        setErrores(datos.fields ?? {});
        setError(datos.error || "No se pudo crear el administrador");
        return;
      }
      avisar("Administrador creado");
      cerrarNuevo();
      setRecarga((n) => n + 1);
    } catch {
      setForm((f) => ({ ...f, password: "", password2: "" }));
      setError("Error de conexión al guardar");
    } finally {
      setGuardando(false);
    }
  };

  // ── Rol y estado ─────────────────────────────────────────────────────────
  const actualizar = async (a: AdminUserPublic, cambios: { rol?: AdminRol; activo?: boolean }, texto: string) => {
    setErrorAccion("");
    try {
      const res = await fetch(`/api/admin/users/${a._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cambios),
      });
      const datos: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        const d = datos as Respuesta;
        setErrorAccion(res.status === 403 ? "No tienes permiso para gestionar administradores" : d.error || "No se pudo guardar el cambio");
        return;
      }
      const actualizado = datos as AdminUserPublic;
      setAdmins((prev) => (prev ?? []).map((x) => (x._id === a._id ? actualizado : x)));
      avisar(texto);
    } catch {
      setErrorAccion("Error de conexión al guardar el cambio");
    }
  };

  const cambiarRol = (a: AdminUserPublic, rol: AdminRol) => {
    if (rol === a.rol) return;
    if (!confirm(`¿Cambiar el rol de ${a.nombre} a ${rolDe(rol).etiqueta}? Su sesión se cerrará.`)) return;
    actualizar(a, { rol }, "Rol actualizado");
  };

  const cambiarActivo = (a: AdminUserPublic, activo: boolean) => {
    if (!activo && !confirm(`¿Desactivar a ${a.nombre}? No podrá entrar al panel y su sesión se cerrará.`)) return;
    actualizar(a, { activo }, activo ? "Administrador activado" : "Administrador desactivado");
  };

  // ── Contraseña ───────────────────────────────────────────────────────────
  const abrirClave = (a: AdminUserPublic) => {
    setClave(CLAVE_VACIA);
    setErroresClave({});
    setErrorClave("");
    setClaveDe(a);
  };

  const cerrarClave = () => {
    setClaveDe(null);
    setClave(CLAVE_VACIA);
  };

  const guardarClave = async (e: FormEvent) => {
    e.preventDefault();
    if (!claveDe) return;
    const propia = esPropio(claveDe);
    const locales: Record<string, string> = {};
    if (propia && !clave.actual) locales.passwordActual = "Escribe tu contraseña actual";
    const ep = errorPassword(clave.nueva);
    if (ep) locales.password = ep;
    else if (clave.nueva !== clave.nueva2) locales.password2 = "Las contraseñas no coinciden";
    setErroresClave(locales);
    setErrorClave("");
    if (Object.keys(locales).length) return;

    setGuardandoClave(true);
    try {
      const res = await fetch(`/api/admin/users/${claveDe._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(propia ? { password: clave.nueva, passwordActual: clave.actual } : { password: clave.nueva }),
      });
      const datos: Respuesta = await res.json().catch(() => ({}));
      setClave(CLAVE_VACIA);
      if (!res.ok) {
        if (res.status === 403) {
          setErrorClave("No tienes permiso para gestionar administradores");
          return;
        }
        setErroresClave(datos.fields ?? {});
        setErrorClave(datos.error || "No se pudo cambiar la contraseña");
        return;
      }
      cerrarClave();
      if (propia) {
        // Cambiar la contraseña cierra todas las sesiones, también la actual.
        router.push("/login-admin");
        return;
      }
      avisar("Contraseña cambiada");
    } catch {
      setClave(CLAVE_VACIA);
      setErrorClave("Error de conexión al guardar");
    } finally {
      setGuardandoClave(false);
    }
  };

  const errorDe = (mapa: Record<string, string>, clave: string) =>
    mapa[clave] ? <p className="mt-1 text-xs text-red-600">{mapa[clave]}</p> : null;

  const etiqueta = (id: string, texto: string) => (
    <label htmlFor={id} className="block text-sm font-medium text-[var(--ink)] mb-1">
      {texto}
    </label>
  );

  if (sinPermiso) {
    return (
      <Seccion titulo="Usuarios">
        <p role="alert" className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 text-[var(--muted)]">
          No tienes permiso para ver esta página.
        </p>
      </Seccion>
    );
  }

  return (
    <Seccion titulo="Usuarios">
      <p className="-mt-4 text-[var(--muted)]">
        Administradores del panel. Cambiar el rol, desactivar o cambiar la contraseña de alguien cierra sus sesiones abiertas.
      </p>

      {exito && <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700">{exito}</p>}
      {errorAccion && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{errorAccion}</p>}

      {!abierto && (
        <button
          onClick={abrirNuevo}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus className="w-4 h-4" /> Nuevo administrador
        </button>
      )}

      {abierto && (
        <form onSubmit={crear} noValidate className="max-w-2xl space-y-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 md:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--ink)]">Nuevo administrador</h2>
            <button type="button" onClick={cerrarNuevo} aria-label="Cerrar" className="text-[var(--muted)]">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              {etiqueta("us-username", "Usuario")}
              <input
                id="us-username"
                value={form.username}
                onChange={(ev) => setForm({ ...form, username: ev.target.value })}
                maxLength={50}
                autoComplete="off"
                aria-invalid={!!errores.username}
                className={claseInput}
              />
              {errorDe(errores, "username")}
            </div>
            <div>
              {etiqueta("us-nombre", "Nombre")}
              <input
                id="us-nombre"
                value={form.nombre}
                onChange={(ev) => setForm({ ...form, nombre: ev.target.value })}
                maxLength={100}
                autoComplete="off"
                aria-invalid={!!errores.nombre}
                className={claseInput}
              />
              {errorDe(errores, "nombre")}
            </div>
          </div>

          <div>
            {etiqueta("us-email", "Correo")}
            <input
              id="us-email"
              type="email"
              value={form.email}
              onChange={(ev) => setForm({ ...form, email: ev.target.value })}
              maxLength={200}
              autoComplete="off"
              aria-invalid={!!errores.email}
              className={claseInput}
            />
            {errorDe(errores, "email")}
          </div>

          <fieldset>
            <legend className="block text-sm font-medium text-[var(--ink)] mb-1">Rol</legend>
            <div className="space-y-2">
              {ROLES.map((r) => (
                <label key={r.valor} className="flex items-start gap-3 text-sm">
                  <input
                    type="radio"
                    name="us-rol"
                    checked={form.rol === r.valor}
                    onChange={() => setForm({ ...form, rol: r.valor })}
                    className="mt-0.5 accent-[var(--accent)]"
                  />
                  <span>
                    <span className="font-medium text-[var(--ink)]">{r.etiqueta}</span>
                    <span className="block text-xs text-[var(--muted)]">{r.descripcion}</span>
                  </span>
                </label>
              ))}
            </div>
            {errorDe(errores, "rol")}
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              {etiqueta("us-password", "Contraseña")}
              <input
                id="us-password"
                type="password"
                value={form.password}
                onChange={(ev) => setForm({ ...form, password: ev.target.value })}
                autoComplete="new-password"
                aria-invalid={!!errores.password}
                className={claseInput}
              />
              {!errores.password && (
                <p className="mt-1 text-xs text-[var(--muted)]">Mínimo 10 caracteres, con mayúscula, minúscula y número.</p>
              )}
              {errorDe(errores, "password")}
            </div>
            <div>
              {etiqueta("us-password2", "Repetir contraseña")}
              <input
                id="us-password2"
                type="password"
                value={form.password2}
                onChange={(ev) => setForm({ ...form, password2: ev.target.value })}
                autoComplete="new-password"
                aria-invalid={!!errores.password2}
                className={claseInput}
              />
              {errorDe(errores, "password2")}
            </div>
          </div>

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={guardando}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {guardando ? "Guardando…" : "Crear administrador"}
            </button>
            <button type="button" onClick={cerrarNuevo} className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {errorCarga && <p role="alert" className="text-red-600">{errorCarga}</p>}

      {admins === null ? (
        <p className="text-[var(--muted)]">Cargando…</p>
      ) : admins.length === 0 ? (
        !errorCarga && (
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] py-12 text-center text-[var(--muted)]">
            <Users className="mx-auto mb-3 h-12 w-12" />
            <p>No hay administradores.</p>
          </div>
        )
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface)]">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--line)] text-left text-[var(--muted)]">
              <tr>
                <th className="p-3">Usuario</th>
                <th className="p-3">Nombre</th>
                <th className="p-3">Correo</th>
                <th className="p-3">Rol</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Último acceso</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => {
                const propio = esPropio(a);
                const rol = rolDe(a.rol);
                return (
                  <tr key={a._id} className={`border-b border-[var(--line)] last:border-0 ${a.activo ? "" : "opacity-60"}`}>
                    <td className="p-3">
                      <span className="font-mono font-semibold">{a.username}</span>
                      {propio && <span className="block text-xs text-[var(--muted)]">Tú</span>}
                    </td>
                    <td className="p-3">{a.nombre}</td>
                    <td className="p-3">{a.email}</td>
                    <td className="p-3">
                      {propio ? (
                        <Chip tono={rol.tono}>{rol.etiqueta}</Chip>
                      ) : (
                        <select
                          value={a.rol}
                          onChange={(ev) => cambiarRol(a, ev.target.value as AdminRol)}
                          aria-label={`Rol de ${a.username}`}
                          className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-sm"
                        >
                          {ROLES.map((r) => (
                            <option key={r.valor} value={r.valor}>
                              {r.etiqueta}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {!propio && (
                          <Switch activo={a.activo} onChange={(v) => cambiarActivo(a, v)} etiqueta={`Activar ${a.username}`} />
                        )}
                        <Chip tono={a.activo ? "ok" : "aviso"}>{a.activo ? "Activo" : "Inactivo"}</Chip>
                      </div>
                    </td>
                    <td className="p-3 whitespace-nowrap">{fechaCorta(a.ultimoAcceso)}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => abrirClave(a)}
                        title="Cambiar contraseña"
                        aria-label={`Cambiar contraseña de ${a.username}`}
                        className="rounded-lg bg-indigo-50 p-2 text-indigo-600 hover:bg-indigo-100"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {claveDe && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="us-clave-titulo">
          <form onSubmit={guardarClave} noValidate className="w-full max-w-md space-y-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 md:p-6">
            <div className="flex items-center justify-between">
              <h2 id="us-clave-titulo" className="text-lg font-bold text-[var(--ink)]">
                Cambiar contraseña · {claveDe.username}
              </h2>
              <button type="button" onClick={cerrarClave} aria-label="Cerrar" className="text-[var(--muted)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-[var(--muted)]">
              {esPropio(claveDe)
                ? "Al guardar se cerrarán todas tus sesiones y tendrás que volver a entrar."
                : "Al guardar se cerrarán todas las sesiones de este administrador."}
            </p>

            {esPropio(claveDe) && (
              <div>
                {etiqueta("us-clave-actual", "Contraseña actual")}
                <input
                  id="us-clave-actual"
                  type="password"
                  value={clave.actual}
                  onChange={(ev) => setClave({ ...clave, actual: ev.target.value })}
                  autoComplete="current-password"
                  aria-invalid={!!erroresClave.passwordActual}
                  className={claseInput}
                />
                {errorDe(erroresClave, "passwordActual")}
              </div>
            )}
            <div>
              {etiqueta("us-clave-nueva", "Contraseña nueva")}
              <input
                id="us-clave-nueva"
                type="password"
                value={clave.nueva}
                onChange={(ev) => setClave({ ...clave, nueva: ev.target.value })}
                autoComplete="new-password"
                aria-invalid={!!erroresClave.password}
                className={claseInput}
              />
              {!erroresClave.password && (
                <p className="mt-1 text-xs text-[var(--muted)]">Mínimo 10 caracteres, con mayúscula, minúscula y número.</p>
              )}
              {errorDe(erroresClave, "password")}
            </div>
            <div>
              {etiqueta("us-clave-nueva2", "Repetir contraseña nueva")}
              <input
                id="us-clave-nueva2"
                type="password"
                value={clave.nueva2}
                onChange={(ev) => setClave({ ...clave, nueva2: ev.target.value })}
                autoComplete="new-password"
                aria-invalid={!!erroresClave.password2}
                className={claseInput}
              />
              {errorDe(erroresClave, "password2")}
            </div>

            {errorClave && <p role="alert" className="text-sm text-red-600">{errorClave}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={guardandoClave}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {guardandoClave ? "Guardando…" : "Cambiar contraseña"}
              </button>
              <button type="button" onClick={cerrarClave} className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </Seccion>
  );
}
