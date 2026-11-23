"use client";
import { useState } from "react";
import { invalidateCachePattern } from "@/lib/cache";
import { madreDe } from "@/lib/categorias";
import type { Category } from "@/types";

// Fase 25 (D-88): "" = categoría principal; si no, slug de la madre (un solo nivel).
const VACIO = { nombre: "", descripcion: "", imagenUrl: "", activo: true, orden: 0, padre: "" };

type Props = { categories: Category[]; onReload: () => Promise<void> };

export default function CategoriasTab({ categories, onReload }: Props) {
  const loadCategories = onReload;

  const [showCategoryForm, setShowCategoryForm] = useState(false);
  // ── CATEGORÍAS ──
  const [categoryForm, setCategoryForm] = useState(VACIO);
  const [selectedCategoryEdit, setSelectedCategoryEdit] = useState<Category | null>(null);
  const [isEditingCategory, setIsEditingCategory] = useState(false);

  // ─── HANDLERS CATEGORÍAS (sin cambios respecto al original) ──────────────────

  // Madres posibles: principales, sin contar la que se edita. Una categoría con hijas no puede ser hija.
  const principales = categories.filter((c) => madreDe(c) === null);
  const madresPosibles = principales.filter((c) => c.slug !== selectedCategoryEdit?.slug);
  const tieneHijas = !!selectedCategoryEdit && categories.some((c) => madreDe(c) === selectedCategoryEdit.slug);
  const nombreDe = (slug: string) => categories.find((c) => c.slug === slug)?.nombre ?? slug;
  // Lista: cada principal seguida de sus hijas; las hijas cuya madre ya no existe van al final.
  const ordenadas = [
    ...principales.flatMap((p) => [p, ...categories.filter((c) => madreDe(c) === p.slug)]),
    ...categories.filter((c) => {
      const m = madreDe(c);
      return m !== null && !principales.some((p) => p.slug === m);
    }),
  ];

  const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, type } = e.target;
    const value = type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setCategoryForm({ ...categoryForm, [name]: value });
  };

  const handleCategorySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!categoryForm.nombre) { alert("El nombre es obligatorio"); return; }
    const data = { nombre: categoryForm.nombre.trim(), descripcion: categoryForm.descripcion?.trim() || "", imagenUrl: categoryForm.imagenUrl?.trim() || "", activo: categoryForm.activo, orden: Number(categoryForm.orden) || 0, padre: categoryForm.padre };
    try {
      let res;
      if (isEditingCategory && selectedCategoryEdit) {
        res = await fetch(`/api/categories/${selectedCategoryEdit._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      } else {
        res = await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      }
      if (!res.ok) { const err = await res.json(); alert(`Error: ${err.error}`); return; }
      invalidateCachePattern("categories");
      alert(isEditingCategory ? "Categoría actualizada" : "Categoría agregada");
      setCategoryForm(VACIO);
      setIsEditingCategory(false); setSelectedCategoryEdit(null);
      await loadCategories();
    } catch { alert("Error de conexión al guardar la categoría"); }
  };

  const handleCategorySelect = (category: Category) => {
    setSelectedCategoryEdit(category);
    setCategoryForm({ nombre: category.nombre || "", descripcion: category.descripcion || "", imagenUrl: category.imagenUrl || "", activo: category.activo ?? true, orden: category.orden || 0, padre: madreDe(category) ?? "" });
    setIsEditingCategory(true); setShowCategoryForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCategoryDelete = async (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar esta categoría?")) return;
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) { const e = await res.json(); alert(`Error: ${e.error}`); return; }
      invalidateCachePattern("categories");
      if (selectedCategoryEdit?._id === id) { setSelectedCategoryEdit(null); setIsEditingCategory(false); setCategoryForm(VACIO); }
      await loadCategories(); alert("Categoría eliminada correctamente");
    } catch { alert("Error de conexión al eliminar la categoría"); }
  };

  const handleCategoryCancel = () => { setIsEditingCategory(false); setSelectedCategoryEdit(null); setCategoryForm(VACIO); };

  return (
      <div className="space-y-6">
        <div className="bg-[var(--surface)] rounded-2xl shadow-lg p-4 md:p-6">
          <button onClick={() => { setShowCategoryForm(!showCategoryForm); if (!showCategoryForm) { setIsEditingCategory(false); setSelectedCategoryEdit(null); setCategoryForm(VACIO); } }}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2 ${showCategoryForm ? "bg-[var(--line)] text-[var(--ink)] hover:bg-[var(--line)]" : "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 shadow-lg"}`}>
            {showCategoryForm ? "✖️ Cerrar Formulario" : "➕ Agregar Nueva Categoría"}
          </button>
        </div>
        {showCategoryForm && (
          <div className="bg-[var(--surface)] rounded-2xl shadow-lg p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-bold text-[var(--ink)] mb-4 md:mb-6">{isEditingCategory ? "✏️ Editar Categoría" : "➕ Agregar Categoría"}</h2>
            <form onSubmit={handleCategorySubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-[var(--ink)] mb-2">Nombre *</label><input name="nombre" value={categoryForm.nombre} onChange={handleCategoryChange} placeholder="Ej: Tecnología" className="w-full px-4 py-3 border border-[var(--line)] rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required /></div>
                <div><label className="block text-sm font-medium text-[var(--ink)] mb-2">Orden</label><input name="orden" type="number" value={categoryForm.orden} onChange={handleCategoryChange} placeholder="0" className="w-full px-4 py-3 border border-[var(--line)] rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
              </div>
              <div>
                <label htmlFor="cat-padre" className="block text-sm font-medium text-[var(--ink)] mb-2">Categoría madre (opcional)</label>
                <select id="cat-padre" name="padre" value={categoryForm.padre} onChange={handleCategoryChange} disabled={tieneHijas} className="w-full px-4 py-3 border border-[var(--line)] rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-[var(--surface)] disabled:opacity-60">
                  <option value="">Ninguna: es una categoría principal</option>
                  {madresPosibles.map((c) => <option key={c._id} value={c.slug}>{c.nombre}</option>)}
                </select>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {tieneHijas
                    ? "Esta categoría tiene subcategorías, así que no puede ser subcategoría de otra."
                    : "Si eliges una, esta será una subcategoría: sale como botón en la página de la madre y no en el menú."}
                </p>
              </div>
              <div><label className="block text-sm font-medium text-[var(--ink)] mb-2">URL Imagen (opcional)</label><input name="imagenUrl" value={categoryForm.imagenUrl} onChange={handleCategoryChange} placeholder="https://..." className="w-full px-4 py-3 border border-[var(--line)] rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
              <div><label className="block text-sm font-medium text-[var(--ink)] mb-2">Descripción</label><textarea name="descripcion" value={categoryForm.descripcion} onChange={handleCategoryChange} placeholder="Describe la categoría..." rows={2} className="w-full px-4 py-3 border border-[var(--line)] rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none" /></div>
              <label className="flex items-center cursor-pointer"><input type="checkbox" name="activo" checked={categoryForm.activo} onChange={handleCategoryChange} className="w-5 h-5 text-indigo-600 border-[var(--line)] rounded focus:ring-2 focus:ring-indigo-500" /><span className="ml-3 text-sm font-medium text-[var(--ink)]">Categoría activa</span></label>
              {tieneHijas && !categoryForm.activo && <p className="text-xs text-amber-600">Sus subcategorías siguen activas, pero sin la madre en el menú los clientes casi no llegarán a ellas. Desactívalas también si no quieres mostrarlas.</p>}
              <div className="flex flex-col md:flex-row gap-3 pt-2">
                <button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-3 px-6 rounded-lg font-semibold hover:from-indigo-700 hover:to-indigo-800 transition shadow-md text-sm md:text-base">{isEditingCategory ? "💾 Guardar Cambios" : "➕ Agregar Categoría"}</button>
                {isEditingCategory && <button type="button" onClick={handleCategoryCancel} className="w-full md:w-auto px-6 py-3 border-2 border-[var(--line)] text-[var(--ink)] rounded-lg font-semibold hover:bg-[var(--bg)] transition text-sm md:text-base">❌ Cancelar</button>}
              </div>
            </form>
          </div>
        )}
        <div className="bg-[var(--surface)] rounded-2xl shadow-lg p-4 md:p-6">
          <h2 className="text-xl md:text-2xl font-bold text-[var(--ink)] mb-6">📁 Lista ({categories.length})</h2>
          {categories.length === 0 ? (
            <div className="text-center py-12 text-[var(--muted)]"><p className="text-lg md:text-xl">No hay categorías</p><p className="mt-2 text-sm">¡Crea tu primera categoría! 👆</p></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ordenadas.map(c => (
                <div key={c._id} className={`border rounded-xl p-4 hover:shadow-lg transition bg-[var(--surface)] ${madreDe(c) ? "border-dashed border-[var(--line)]" : "border-[var(--line)]"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- miniatura del panel (D-95) */}
                  {c.imagenUrl && <div className="mb-3 rounded-lg overflow-hidden bg-[var(--line)] h-32 md:h-40 flex items-center justify-center"><img src={c.imagenUrl} alt={c.nombre} className="max-h-full max-w-full object-contain" /></div>}
                  {madreDe(c) !== null && <p className="text-xs text-[var(--muted)] mb-1">↳ Subcategoría de {nombreDe(madreDe(c) ?? "")}</p>}
                  <h3 className="font-bold text-base md:text-lg text-[var(--ink)] mb-2">{c.nombre}</h3>
                  <p className="text-xs text-[var(--muted)] mb-2">Slug: /{c.slug}</p>
                  {c.descripcion && <p className="text-xs md:text-sm text-[var(--muted)] mb-2 line-clamp-2">{c.descripcion}</p>}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium">Orden: {c.orden}</span>
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${c.activo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{c.activo ? "Activa" : "Inactiva"}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleCategorySelect(c)} className="flex-1 bg-indigo-600 text-white py-2 px-3 rounded-lg font-medium hover:bg-indigo-700 transition text-xs md:text-sm">✏️ Editar</button>
                    <button onClick={() => handleCategoryDelete(c._id)} className="flex-1 bg-red-500 text-white py-2 px-3 rounded-lg font-medium hover:bg-red-600 transition text-xs md:text-sm">🗑️ Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
  );
}
