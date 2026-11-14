"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { invalidateCachePattern } from "@/lib/cache";
import type { ProductAdmin, Category, ProductoOpcion } from "@/types";
import VariantesEditor, { type VarianteForm } from "@/app/(admin)/admin/_components/VariantesEditor";
import { stockTotal, validarVariantes } from "@/lib/variantes";
import { ImageUploader } from "@/app/(admin)/admin/_components/ImageUploader";
import { useImageUpload } from "@/app/(admin)/admin/_components/useImageUpload";
import { esNovedad, fechaNuevoHasta } from "@/lib/novedades";
import { estadoDeStock } from "@/lib/stock";
import { SITE } from "@/lib/siteConfig";
import { getCloudinaryUrl, type UploadedImage } from "@/app/(admin)/admin/_components/imageTypes";

type Props = { product?: ProductAdmin; categories: Category[]; onSaved: () => Promise<void> };

const FORM_VACIO = {
  nombre: "", precio: "", descripcion: "", categorias: "", stockCantidad: "", stockMinimo: "5",
  deliveryHuancayo: true, descripcionCompleta: "", caracteristicas: "",
  metaTitulo: "", metaDescripcion: "", mostrarEnHome: false, novedad: false,
  whatsappNumero: "", videoUrl: "", tags: "",
};

// Mismo mapeo que usaba handleSelect en la pestaña de productos.
function formDe(product?: ProductAdmin): typeof FORM_VACIO {
  if (!product) return FORM_VACIO;
  return {
    nombre: product.nombre, precio: product.precio.toString(),
    descripcion: product.descripcion || "",
    descripcionCompleta: product.descripcionCompleta || "",
    categorias: Array.isArray(product.categorias) ? product.categorias.join(",") : "",
    stockCantidad: String(product.stockCantidad ?? 0),
    stockMinimo: String(product.stockMinimo ?? 5),
    deliveryHuancayo: product.deliveryHuancayo ?? true,
    mostrarEnHome: product.mostrarEnHome ?? false,
    novedad: esNovedad(product),
    whatsappNumero: product.whatsappNumero || "", videoUrl: product.videoUrl || "",
    tags: Array.isArray(product.tags) ? product.tags.join(", ") : "",
    caracteristicas: product.caracteristicas?.join("\n") || "",
    metaTitulo: product.metaTitulo || "", metaDescripcion: product.metaDescripcion || "",
  };
}

function variantesDe(product?: ProductAdmin): VarianteForm[] {
  return (product?.variantes ?? []).map((v) => ({
    _id: v._id,
    combinacion: { ...v.combinacion },
    stock: String(v.stockCantidad ?? 0),
    stockAlAbrir: v.stockCantidad ?? 0,
    precio: typeof v.precio === "number" ? String(v.precio) : "",
    imagen: v.imagen ?? "",
    sku: v.sku ?? "",
    activo: v.activo !== false,
  }));
}

const entero = (x: string) => Math.max(0, Math.floor(Number(x || 0)));

function imagenesDe(product?: ProductAdmin): UploadedImage[] {
  if (!product) return [];
  if (product.imagenes && product.imagenes.length > 0) {
    // Producto con Cloudinary — usar SOLO imagenes[], ignorar imagenUrl legacy
    return product.imagenes.map((pid, index) => ({
      public_id: pid,
      secure_url: getCloudinaryUrl(pid, 300),
      // Si no hay imagenPrincipal definida, la primera es la principal
      isMain: product.imagenPrincipal
        ? pid === product.imagenPrincipal
        : index === 0,
      status: "done" as const,
    }));
  } else if (product.imagenUrl) {
    // Producto legacy sin Cloudinary — mostrar imagenUrl
    return [{
      public_id: "",
      secure_url: product.imagenUrl,
      previewUrl: product.imagenUrl,
      isMain: true,
      status: "done" as const,
    }];
  } else {
    return [];
  }
}

export default function ProductoForm({ product, categories, onSaved }: Props) {
  const router = useRouter();
  const isEditing = !!product;
  const selectedProduct = product ?? null;
  const uploaderKey = product?._id ?? "new";
  const [productImages, setProductImages] = useState<UploadedImage[]>(() => imagenesDe(product));
  const { uploadPendingImages, isUploading, uploadProgress, uploadError } = useImageUpload();
  const [form, setForm] = useState(() => formDe(product));
  // Variantes (fase 13b). Un producto que ya las tiene no puede volver a «sin variantes» (D-64).
  const [opciones, setOpciones] = useState<ProductoOpcion[]>(() => product?.opciones?.map((o) => ({ ...o, valores: [...o.valores] })) ?? []);
  const [variantes, setVariantes] = useState<VarianteForm[]>(() => variantesDe(product));
  const yaTeniaVariantes = (product?.variantes?.length ?? 0) > 0;
  const [usaVariantes, setUsaVariantes] = useState(yaTeniaVariantes);
  const conVariantes = usaVariantes && variantes.length > 0;
  const totalVariantes = stockTotal(variantes.map((v) => ({ stockCantidad: entero(v.stock), activo: v.activo })));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm({ ...form, [e.target.name]: value });
  };


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.nombre || !form.precio) { alert("Nombre y precio son obligatorios"); return; }
    if (productImages.length === 0) { alert("Agrega al menos una imagen al producto"); return; }
    const opcionesLimpias = opciones.map((o) => ({ nombre: o.nombre.trim(), valores: o.valores.map((v) => v.trim()) }));
    if (usaVariantes) {
      const error = validarVariantes(opcionesLimpias, variantes);
      if (error) { alert(error); return; }
    }

    try {
      const selectedCategories = form.categorias ? form.categorias.split(",").filter(c => c.trim()) : [];
      const firstCategorySlug = selectedCategories.length > 0
        ? (categories.find(c => c.nombre === selectedCategories[0])?.slug || "general") : "general";
      const tagsList = form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [];

      // 1. Subir imágenes pendientes a Cloudinary
      const imageResult = await uploadPendingImages(productImages, form.nombre, firstCategorySlug, tagsList);
      const selectedSlugs = selectedCategories.map(n => categories.find(c => c.nombre === n)?.slug).filter(Boolean);

      // La cantidad solo viaja si se cambió, junto con la que se veía al abrir: si alguien ajustó
      // el stock mientras tanto, el servidor responde 409 en vez de pisar ese ajuste.
      const cantidad = Math.max(0, Math.floor(Number(form.stockCantidad || 0)));
      const cantidadAlAbrir = product?.stockCantidad ?? 0;
      // Con variantes, la cantidad del producto es el total que calcula el servidor: no se envía.
      const stock = conVariantes
        ? {}
        : !isEditing
          ? { stockCantidad: cantidad }
          : cantidad !== cantidadAlAbrir
            ? { stockCantidad: cantidad, stockEsperado: cantidadAlAbrir }
            : {};
      // Cada variante manda su stock solo si cambió (o es nueva), con el que se veía al abrir.
      const datosVariantes = conVariantes
        ? {
            opciones: opcionesLimpias,
            variantes: variantes.map((v) => {
              const nuevo = entero(v.stock);
              const cambiaStock = !v._id ? nuevo > 0 : nuevo !== v.stockAlAbrir;
              return {
                ...(v._id ? { _id: v._id } : {}),
                combinacion: v.combinacion,
                ...(cambiaStock ? { stockCantidad: nuevo, ...(v._id ? { stockEsperado: v.stockAlAbrir } : {}) } : {}),
                ...(v.precio !== "" ? { precio: Number(v.precio) } : {}),
                ...(v.imagen ? { imagen: v.imagen } : {}),
                ...(v.sku.trim() ? { sku: v.sku.trim() } : {}),
                activo: v.activo,
              };
            }),
          }
        : {};

      const productData = {
        nombre: form.nombre.trim(), precio: Number(form.precio),
        descripcion: form.descripcion?.trim() || "",
        descripcionCompleta: form.descripcionCompleta?.trim() || "",
        categorias: selectedCategories, categoriaSlugs: selectedSlugs,
        // Inventario: el servidor deriva la etiqueta de stock; no se envía `stock`.
        ...stock,
        ...datosVariantes,
        stockMinimo: form.stockMinimo === "" ? 5 : Math.max(0, Math.floor(Number(form.stockMinimo))),
        // Cloudinary — public_ids
        imagenes: imageResult.imagenes.filter(Boolean),
        imagenPrincipal: imageResult.imagenPrincipal,
        // Legacy — URLs completas para CartSidebar, FavoritosPage, etc.
        imagenUrl: imageResult.imagenUrl,
        imagenesAdicionales: imageResult.imagenesAdicionales,
        videoUrl: form.videoUrl?.trim() || "",
        deliveryHuancayo: form.deliveryHuancayo, mostrarEnHome: form.mostrarEnHome,
        // Novedad de la semana: si ya lo era se conserva su fecha; si no, 7 días desde hoy; si se desmarca, se limpia.
        nuevoHasta: form.novedad ? (product && esNovedad(product) ? product.nuevoHasta : fechaNuevoHasta()) : null,
        whatsappNumero: form.whatsappNumero?.trim() || "",
        caracteristicas: form.caracteristicas ? form.caracteristicas.split("\n").filter(c => c.trim()) : [],
        tags: tagsList,
        metaTitulo: form.metaTitulo?.trim() || form.nombre.trim(),
        metaDescripcion: form.metaDescripcion?.trim() || form.descripcion?.trim() || "",
        // metaImagen = portada automática, sin campo manual
        metaImagen: imageResult.imagenUrl,
      };

      let response;
      if (isEditing && selectedProduct) {
        const bodyString = JSON.stringify(productData);
          if (!bodyString) {
            alert("Error: no se pudo serializar el producto");
            return;
          }
          response = await fetch(`/api/products/${selectedProduct._id}`, { 
            method: "PUT", 
            headers: { "Content-Type": "application/json" }, 
            body: bodyString 
          });
      } else {
        response = await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(productData) });
      }
      if (!response.ok) { const err = await response.json(); alert(`Error: ${err.fields?.variantes ?? err.error ?? "No se pudo guardar"}`); return; }
      invalidateCachePattern("products");
      alert(isEditing ? "Producto actualizado" : "Producto agregado");
      await onSaved(); router.push("/admin/productos");
    } catch (err) { console.error(err); alert("Error al guardar el producto. Revisa la consola."); }
  };

  const handleDelete = async () => {
    if (!product) return;
    const id = product._id;
    if (!confirm("¿Seguro que quieres eliminar este producto?")) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) { const e = await res.json(); alert(`Error: ${e.error}`); return; }
      invalidateCachePattern("products");
      await onSaved(); alert("Producto eliminado correctamente");
      router.push("/admin/productos");
    } catch { alert("Error de conexión al eliminar el producto"); }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.7fr_1fr] items-start">
      <div className="space-y-6">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 md:p-5 space-y-4">
          <h2 className="font-bold text-[var(--ink)]">Datos básicos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-[var(--ink)] mb-2">Nombre *</label><input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Ej: Mochila Kpop Negra" className="w-full px-4 py-3 border border-[var(--line)] rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required /></div>
            <div><label className="block text-sm font-medium text-[var(--ink)] mb-2">Precio (S/) *</label><input name="precio" type="number" step="0.01" value={form.precio} onChange={handleChange} placeholder="0.00" className="w-full px-4 py-3 border border-[var(--line)] rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required /></div>
          </div>
          <div><label className="block text-sm font-medium text-[var(--ink)] mb-2">Descripción (para tarjeta)</label><textarea name="descripcion" value={form.descripcion} onChange={handleChange} placeholder="Descripción corta..." rows={2} className="w-full px-4 py-3 border border-[var(--line)] rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none" /></div>
        </div>
        <div className="border rounded-xl p-4 md:p-5 space-y-4 bg-[var(--surface)]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-6 bg-indigo-600 rounded-full" />
            <h3 className="font-bold text-[var(--ink)] text-base">📸 Imágenes del Producto</h3>
            <span className="text-xs text-[var(--muted)]">drag & drop · hasta 10 · máx 5MB · la portada = meta image automática</span>
          </div>
          <ImageUploader
            key={uploaderKey}
            existingImages={productImages.filter(i => i.status === "done" && i.public_id).map(i => i.public_id)}
            imagenPrincipalActual={productImages.find(i => i.isMain)?.public_id || ""}
            onImagesChange={setProductImages}
            maxImages={10}
          />
          {isUploading && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-indigo-700 font-medium"><span>Subiendo a Cloudinary...</span><span>{uploadProgress}%</span></div>
              <div className="h-2 bg-indigo-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-600 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} /></div>
            </div>
          )}
          {uploadError && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">❌ {uploadError}</div>}
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 md:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-[var(--ink)]">🎨 Variantes</h3>
              <p className="text-xs text-[var(--muted)]">Color, talla u otras opciones, cada una con su propio stock. Opcional.</p>
            </div>
            <label className={`flex items-center gap-2 text-sm font-medium text-[var(--ink)] ${yaTeniaVariantes ? "opacity-60" : "cursor-pointer"}`}>
              <input type="checkbox" checked={usaVariantes} disabled={yaTeniaVariantes} onChange={(e) => setUsaVariantes(e.target.checked)} className="w-5 h-5 accent-[var(--accent)]" />
              Este producto tiene variantes
            </label>
          </div>
          {usaVariantes && (
            <VariantesEditor
              opciones={opciones}
              variantes={variantes}
              imagenes={productImages.filter((i) => i.status === "done" && i.public_id).map((i) => ({ public_id: i.public_id, url: i.secure_url }))}
              precioProducto={form.precio}
              onChange={(ops, vs) => { setOpciones(ops); setVariantes(vs); }}
            />
          )}
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 md:p-5 space-y-4">
          <div className="">
            <h3 className="font-bold text-[var(--ink)] mb-3">📄 Información adicional (página del producto)</h3>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-[var(--ink)] mb-2">Descripción Completa</label><textarea name="descripcionCompleta" value={form.descripcionCompleta} onChange={handleChange} placeholder="Descripción detallada del producto..." rows={4} className="w-full px-4 py-3 border border-[var(--line)] rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none" /></div>
              <div><label className="block text-sm font-medium text-[var(--ink)] mb-2">Características (una por línea)</label><textarea name="caracteristicas" value={form.caracteristicas} onChange={handleChange} placeholder="Pantalla 15.6 pulgadas&#10;Procesador Intel Core i5&#10;8GB RAM" rows={4} className="w-full px-4 py-3 border border-[var(--line)] rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none" /></div>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 md:p-5 space-y-4">
          <div className="">
            <h3 className="font-bold text-[var(--ink)] mb-1">🔍 SEO y Metadatos</h3>
            <p className="text-xs text-[var(--muted)] mb-3">La meta image (Open Graph / WhatsApp / Facebook) se asigna automáticamente desde la imagen principal. No necesitas configurarla.</p>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-[var(--ink)] mb-2">Meta Título</label><input name="metaTitulo" value={form.metaTitulo} onChange={handleChange} placeholder="Título para compartir (se usa el nombre si está vacío)" className="w-full px-4 py-3 border border-[var(--line)] rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
              <div><label className="block text-sm font-medium text-[var(--ink)] mb-2">Meta Descripción</label><textarea name="metaDescripcion" value={form.metaDescripcion} onChange={handleChange} placeholder="Descripción para redes sociales..." rows={2} className="w-full px-4 py-3 border border-[var(--line)] rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none" /></div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6 lg:sticky lg:top-20">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 md:p-5 space-y-4">
          <h2 className="font-bold text-[var(--ink)]">Publicación</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-[var(--ink)] mb-2">{conVariantes ? "Stock total" : "Cantidad en stock"}</label>{conVariantes ? <div className="w-full px-4 py-3 border border-[var(--line)] rounded-lg bg-[var(--bg)] text-[var(--ink)] font-semibold" title="Suma de las variantes activas">{totalVariantes}</div> : <input name="stockCantidad" type="number" min="0" step="1" value={form.stockCantidad} onChange={handleChange} placeholder="0" className="w-full px-4 py-3 border border-[var(--line)] rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />}</div>
            <div><label className="block text-sm font-medium text-[var(--ink)] mb-2">Stock mínimo</label><input name="stockMinimo" type="number" min="0" step="1" value={form.stockMinimo} onChange={handleChange} placeholder="5" className="w-full px-4 py-3 border border-[var(--line)] rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
          </div>
          <p className="text-xs text-[var(--muted)] -mt-2">Estado en la tienda: <b className="text-[var(--ink)]">{estadoDeStock(conVariantes ? totalVariantes : Math.max(0, Number(form.stockCantidad || 0)), form.stockMinimo === "" ? 5 : Number(form.stockMinimo))}</b> (se calcula solo; «Limitado» cuando la cantidad es igual o menor al mínimo).</p>
          <label className="flex items-center cursor-pointer"><input type="checkbox" name="deliveryHuancayo" checked={form.deliveryHuancayo} onChange={handleChange} className="w-5 h-5 text-indigo-600 border-[var(--line)] rounded focus:ring-2 focus:ring-indigo-500" /><span className="ml-3 text-sm font-medium text-[var(--ink)]">🚚 Delivery gratis Huancayo</span></label>
          <label className="flex items-center cursor-pointer"><input type="checkbox" name="mostrarEnHome" checked={form.mostrarEnHome} onChange={handleChange} className="w-5 h-5 text-indigo-600 border-[var(--line)] rounded focus:ring-2 focus:ring-indigo-500" /><span className="ml-3 text-sm font-medium text-[var(--ink)]">⭐ Mostrar en página de inicio</span></label>
          <label className="flex items-center cursor-pointer"><input type="checkbox" name="novedad" checked={form.novedad} onChange={handleChange} className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-2 focus:ring-indigo-500" /><span className="ml-3 text-sm font-medium text-[var(--ink)]">🆕 Novedad de la semana</span></label>
          {product && esNovedad(product) && form.novedad && <p className="text-xs text-[var(--muted)] -mt-2 ml-8">Aparece en Novedades hasta el {new Date(product.nuevoHasta as string).toLocaleDateString("es-PE", { day: "numeric", month: "long" })}.</p>}
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 md:p-5 space-y-4">
          <h2 className="font-bold text-[var(--ink)]">Categorías</h2>
          <div>
            <label className="block text-sm font-medium text-[var(--ink)] mb-2">
              Categorías{form.categorias && form.categorias.split(",").filter(c => c).length > 0 && <span className="ml-2 px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full font-bold">{form.categorias.split(",").filter(c => c).length} seleccionadas</span>}
            </label>
            <details className="border border-[var(--line)] rounded-lg overflow-hidden bg-[var(--surface)]">
              <summary className="px-4 py-3 bg-[var(--bg)] cursor-pointer hover:bg-[var(--line)] transition font-medium text-[var(--ink)] flex items-center justify-between">
                <span>{form.categorias && form.categorias.split(",").filter(c => c).length > 0 ? form.categorias.split(",").filter(c => c).join(", ") : "Seleccionar categorías..."}</span>
                <svg className="w-5 h-5 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </summary>
              <div className="p-4 max-h-64 overflow-y-auto">
                {categories.filter(c => c.activo).length === 0 ? (
                  <p className="text-[var(--muted)] text-sm text-center py-4">No hay categorías disponibles</p>
                ) : (
                  <div className="space-y-2">
                    {categories.filter(c => c.activo).map(cat => {
                      const isSel = form.categorias?.split(",").filter(c => c).includes(cat.nombre) || false;
                      return (
                        <label key={cat._id} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${isSel ? "bg-indigo-50 border-2 border-indigo-500" : "hover:bg-[var(--bg)] border-2 border-transparent"}`}>
                          <input type="checkbox" checked={isSel} onChange={(e) => { const cur = form.categorias?.split(",").filter(c => c) || []; const upd = e.target.checked ? [...cur, cat.nombre] : cur.filter(c => c !== cat.nombre); setForm({ ...form, categorias: upd.join(",") }); }} className="w-5 h-5 text-indigo-600 border-[var(--line)] rounded focus:ring-2 focus:ring-indigo-500" />
                          <div className="flex-1"><span className={`font-medium text-sm ${isSel ? "text-indigo-900" : "text-[var(--ink)]"}`}>{cat.nombre}</span>{cat.descripcion && <p className="text-xs text-[var(--muted)] mt-0.5">{cat.descripcion}</p>}</div>
                          {isSel && <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </details>
            {form.categorias && form.categorias.split(",").filter(c => c).length > 0 && (
              <button type="button" onClick={() => setForm({ ...form, categorias: "" })} className="mt-2 text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>Limpiar selección
              </button>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 md:p-5 space-y-4">
          <h2 className="font-bold text-[var(--ink)]">Contacto y búsqueda</h2>
          <div>
            <label className="block text-sm font-medium text-[var(--ink)] mb-2">Video de YouTube (URL)</label>
            <input name="videoUrl" value={form.videoUrl} onChange={handleChange} placeholder="https://www.youtube.com/watch?v=XXXXX o https://youtu.be/XXXXX" className="w-full px-4 py-3 border border-[var(--line)] rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            <p className="text-xs text-[var(--muted)] mt-1">🎬 Aparecerá como miniatura con ícono de Play en la galería del producto.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--ink)] mb-2">Número de WhatsApp</label>
            <input name="whatsappNumero" value={form.whatsappNumero} onChange={handleChange} placeholder={SITE.whatsappPedidos} className="w-full px-4 py-3 border border-[var(--line)] rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            <p className="text-xs text-[var(--muted)] mt-1">Solo el número, con código de país (51...) — el mensaje y el link del producto se arman solos.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--ink)] mb-2">Tags (opcional)</label>
            <input name="tags" value={form.tags} onChange={handleChange} placeholder="mochila, escolar, kpop, colores" className="w-full px-4 py-3 border border-[var(--line)] rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            <p className="text-xs text-[var(--muted)] mt-1">Separados por comas — mejoran la búsqueda interna.</p>
            {form.tags && <div className="flex flex-wrap gap-1 mt-2">{form.tags.split(",").map(t => t.trim()).filter(Boolean).map((tag, i) => <span key={i} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium">{tag}</span>)}</div>}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <button type="submit" disabled={isUploading} className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-3 px-6 rounded-lg font-semibold hover:from-indigo-700 hover:to-indigo-800 transition shadow-md text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed">
            {isUploading ? "⏳ Subiendo imágenes..." : isEditing ? "💾 Guardar Cambios" : "➕ Agregar Producto"}
          </button>
          <Link href="/admin/productos" className="w-full text-center px-6 py-3 border-2 border-[var(--line)] text-[var(--ink)] rounded-lg font-semibold hover:bg-[var(--bg)] transition text-sm md:text-base">❌ Cancelar</Link>
          {isEditing && <button type="button" onClick={handleDelete} className="w-full px-6 py-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition text-sm md:text-base">🗑️ Eliminar</button>}
        </div>
      </div>
    </form>
  );
}
