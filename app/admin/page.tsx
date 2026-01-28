"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { invalidateCachePattern } from "@/lib/cache";
import { Package, Image, FolderTree, Sparkles, AlertCircle, TrendingUp } from "lucide-react";
import { validateImageUrl, validateMultipleImageUrls, IMAGE_LIMITS } from "@/lib/imageValidation";
import { useAuth } from "@/lib/useAuth"; 

type Product = {
  _id: string;
  nombre: string;
  precio: number;
  descripcion?: string;
  categorias?: string[];        
  categoriaSlugs?: string[];
  stock?: "Disponible" | "Limitado" | "Agotado";
  imagenUrl?: string;
  slug?: string;
  deliveryHuancayo?: boolean;
  mostrarEnHome?: boolean;
  descripcionCompleta?: string;
  caracteristicas?: string[];
  metaTitulo?: string;
  metaDescripcion?: string;
  metaImagen?: string;
  imagenesAdicionales?: string[];
  whatsappLink?: string;
  videoUrl?: string;
};

type Banner = {
  _id: string;
  titulo: string;
  imagenUrl: string;
  enlace?: string;
  posicion: "top-left" | "top-right" | "middle-full" | "bottom-left" | "bottom-right";
  ubicaciones?: string[];
  activo: boolean;
};

type Category = {
  _id: string;
  nombre: string;
  slug: string;
  descripcion?: string;
  imagenUrl?: string;
  activo: boolean;
  orden: number;
};

type Promotion = {
  _id: string;
  titulo: string;
  descripcion?: string;
  descripcionCompleta?: string;
  precio: number;
  precioAnterior?: number;
  imagenUrl: string;
  imagenesAdicionales?: string[];
  tipoEtiqueta: "Combo" | "2x1" | "Descuento" | "Oferta" | "Nuevo";
  stock: "Disponible" | "Limitado" | "Agotado";
  activo: boolean;
  orden: number;
  whatsappLink?: string;
  caracteristicas?: string[];
  metaTitulo?: string;
  metaDescripcion?: string;
  metaImagen?: string;
};

export default function AdminPage() {
  const router = useRouter();
  const { isAuthenticated, isChecking } = useAuth();
  const [showProductForm, setShowProductForm] = useState(false);
  const [showBannerForm, setShowBannerForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showPromotionForm, setShowPromotionForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"products" | "banners" | "categories" | "promotions">("products");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  
  // PRODUCTS
  const [form, setForm] = useState({
  nombre: "", precio: "", descripcion: "", categorias: "",  stock: "Disponible", 
  imagenUrl: "", deliveryHuancayo: true, descripcionCompleta: "", caracteristicas: "",
  metaTitulo: "", metaDescripcion: "", metaImagen: "", mostrarEnHome: false,
  imagenesAdicionales: "", whatsappLink: "", videoUrl: "" // ✅ AGREGAR
});
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // BANNERS
  const [bannerForm, setBannerForm] = useState({
    titulo: "", imagenUrl: "", enlace: "", posicion: "top-left" as "top-left" | "top-right" | "middle-full" | "bottom-left" | "bottom-right", ubicaciones: [""] as string[], activo: true,
  });
  const [banners, setBanners] = useState<Banner[]>([]);
  const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null);
  const [isEditingBanner, setIsEditingBanner] = useState(false);

  // CATEGORIES
  const [categoryForm, setCategoryForm] = useState({
    nombre: "", descripcion: "", imagenUrl: "", activo: true, orden: 0
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryEdit, setSelectedCategoryEdit] = useState<Category | null>(null);
  const [isEditingCategory, setIsEditingCategory] = useState(false);

    // PROMOTIONS
  const [promotionForm, setPromotionForm] = useState({
    titulo: "", descripcion: "", descripcionCompleta: "", precio: "", precioAnterior: "",
    imagenUrl: "", imagenesAdicionales: "", tipoEtiqueta: "Oferta" as "Combo" | "2x1" | "Descuento" | "Oferta" | "Nuevo",
    stock: "Disponible" as "Disponible" | "Limitado" | "Agotado", activo: true, orden: 0,
    whatsappLink: "", caracteristicas: "", metaTitulo: "", metaDescripcion: "", metaImagen: ""
  });
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [isEditingPromotion, setIsEditingPromotion] = useState(false);

    const loadProducts = async () => {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      
      // ✅ VALIDAR que sea array
      if (Array.isArray(data)) {
        setProducts(data);
      } else {
        console.error("❌ La API no devolvió un array:", data);
        setProducts([]);
      }
    } catch (err) {
      console.error("Error cargando productos:", err);
      setProducts([]);
    }
  };

  const loadBanners = async () => {
    try {
      const res = await fetch("/api/banners");
      const data = await res.json();
      
      // ✅ VALIDAR que sea array
      if (Array.isArray(data)) {
        setBanners(data);
      } else {
        console.error("❌ La API no devolvió un array:", data);
        setBanners([]);
      }
    } catch (err) {
      console.error("Error cargando banners:", err);
      setBanners([]);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      
      // ✅ VALIDAR que sea array
      if (Array.isArray(data)) {
        setCategories(data);
      } else {
        console.error("❌ La API no devolvió un array:", data);
        setCategories([]);
      }
    } catch (err) {
      console.error("Error cargando categorías:", err);
      setCategories([]);
    }
  };

  const loadPromotions = async () => {
    try {
      const res = await fetch("/api/promotions");
      const data = await res.json();
      
      // ✅ VALIDAR que sea array
      if (Array.isArray(data)) {
        setPromotions(data);
      } else {
        console.error("❌ La API no devolvió un array:", data);
        setPromotions([]);
      }
    } catch (err) {
      console.error("Error cargando promociones:", err);
      setPromotions([]);
    }
  };

  useEffect(() => {
    loadProducts();
    loadBanners();
    loadCategories();
    loadPromotions();
  }, []);

  const stats = [
  {
    title: "Productos",
    value: products.length,
    icon: Package,
    color: "bg-blue-500",
    details: `${products.filter(p => p.mostrarEnHome).length} en home`,
    link: "products"
  },
  {
    title: "Categorías",
    value: categories.filter(c => c.activo).length,
    icon: FolderTree,
    color: "bg-purple-500",
    details: `${categories.length} total`,
    link: "categories"
  },
  {
    title: "Banners",
    value: banners.filter(b => b.activo).length,
    icon: Image,
    color: "bg-orange-500",
    details: `${banners.length} total`,
    link: "banners"
  },
  {
    title: "Promociones",
    value: promotions.filter(p => p.activo).length,
    icon: Sparkles,
    color: "bg-pink-500",
    details: `${promotions.length} total`,
    link: "promotions"
  }
];

const stockStats = {
  disponible: products.filter(p => p.stock === "Disponible").length,
  limitado: products.filter(p => p.stock === "Limitado").length,
  agotado: products.filter(p => p.stock === "Agotado").length
};

  // PRODUCTS HANDLERS
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm({ ...form, [e.target.name]: value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.nombre || !form.precio) {
      alert("Nombre y precio son obligatorios");
      return;
    }

      // ✅ VALIDAR IMAGEN PRINCIPAL
  if (form.imagenUrl && form.imagenUrl.trim()) {
    const validation = validateImageUrl(form.imagenUrl.trim());
    if (!validation.valid) {
      alert(`❌ Imagen principal inválida:\n${validation.error}\n\nURL: ${form.imagenUrl}`);
      return;
    }
  }

  // ✅ VALIDAR IMÁGENES ADICIONALES
  if (form.imagenesAdicionales && form.imagenesAdicionales.trim()) {
    const urls = form.imagenesAdicionales.split('\n').filter(url => url.trim());
    
    // Límite de imágenes
    if (urls.length > IMAGE_LIMITS.MAX_ADDITIONAL_IMAGES) {
      alert(`❌ Máximo ${IMAGE_LIMITS.MAX_ADDITIONAL_IMAGES} imágenes adicionales.\nTienes: ${urls.length}`);
      return;
    }

    // Validar cada URL
    const validation = validateMultipleImageUrls(urls);
    if (!validation.valid) {
      alert(`❌ Imágenes adicionales inválidas:\n\n${validation.errors.join('\n\n')}`);
      return;
    }
  }

  // ✅ VALIDAR META IMAGEN
  if (form.metaImagen && form.metaImagen.trim()) {
    const validation = validateImageUrl(form.metaImagen.trim());
    if (!validation.valid) {
      alert(`❌ Meta imagen inválida:\n${validation.error}\n\nURL: ${form.metaImagen}`);
      return;
    }
  }
  
    // Encontrar la categoría seleccionada para obtener su slug
    const selectedCategories = form.categorias
      ? form.categorias.split(',').filter(c => c.trim())
      : [];

    const selectedSlugs = selectedCategories
      .map(catName => categories.find(c => c.nombre === catName)?.slug)
      .filter(Boolean);

    const productData = {
      nombre: form.nombre.trim(),
      precio: Number(form.precio),
      descripcion: form.descripcion?.trim() || "",
      descripcionCompleta: form.descripcionCompleta?.trim() || "",
      categorias: selectedCategories,
      categoriaSlugs: selectedSlugs,
      stock: form.stock,
      imagenUrl: form.imagenUrl?.trim() || "",
      imagenesAdicionales: form.imagenesAdicionales ? form.imagenesAdicionales.split('\n').filter(url => url.trim()) : [],
      videoUrl: form.videoUrl?.trim() || "",
      deliveryHuancayo: form.deliveryHuancayo,
      mostrarEnHome: form.mostrarEnHome,
      whatsappLink: form.whatsappLink?.trim() || "",
      caracteristicas: form.caracteristicas ? form.caracteristicas.split('\n').filter(c => c.trim()) : [],
      metaTitulo: form.metaTitulo?.trim() || form.nombre.trim(),
      metaDescripcion: form.metaDescripcion?.trim() || form.descripcion?.trim() || "",
      metaImagen: form.metaImagen?.trim() || form.imagenUrl?.trim() || "",
    };

    try {
      let response;
      if (isEditing && selectedProduct) {
        response = await fetch(`/api/products/${selectedProduct._id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(productData),
        });
      } else {
        response = await fetch("/api/products", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(productData),
        });
      }

      if (!response.ok) {
        const error = await response.json();
        alert(`Error: ${error.error || 'No se pudo guardar el producto'}`);
        return;
      }

      invalidateCachePattern("products");
      console.log("🗑️ Caché de productos invalidado");

      alert(isEditing ? "Producto actualizado" : "Producto agregado");
      setForm({ 
        nombre: "", precio: "", descripcion: "", categorias: "", stock: "Disponible", 
        imagenUrl: "", deliveryHuancayo: true, descripcionCompleta: "", caracteristicas: "",
        metaTitulo: "", metaDescripcion: "", metaImagen: "", mostrarEnHome: false,
        imagenesAdicionales: "", whatsappLink: "", videoUrl: "" 
      });
      setIsEditing(false);
      setSelectedProduct(null);
      await loadProducts();
    } catch (err) {
      console.error("Error guardando producto:", err);
      alert("Error de conexión al guardar el producto");
    }
  };

  const handleSelect = (product: Product) => {
    setSelectedProduct(product);
    setForm({
      nombre: product.nombre,
      precio: product.precio.toString(),
      descripcion: product.descripcion || "",
      descripcionCompleta: product.descripcionCompleta || "",
      categorias: Array.isArray(product.categorias) ? product.categorias.join(',') : "",
      stock: product.stock || "Disponible",
      imagenUrl: product.imagenUrl || "",
      imagenesAdicionales: product.imagenesAdicionales?.join('\n') || "",
      videoUrl: product.videoUrl || "",
      deliveryHuancayo: product.deliveryHuancayo ?? true,
      mostrarEnHome: product.mostrarEnHome ?? false,
      whatsappLink: product.whatsappLink || "",
      caracteristicas: product.caracteristicas?.join('\n') || "",
      metaTitulo: product.metaTitulo || "",
      metaDescripcion: product.metaDescripcion || "",
      metaImagen: product.metaImagen || "",
    });
    setIsEditing(true);
    setShowProductForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar este producto?")) return;

    try {
      const response = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const errorData = await response.json();
        alert(`Error: ${errorData.error || 'No se pudo eliminar el producto'}`);
        return;
      }

    invalidateCachePattern("products");
    console.log("🗑️ Caché de productos invalidado");

      if (selectedProduct && selectedProduct._id === id) {
        setSelectedProduct(null);
        setIsEditing(false);
        setForm({ 
          nombre: "", precio: "", descripcion: "", categorias: "",  stock: "Disponible", 
          imagenUrl: "", deliveryHuancayo: true, descripcionCompleta: "", caracteristicas: "",
          metaTitulo: "", metaDescripcion: "", metaImagen: "", mostrarEnHome: false,
          imagenesAdicionales: "", whatsappLink: "", videoUrl: ""
        });
      }
      await loadProducts();
      alert("Producto eliminado correctamente");
    } catch (err) {
      console.error("Error eliminando producto:", err);
      alert("Error de conexión al eliminar el producto");
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSelectedProduct(null);
    setForm({ 
      nombre: "", precio: "", descripcion: "", categorias: "", stock: "Disponible", 
      imagenUrl: "", deliveryHuancayo: true, descripcionCompleta: "", caracteristicas: "",
      metaTitulo: "", metaDescripcion: "", metaImagen: "", mostrarEnHome: false,
      imagenesAdicionales: "", whatsappLink: "", videoUrl: ""
    });
  };

  // BANNERS HANDLERS
  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setBannerForm({ ...bannerForm, [e.target.name]: value });
  };

  const handleUbicacionToggle = (slug: string) => {
    const current = bannerForm.ubicaciones || [];
    if (current.includes(slug)) {
      setBannerForm({ ...bannerForm, ubicaciones: current.filter(u => u !== slug) });
    } else {
      setBannerForm({ ...bannerForm, ubicaciones: [...current, slug] });
    }
  };

  const handleBannerSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!bannerForm.titulo || !bannerForm.imagenUrl) {
      alert("Título e imagen son obligatorios");
      return;
    }
    if (!bannerForm.ubicaciones || bannerForm.ubicaciones.length === 0) {
      alert("Debes seleccionar al menos una ubicación");
      return;
    }
    if ((bannerForm.posicion === "bottom-left" || bannerForm.posicion === "bottom-right") && !bannerForm.enlace) {
      alert("Los banners de abajo requieren un enlace obligatorio");
      return;
    }
    if (bannerForm.posicion === "middle-full" && bannerForm.enlace) {
      alert("El banner del medio no debe tener enlace");
      return;
    }

    const bannerData = {
      titulo: bannerForm.titulo.trim(), imagenUrl: bannerForm.imagenUrl.trim(),
      enlace: bannerForm.enlace?.trim() || "", posicion: bannerForm.posicion, 
      ubicaciones: bannerForm.ubicaciones, activo: bannerForm.activo,
    };

    try {
      let response;
      if (isEditingBanner && selectedBanner) {
        response = await fetch(`/api/banners/${selectedBanner._id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(bannerData),
        });
      } else {
        response = await fetch("/api/banners", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(bannerData),
        });
      }

      if (!response.ok) {
        const error = await response.json();
        alert(`Error: ${error.error || 'No se pudo guardar el banner'}`);
        return;
      }

      invalidateCachePattern("banners");
      console.log("🗑️ Caché de banners invalidado");

      alert(isEditingBanner ? "Banner actualizado" : "Banner agregado");
      setBannerForm({ titulo: "", imagenUrl: "", enlace: "", posicion: "top-left", ubicaciones: [""], activo: true });
      setIsEditingBanner(false);
      setSelectedBanner(null);
      await loadBanners();
    } catch (err) {
      console.error("Error guardando banner:", err);
      alert("Error de conexión al guardar el banner");
    }
  };

  const handleBannerSelect = (banner: Banner) => {
    setSelectedBanner(banner);
    setBannerForm({
      titulo: banner.titulo, imagenUrl: banner.imagenUrl, enlace: banner.enlace || "",
      posicion: banner.posicion, ubicaciones: banner.ubicaciones || [""], activo: banner.activo,
    });
    setIsEditingBanner(true);
    setShowBannerForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBannerDelete = async (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar este banner?")) return;

    try {
      const response = await fetch(`/api/banners/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const errorData = await response.json();
        alert(`Error: ${errorData.error || 'No se pudo eliminar el banner'}`);
        return;
      }

      invalidateCachePattern("banners");
      console.log("🗑️ Caché de banners invalidado");

      if (selectedBanner && selectedBanner._id === id) {
        setSelectedBanner(null);
        setIsEditingBanner(false);
        setBannerForm({ titulo: "", imagenUrl: "", enlace: "", posicion: "top-left", ubicaciones: [""], activo: true });
      }
      await loadBanners();
      alert("Banner eliminado correctamente");
    } catch (err) {
      console.error("Error eliminando banner:", err);
      alert("Error de conexión al eliminar el banner");
    }
  };

  const handleBannerCancel = () => {
    setIsEditingBanner(false);
    setSelectedBanner(null);
    setBannerForm({ titulo: "", imagenUrl: "", enlace: "", posicion: "top-left", ubicaciones: [""], activo: true });
  };

  // CATEGORIES HANDLERS
  const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, type } = e.target;
    const value = type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setCategoryForm({ ...categoryForm, [name]: value });
  };

  const handleCategorySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!categoryForm.nombre) {
      alert("El nombre es obligatorio");
      return;
    }

    const categoryData = {
      nombre: categoryForm.nombre.trim(),
      descripcion: categoryForm.descripcion?.trim() || "",
      imagenUrl: categoryForm.imagenUrl?.trim() || "",
      activo: categoryForm.activo,
      orden: Number(categoryForm.orden) || 0,
    };

    try {
      let response;
      if (isEditingCategory && selectedCategoryEdit) {
        response = await fetch(`/api/categories/${selectedCategoryEdit._id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(categoryData),
        });
      } else {
        response = await fetch("/api/categories", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(categoryData),
        });
      }

      if (!response.ok) {
        const error = await response.json();
        alert(`Error: ${error.error || 'No se pudo guardar la categoría'}`);
        return;
      }

      invalidateCachePattern("categories");
      console.log("🗑️ Caché de categorías invalidado");

      alert(isEditingCategory ? "Categoría actualizada" : "Categoría agregada");
      setCategoryForm({ nombre: "", descripcion: "", imagenUrl: "", activo: true, orden: 0 });
      setIsEditingCategory(false);
      setSelectedCategoryEdit(null);
      await loadCategories();
    } catch (err) {
      console.error("Error guardando categoría:", err);
      alert("Error de conexión al guardar la categoría");
    }
  };

  const handleCategorySelect = (category: Category) => {
    setSelectedCategoryEdit(category);
    setCategoryForm({
      nombre: category.nombre || "",
      descripcion: category.descripcion || "",
      imagenUrl: category.imagenUrl || "",
      activo: category.activo ?? true,
      orden: category.orden || 0,
    });
    setIsEditingCategory(true);
    setShowCategoryForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCategoryDelete = async (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar esta categoría?")) return;

    try {
      const response = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const errorData = await response.json();
        alert(`Error: ${errorData.error || 'No se pudo eliminar la categoría'}`);
        return;
      }

      invalidateCachePattern("categories");
      console.log("🗑️ Caché de categorías invalidado");

      if (selectedCategoryEdit && selectedCategoryEdit._id === id) {
        setSelectedCategoryEdit(null);
        setIsEditingCategory(false);
        setCategoryForm({ nombre: "", descripcion: "", imagenUrl: "", activo: true, orden: 0 });
      }
      await loadCategories();
      alert("Categoría eliminada correctamente");
    } catch (err) {
      console.error("Error eliminando categoría:", err);
      alert("Error de conexión al eliminar la categoría");
    }
  };

  const handleCategoryCancel = () => {
    setIsEditingCategory(false);
    setSelectedCategoryEdit(null);
    setCategoryForm({ nombre: "", descripcion: "", imagenUrl: "", activo: true, orden: 0 });
  };

    // PROMOTIONS HANDLERS
  const handlePromotionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, type } = e.target;
    const value = type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setPromotionForm({ ...promotionForm, [name]: value });
  };

  const handlePromotionSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!promotionForm.titulo || !promotionForm.precio) {
      alert("Título y precio son obligatorios");
      return;
    }

    const promotionData = {
      titulo: promotionForm.titulo.trim(),
      descripcion: promotionForm.descripcion?.trim() || "",
      descripcionCompleta: promotionForm.descripcionCompleta?.trim() || "",
      precio: Number(promotionForm.precio),
      precioAnterior: promotionForm.precioAnterior ? Number(promotionForm.precioAnterior) : undefined,
      imagenUrl: promotionForm.imagenUrl?.trim() || "",
      imagenesAdicionales: promotionForm.imagenesAdicionales 
        ? promotionForm.imagenesAdicionales.split('\n').filter(url => url.trim()) 
        : [],
      tipoEtiqueta: promotionForm.tipoEtiqueta,
      stock: promotionForm.stock,
      activo: promotionForm.activo,
      orden: Number(promotionForm.orden) || 0,
      whatsappLink: promotionForm.whatsappLink?.trim() || "",
      caracteristicas: promotionForm.caracteristicas 
        ? promotionForm.caracteristicas.split('\n').filter(c => c.trim()) 
        : [],
      metaTitulo: promotionForm.metaTitulo?.trim() || promotionForm.titulo.trim(),
      metaDescripcion: promotionForm.metaDescripcion?.trim() || promotionForm.descripcion?.trim() || "",
      metaImagen: promotionForm.metaImagen?.trim() || promotionForm.imagenUrl?.trim() || "",
    };

    try {
      let response;
      if (isEditingPromotion && selectedPromotion) {
        response = await fetch(`/api/promotions/${selectedPromotion._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(promotionData),
        });
      } else {
        response = await fetch("/api/promotions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(promotionData),
        });
      }

      if (!response.ok) {
        const error = await response.json();
        alert(`Error: ${error.error || 'No se pudo guardar la promoción'}`);
        return;
      }

      invalidateCachePattern("promotions");
      console.log("🗑️ Caché de promociones invalidado");

      alert(isEditingPromotion ? "Promoción actualizada" : "Promoción agregada");
      setPromotionForm({
        titulo: "", descripcion: "", descripcionCompleta: "", precio: "", precioAnterior: "",
        imagenUrl: "", imagenesAdicionales: "", tipoEtiqueta: "Oferta",
        stock: "Disponible", activo: true, orden: 0,
        whatsappLink: "", caracteristicas: "", metaTitulo: "", metaDescripcion: "", metaImagen: ""
      });
      setIsEditingPromotion(false);
      setSelectedPromotion(null);
      await loadPromotions();
    } catch (err) {
      console.error("Error guardando promoción:", err);
      alert("Error de conexión al guardar la promoción");
    }
  };

  const handlePromotionSelect = (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    setPromotionForm({
      titulo: promotion.titulo,
      descripcion: promotion.descripcion || "",
      descripcionCompleta: promotion.descripcionCompleta || "",
      precio: promotion.precio.toString(),
      precioAnterior: promotion.precioAnterior?.toString() || "",
      imagenUrl: promotion.imagenUrl || "",
      imagenesAdicionales: promotion.imagenesAdicionales?.join('\n') || "",
      tipoEtiqueta: promotion.tipoEtiqueta,
      stock: promotion.stock,
      activo: promotion.activo,
      orden: promotion.orden || 0,
      whatsappLink: promotion.whatsappLink || "",
      caracteristicas: promotion.caracteristicas?.join('\n') || "",
      metaTitulo: promotion.metaTitulo || "",
      metaDescripcion: promotion.metaDescripcion || "",
      metaImagen: promotion.metaImagen || "",
    });
    setIsEditingPromotion(true);
    setShowPromotionForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePromotionDelete = async (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar esta promoción?")) return;

    try {
      const response = await fetch(`/api/promotions/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const errorData = await response.json();
        alert(`Error: ${errorData.error || 'No se pudo eliminar la promoción'}`);
        return;
      }

      invalidateCachePattern("promotions");
      console.log("🗑️ Caché de promociones invalidado");

      if (selectedPromotion && selectedPromotion._id === id) {
        setSelectedPromotion(null);
        setIsEditingPromotion(false);
        setPromotionForm({
          titulo: "", descripcion: "", descripcionCompleta: "", precio: "", precioAnterior: "",
          imagenUrl: "", imagenesAdicionales: "", tipoEtiqueta: "Oferta",
          stock: "Disponible", activo: true, orden: 0,
          whatsappLink: "", caracteristicas: "", metaTitulo: "", metaDescripcion: "", metaImagen: ""
        });
      }
      await loadPromotions();
      alert("Promoción eliminada correctamente");
    } catch (err) {
      console.error("Error eliminando promoción:", err);
      alert("Error de conexión al eliminar la promoción");
    }
  };

  const handlePromotionCancel = () => {
    setIsEditingPromotion(false);
    setSelectedPromotion(null);
    setPromotionForm({
      titulo: "", descripcion: "", descripcionCompleta: "", precio: "", precioAnterior: "",
      imagenUrl: "", imagenesAdicionales: "", tipoEtiqueta: "Oferta",
      stock: "Disponible", activo: true, orden: 0,
      whatsappLink: "", caracteristicas: "", metaTitulo: "", metaDescripcion: "", metaImagen: ""
    });
  };

  const handleLogout = async () => {
    if (confirm("¿Cerrar sesión?")) {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login-admin");
      } catch (error) {
        console.error("Error al cerrar sesión:", error);
      }
    }
  };

  const getEtiquetaLabel = (tipo: string) => {
    switch(tipo) {
      case "Combo": return "🔴 Combo";
      case "2x1": return "🟠 2x1";
      case "Descuento": return "🟣 Descuento";
      case "Oferta": return "🔴 Oferta";
      case "Nuevo": return "🔵 Nuevo";
      default: return tipo;
    }
  };

  const getPosicionLabel = (pos: string) => {
    switch(pos) {
      case "top-left": return "🔴 Arriba Izq";
      case "top-right": return "🔴 Arriba Der";
      case "middle-full": return "🟢 Medio";
      case "bottom-left": return "🔵 Abajo Izq";
      case "bottom-right": return "🔵 Abajo Der";
      default: return pos;
    }
  };

  const validProducts = Array.isArray(products) ? products : [];
  // Filtrar por categoría si hay una seleccionada
  let productsToShow = selectedCategory 
    ? validProducts.filter(p => p.categoriaSlugs?.includes(selectedCategory))
    : validProducts;
  // Calcular paginación
  const indexOfLastProduct = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstProduct = indexOfLastProduct - ITEMS_PER_PAGE;
  const currentProducts = productsToShow.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(productsToShow.length / ITEMS_PER_PAGE);

    if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-orange-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-orange-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-gray-800">Panel Administrativo</h1>
            <p className="text-gray-600 text-sm md:text-base mt-1">Gestiona productos, banners y categorías</p>
          </div>
          
          {/* Botón de logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Cerrar Sesión</span>
            <span className="sm:hidden">Salir</span>
          </button>
        </div>

        <div className="space-y-6 mb-6">
        {/* Tarjetas de estadísticas principales */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(stat.link as any)}
              className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 text-left"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`${stat.color} p-3 rounded-xl text-white`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <h3 className="text-gray-600 text-sm font-medium mb-1">{stat.title}</h3>
              <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.details}</p>
            </button>
          ))}
        </div>

        {/* Tarjetas adicionales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Estado de Stock */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-bold text-gray-800">Estado de Stock</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">Disponible</span>
                </div>
                <span className="text-lg font-bold text-green-600">{stockStats.disponible}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">Limitado</span>
                </div>
                <span className="text-lg font-bold text-yellow-600">{stockStats.limitado}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">Agotado</span>
                </div>
                <span className="text-lg font-bold text-red-600">{stockStats.agotado}</span>
              </div>
            </div>
          </div>
            {/* Resumen rápido */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
              <h3 className="text-lg font-bold mb-4">📊 Resumen Rápido</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-white/20">
                  <span className="text-sm opacity-90">Total productos</span>
                  <span className="text-2xl font-bold">{products.length}</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-white/20">
                  <span className="text-sm opacity-90">Categorías activas</span>
                  <span className="text-2xl font-bold">{categories.filter(c => c.activo).length}</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-white/20">
                  <span className="text-sm opacity-90">Banners activos</span>
                  <span className="text-2xl font-bold">{banners.filter(b => b.activo).length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm opacity-90">Promociones activas</span>
                  <span className="text-2xl font-bold">{promotions.filter(p => p.activo).length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Alerta de productos con stock bajo */}
          {stockStats.limitado > 0 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-yellow-800 mb-1">⚠️ Atención requerida</h4>
                  <p className="text-sm text-yellow-700">
                    Tienes <strong>{stockStats.limitado}</strong> producto{stockStats.limitado !== 1 ? 's' : ''} con stock limitado. 
                    Considera reabastecer pronto.
                  </p>
                </div>
              </div>
            </div>
          )}

          {stockStats.agotado > 0 && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-red-800 mb-1">❌ Productos agotados</h4>
                  <p className="text-sm text-red-700">
                    Tienes <strong>{stockStats.agotado}</strong> producto{stockStats.agotado !== 1 ? 's' : ''} agotado{stockStats.agotado !== 1 ? 's' : ''}. 
                    Los clientes no podrán comprarlos hasta que actualices el stock.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-2 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            <button 
              onClick={() => setActiveTab("products")} 
              className={`flex-shrink-0 py-2 md:py-3 px-4 md:px-6 rounded-xl font-semibold transition text-sm md:text-base whitespace-nowrap ${
                activeTab === "products" 
                  ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md" 
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              📦 Productos
            </button>
            <button 
              onClick={() => setActiveTab("banners")} 
              className={`flex-shrink-0 py-2 md:py-3 px-4 md:px-6 rounded-xl font-semibold transition text-sm md:text-base whitespace-nowrap ${
                activeTab === "banners" 
                  ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md" 
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              🎨 Banners
            </button>
            <button 
              onClick={() => setActiveTab("categories")} 
              className={`flex-shrink-0 py-2 md:py-3 px-4 md:px-6 rounded-xl font-semibold transition text-sm md:text-base whitespace-nowrap ${
                activeTab === "categories" 
                  ? "bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md" 
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              📂 Categorías
            </button>
            <button 
              onClick={() => setActiveTab("promotions")} 
              className={`flex-shrink-0 py-2 md:py-3 px-4 md:px-6 rounded-xl font-semibold transition text-sm md:text-base whitespace-nowrap ${
                activeTab === "promotions" 
                  ? "bg-gradient-to-r from-pink-600 to-pink-700 text-white shadow-md" 
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              ✨ Promociones
            </button>
          </div>
        </div>
    {activeTab === "categories" && (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
          <button
            onClick={() => {
              setShowCategoryForm(!showCategoryForm);
              if (!showCategoryForm) {
                setIsEditingCategory(false);
                setSelectedCategoryEdit(null);
                setCategoryForm({ nombre: "", descripcion: "", imagenUrl: "", activo: true, orden: 0 });
              }
            }}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2 ${
              showCategoryForm 
                ? "bg-gray-200 text-gray-700 hover:bg-gray-300" 
                : "bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 shadow-lg"
            }`}
          >
            {showCategoryForm ? "✖️ Cerrar Formulario" : "➕ Agregar Nueva Categoría"}
          </button>
        </div>

        {showCategoryForm && (
                <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 md:mb-6">{isEditingCategory ? "✏️ Editar Categoría" : "➕ Agregar Categoría"}</h2>
                  <form onSubmit={handleCategorySubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Nombre *</label>
                        <input name="nombre" value={categoryForm.nombre} onChange={handleCategoryChange} placeholder="Ej: Tecnología" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Orden</label>
                        <input name="orden" type="number" value={categoryForm.orden} onChange={handleCategoryChange} placeholder="0" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">URL Imagen</label>
                      <input name="imagenUrl" value={categoryForm.imagenUrl} onChange={handleCategoryChange} placeholder="https://..." className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                      <textarea name="descripcion" value={categoryForm.descripcion} onChange={handleCategoryChange} placeholder="Describe la categoría..." rows={2} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none" />
                    </div>
                    <label className="flex items-center cursor-pointer">
                      <input type="checkbox" name="activo" checked={categoryForm.activo} onChange={handleCategoryChange} className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-2 focus:ring-purple-500" />
                      <span className="ml-3 text-sm font-medium text-gray-700">Categoría activa</span>
                    </label>
                    <div className="flex flex-col md:flex-row gap-3 pt-2">
                      <button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 px-6 rounded-lg font-semibold hover:from-purple-700 hover:to-purple-800 transition shadow-md text-sm md:text-base">
                        {isEditingCategory ? "💾 Guardar Cambios" : "➕ Agregar Categoría"}
                      </button>
                      {isEditingCategory && (
                        <button type="button" onClick={handleCategoryCancel} className="w-full md:w-auto px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition text-sm md:text-base">
                          ❌ Cancelar
                        </button>
                      )}
                    </div>
                  </form>
                </div>
        )}
                <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-6">📁 Lista ({categories.length})</h2>
                  {categories.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <p className="text-lg md:text-xl">No hay categorías</p>
                      <p className="mt-2 text-sm">¡Crea tu primera categoría! 👆</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categories.map((c) => (
                        <div key={c._id} className="border border-gray-200 rounded-xl p-4 hover:shadow-lg transition bg-gradient-to-br from-white to-purple-50">
                          {c.imagenUrl && (
                            <div className="mb-3 rounded-lg overflow-hidden bg-gray-100 h-32 md:h-40 flex items-center justify-center">
                              <img src={c.imagenUrl} alt={c.nombre} className="max-h-full max-w-full object-contain" />
                            </div>
                          )}
                          <h3 className="font-bold text-base md:text-lg text-gray-800 mb-2">{c.nombre}</h3>
                          <p className="text-xs text-gray-500 mb-2">Slug: /{c.slug}</p>
                          {c.descripcion && <p className="text-xs md:text-sm text-gray-600 mb-2 line-clamp-2">{c.descripcion}</p>}
                          <div className="flex flex-wrap gap-2 mb-3">
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">Orden: {c.orden}</span>
                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${c.activo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                              {c.activo ? "Activa" : "Inactiva"}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleCategorySelect(c)} className="flex-1 bg-purple-600 text-white py-2 px-3 rounded-lg font-medium hover:bg-purple-700 transition text-xs md:text-sm">✏️ Editar</button>
                            <button onClick={() => handleCategoryDelete(c._id)} className="flex-1 bg-red-500 text-white py-2 px-3 rounded-lg font-medium hover:bg-red-600 transition text-xs md:text-sm">🗑️ Eliminar</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
            </div>
        )}
        {activeTab === "products" && (
          <div className="space-y-6">
            {/* Botón para mostrar/ocultar formulario */}
            <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
              <button
                onClick={() => {
                  setShowProductForm(!showProductForm);
                  if (!showProductForm) {
                    setIsEditing(false);
                    setSelectedProduct(null);
                    setForm({ 
                      nombre: "", precio: "", descripcion: "", categorias: "", stock: "Disponible", 
                      imagenUrl: "", deliveryHuancayo: true, descripcionCompleta: "", caracteristicas: "",
                      metaTitulo: "", metaDescripcion: "", metaImagen: "", mostrarEnHome: false,
                      imagenesAdicionales: "", whatsappLink: "", videoUrl: ""
                    });
                  }
                }}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                  showProductForm 
                    ? "bg-gray-200 text-gray-700 hover:bg-gray-300" 
                    : "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 shadow-lg"
                }`}
              >
                {showProductForm ? "✖️ Cerrar Formulario" : "➕ Agregar Nuevo Producto"}
              </button>
            </div>

            {/* Formulario (solo visible cuando showProductForm es true) */}
            {showProductForm && (
              <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 md:mb-6">
                  {isEditing ? "✏️ Editar Producto" : "➕ Agregar Producto"}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nombre *</label>
                      <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Ej: Laptop HP 15" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Precio (S/) *</label>
                      <input name="precio" type="number" step="0.01" value={form.precio} onChange={handleChange} placeholder="0.00" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Categorías {form.categorias && form.categorias.split(',').filter(c => c).length > 0 && (
                          <span className="ml-2 px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full font-bold">
                            {form.categorias.split(',').filter(c => c).length} seleccionadas
                          </span>
                        )}
                      </label>
                      
                      <details className="border border-gray-300 rounded-lg overflow-hidden bg-white">
                        <summary className="px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition font-medium text-gray-700 flex items-center justify-between">
                          <span>
                            {form.categorias && form.categorias.split(',').filter(c => c).length > 0
                              ? form.categorias.split(',').filter(c => c).join(', ')
                              : 'Seleccionar categorías...'}
                          </span>
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </summary>
                        
                        <div className="p-4 max-h-64 overflow-y-auto">
                          {categories.filter(c => c.activo).length === 0 ? (
                            <p className="text-gray-500 text-sm text-center py-4">No hay categorías disponibles</p>
                          ) : (
                            <div className="space-y-2">
                              {categories.filter(c => c.activo).map(cat => {
                                const isSelected = form.categorias?.split(',').filter(c => c).includes(cat.nombre) || false;
                                return (
                                  <label 
                                    key={cat._id} 
                                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
                                      isSelected 
                                        ? 'bg-indigo-50 border-2 border-indigo-500' 
                                        : 'hover:bg-gray-50 border-2 border-transparent'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        const current = form.categorias?.split(',').filter(c => c) || [];
                                        const updated = e.target.checked
                                          ? [...current, cat.nombre]
                                          : current.filter(c => c !== cat.nombre);
                                        setForm({ ...form, categorias: updated.join(',') });
                                      }}
                                      className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <div className="flex-1">
                                      <span className={`font-medium text-sm ${isSelected ? 'text-indigo-900' : 'text-gray-700'}`}>
                                        {cat.nombre}
                                      </span>
                                      {cat.descripcion && (
                                        <p className="text-xs text-gray-500 mt-0.5">{cat.descripcion}</p>
                                      )}
                                    </div>
                                    {isSelected && (
                                      <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </details>
                      
                      {form.categorias && form.categorias.split(',').filter(c => c).length > 0 && (
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, categorias: '' })}
                          className="mt-2 text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Limpiar selección
                        </button>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Stock</label>
                      <select name="stock" value={form.stock} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                        <option value="Disponible">✅ Disponible</option>
                        <option value="Limitado">⚠️ Limitado</option>
                        <option value="Agotado">❌ Agotado</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">URL Imagen Principal</label>
                    <input name="imagenUrl" value={form.imagenUrl} onChange={handleChange} placeholder="https://..." className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Imágenes Adicionales (una URL por línea)</label>
                    <textarea name="imagenesAdicionales" value={form.imagenesAdicionales} onChange={handleChange} placeholder="https://imagen2.jpg&#10;https://imagen3.jpg&#10;https://imagen4.jpg" rows={3} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
                    <p className="text-xs text-gray-500 mt-1">Estas imágenes aparecerán en la galería del producto</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Video de YouTube (URL)</label>
                    <input name="videoUrl" value={form.videoUrl} onChange={handleChange} placeholder="https://www.youtube.com/watch?v=XXXXX o https://youtu.be/XXXXX" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                    <p className="text-xs text-gray-500 mt-1">🎹 Pega el link completo del video de YouTube. Aparecerá como miniatura con ícono de Play.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Link de WhatsApp</label>
                    <input name="whatsappLink" value={form.whatsappLink} onChange={handleChange} placeholder="https://wa.me/51..." className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                    <p className="text-xs text-gray-500 mt-1">Formato: https://wa.me/51970189208?text=Hola...</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Descripción (para tarjeta)</label>
                    <textarea name="descripcion" value={form.descripcion} onChange={handleChange} placeholder="Descripción corta..." rows={2} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
                  </div>
                  <label className="flex items-center cursor-pointer">
                    <input type="checkbox" name="deliveryHuancayo" checked={form.deliveryHuancayo} onChange={handleChange} className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-2 focus:ring-indigo-500" />
                    <span className="ml-3 text-sm font-medium text-gray-700">🚚 Delivery gratis Huancayo</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input type="checkbox" name="mostrarEnHome" checked={form.mostrarEnHome} onChange={handleChange} className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-2 focus:ring-indigo-500" />
                    <span className="ml-3 text-sm font-medium text-gray-700">⭐ Mostrar en página de inicio</span>
                  </label>

                  <div className="border-t pt-4 mt-4">
                    <h3 className="font-bold text-gray-800 mb-3">📄 Información adicional (página del producto)</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Descripción Completa</label>
                        <textarea name="descripcionCompleta" value={form.descripcionCompleta} onChange={handleChange} placeholder="Descripción detallada del producto..." rows={4} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Características (una por línea)</label>
                        <textarea name="caracteristicas" value={form.caracteristicas} onChange={handleChange} placeholder="Pantalla 15.6 pulgadas&#10;Procesador Intel Core i5&#10;8GB RAM" rows={4} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <h3 className="font-bold text-gray-800 mb-3">🔍 SEO y Metadatos</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Meta Título</label>
                        <input name="metaTitulo" value={form.metaTitulo} onChange={handleChange} placeholder="Título para compartir (se usa el nombre si está vacío)" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Meta Descripción</label>
                        <textarea name="metaDescripcion" value={form.metaDescripcion} onChange={handleChange} placeholder="Descripción para redes sociales..." rows={2} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Meta Imagen</label>
                        <input name="metaImagen" value={form.metaImagen} onChange={handleChange} placeholder="URL imagen para compartir (se usa la principal si está vacía)" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-3 pt-2">
                    <button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-3 px-6 rounded-lg font-semibold hover:from-indigo-700 hover:to-indigo-800 transition shadow-md text-sm md:text-base">
                      {isEditing ? "💾 Guardar Cambios" : "➕ Agregar Producto"}
                    </button>
                    {isEditing && (
                      <button type="button" onClick={handleCancel} className="w-full md:w-auto px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition text-sm md:text-base">
                        ❌ Cancelar
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* Lista de productos con paginación */}
            <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-6">
                <h2 className="text-xl md:text-2xl font-bold text-gray-800">📋 Lista ({products.length})</h2>
                <div className="flex gap-2">
                  <select 
                    value={selectedCategory || ""} 
                    onChange={(e) => {
                      setSelectedCategory(e.target.value || null);
                      setCurrentPage(1);
                    }}
                    className="px-4 py-2 bg-white border-2 border-indigo-200 text-indigo-700 rounded-lg font-semibold hover:bg-indigo-50 transition text-sm"
                  >
                    <option value="">Todas las categorías</option>
                    {categories.map(c => (
                      <option key={c._id} value={c.slug}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              {products.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-lg md:text-xl">No hay productos</p>
                  <p className="mt-2 text-sm">¡Agrega tu primer producto! 👆</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {currentProducts.map((p) => (
                      <div key={p._id} className="border border-gray-200 rounded-xl p-4 hover:shadow-lg transition bg-gradient-to-br from-white to-gray-50">
                        {p.imagenUrl && (
                          <div className="mb-3 rounded-lg overflow-hidden bg-gray-100 h-32 md:h-40 flex items-center justify-center">
                            <img src={p.imagenUrl} alt={p.nombre} className="max-h-full max-w-full object-contain" />
                          </div>
                        )}
                        <h3 className="font-bold text-base md:text-lg text-gray-800 mb-2 line-clamp-2">{p.nombre}</h3>
                        <p className="text-xl md:text-2xl font-bold text-indigo-600 mb-2">S/ {p.precio.toFixed(2)}</p>
                        {p.slug && <p className="text-xs text-gray-500 mb-2">🔗 /producto/{p.slug}</p>}
                        {p.descripcion && <p className="text-xs md:text-sm text-gray-600 mb-2 line-clamp-2">{p.descripcion}</p>}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {Array.isArray(p.categorias) && p.categorias.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {(p.categorias as string[]).map((cat: string, idx: number) => (
                                <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">{cat}</span>
                              ))}
                            </div>
                          )}
                          {p.stock && (
                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${p.stock === "Disponible" ? "bg-green-100 text-green-700" : p.stock === "Limitado" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                              {p.stock}
                            </span>
                          )}
                          {p.deliveryHuancayo && <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">🚚 Delivery</span>}
                          {p.mostrarEnHome && <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">⭐ Home</span>}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleSelect(p)} className="flex-1 bg-indigo-600 text-white py-2 px-3 rounded-lg font-medium hover:bg-indigo-700 transition text-xs md:text-sm">✏️ Editar</button>
                          <button onClick={() => handleDelete(p._id)} className="flex-1 bg-red-500 text-white py-2 px-3 rounded-lg font-medium hover:bg-red-600 transition text-xs md:text-sm">🗑️ Eliminar</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Botones de paginación */}
                  {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-6">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition"
                      >
                        ← Anterior
                      </button>
                      
                      <span className="text-gray-700 font-medium">
                        Página {currentPage} de {totalPages}
                      </span>
                      
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition"
                      >
                        Siguiente →
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

    {activeTab === "banners" && (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-2xl p-4 md:p-6">
                <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-4">📍 Posiciones</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                    <div className="bg-white rounded-lg p-3 md:p-4 border border-red-200">
                    <div className="text-xl md:text-2xl mb-2">🔴</div>
                    <h4 className="font-bold text-gray-800 text-sm md:text-base">Arriba</h4>
                    <p className="text-xs md:text-sm text-gray-600">Enlace opcional</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 md:p-4 border border-green-200">
                    <div className="text-xl md:text-2xl mb-2">🟢</div>
                    <h4 className="font-bold text-gray-800 text-sm md:text-base">Medio</h4>
                    <p className="text-xs md:text-sm text-gray-600">Sin enlace</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 md:p-4 border border-blue-200">
                    <div className="text-xl md:text-2xl mb-2">🔵</div>
                    <h4 className="font-bold text-gray-800 text-sm md:text-base">Abajo</h4>
                    <p className="text-xs md:text-sm text-gray-600">Enlace obligatorio</p>
                    </div>
                </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
            <button
                onClick={() => {
                setShowBannerForm(!showBannerForm);
                if (!showBannerForm) {
                    setIsEditingBanner(false);
                    setSelectedBanner(null);
                    setBannerForm({ titulo: "", imagenUrl: "", enlace: "", posicion: "top-left", ubicaciones: [""], activo: true });
                }
                }}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                showBannerForm 
                    ? "bg-gray-200 text-gray-700 hover:bg-gray-300" 
                    : "bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-lg"
                }`}
            >
                {showBannerForm ? "✖️ Cerrar Formulario" : "➕ Agregar Nuevo Banner"}
            </button>
            </div>
            {showBannerForm && (
            <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 md:mb-6">{isEditingBanner ? "✏️ Editar Banner" : "➕ Agregar Banner"}</h2>
                <form onSubmit={handleBannerSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Título *</label>
                        <input name="titulo" value={bannerForm.titulo} onChange={handleBannerChange} placeholder="Ej: Ofertas de Verano" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Posición</label>
                        <select name="posicion" value={bannerForm.posicion} onChange={handleBannerChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none bg-white">
                        <option value="top-left">🔴 Arriba Izq</option>
                        <option value="top-right">🔴 Arriba Der</option>
                        <option value="middle-full">🟢 Medio</option>
                        <option value="bottom-left">🔵 Abajo Izq</option>
                        <option value="bottom-right">🔵 Abajo Der</option>
                        </select>
                    </div>
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Dónde mostrar este banner * (selecciona uno o varios)</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <label className="flex items-center cursor-pointer p-3 border-2 rounded-lg hover:bg-gray-50 transition" style={{ borderColor: bannerForm.ubicaciones?.includes("") ? "#f97316" : "#e5e7eb" }}>
                        <input 
                            type="checkbox" 
                            checked={bannerForm.ubicaciones?.includes("") || false}
                            onChange={() => handleUbicacionToggle("")}
                            className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-2 focus:ring-orange-500" 
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700">🏠 Home (inicio)</span>
                        </label>
                        {categories.filter(c => c.activo).map(cat => (
                        <label 
                            key={cat._id}
                            className="flex items-center cursor-pointer p-3 border-2 rounded-lg hover:bg-gray-50 transition" 
                            style={{ borderColor: bannerForm.ubicaciones?.includes(cat.slug) ? "#f97316" : "#e5e7eb" }}
                        >
                            <input 
                            type="checkbox" 
                            checked={bannerForm.ubicaciones?.includes(cat.slug) || false}
                            onChange={() => handleUbicacionToggle(cat.slug)}
                            className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-2 focus:ring-orange-500" 
                            />
                            <span className="ml-3 text-sm font-medium text-gray-700">📁 {cat.nombre}</span>
                        </label>
                        ))}
                    </div>
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">URL Imagen *</label>
                    <input name="imagenUrl" value={bannerForm.imagenUrl} onChange={handleBannerChange} placeholder="https://..." className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" required />
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Enlace {bannerForm.posicion.startsWith("bottom") ? "(Obligatorio)" : bannerForm.posicion === "middle-full" ? "(No disponible)" : "(Opcional)"}
                    </label>
                    <input name="enlace" value={bannerForm.enlace} onChange={handleBannerChange} placeholder={bannerForm.posicion === "middle-full" ? "No disponible" : "https://..."} disabled={bannerForm.posicion === "middle-full"} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none disabled:bg-gray-100" />
                    </div>
                    <label className="flex items-center cursor-pointer">
                    <input type="checkbox" name="activo" checked={bannerForm.activo} onChange={handleBannerChange} className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-2 focus:ring-orange-500" />
                    <span className="ml-3 text-sm font-medium text-gray-700">Banner activo</span>
                    </label>
                    <div className="flex flex-col md:flex-row gap-3 pt-2">
                    <button type="submit" className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition shadow-md text-sm md:text-base">
                        {isEditingBanner ? "💾 Guardar Cambios" : "➕ Agregar Banner"}
                    </button>
                    {isEditingBanner && (
                        <button type="button" onClick={handleBannerCancel} className="w-full md:w-auto px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition text-sm md:text-base">
                        ❌ Cancelar
                        </button>
                    )}
                    </div>
                </form>
            </div>
            )}
            {/* Lista siempre visible */}
            <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-6">🎨 Lista ({banners.length})</h2>
              {banners.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-lg md:text-xl">No hay banners</p>
                  <p className="mt-2 text-sm">¡Crea tu primer banner! 👆</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {banners.map((b) => (
                    <div key={b._id} className="border border-gray-200 rounded-xl p-4 hover:shadow-lg transition bg-gradient-to-br from-white to-orange-50">
                      <h3 className="font-bold text-base md:text-lg text-gray-800 mb-2">{b.titulo}</h3>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="inline-block px-3 py-1 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">{getPosicionLabel(b.posicion)}</span>
                        {b.ubicaciones && b.ubicaciones.length > 0 ? (
                          b.ubicaciones.map((ubicacion, idx) => (
                            <span key={idx} className="inline-block px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                              {ubicacion === "" ? "🏠 Home" : `📁 ${categories.find(c => c.slug === ubicacion)?.nombre || ubicacion}`}
                            </span>
                          ))
                        ) : (
                          <span className="inline-block px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full font-medium">Sin ubicación</span>
                        )}
                      </div>
                      <div className="mb-3 rounded-lg overflow-hidden bg-gray-100">
                        <img src={b.imagenUrl} alt={b.titulo} className="w-full h-32 object-cover" />
                      </div>
                      {b.enlace && <p className="text-xs text-gray-600 mb-2 truncate">🔗 {b.enlace}</p>}
                      <p className="text-sm mb-3">{b.activo ? "✅ Activo" : "❌ Inactivo"}</p>
                      <div className="flex gap-2">
                        <button onClick={() => handleBannerSelect(b)} className="flex-1 bg-orange-600 text-white py-2 px-3 rounded-lg font-medium hover:bg-orange-700 transition text-xs md:text-sm">✏️ Editar</button>
                        <button onClick={() => handleBannerDelete(b._id)} className="flex-1 bg-red-500 text-white py-2 px-3 rounded-lg font-medium hover:bg-red-600 transition text-xs md:text-sm">🗑️ Eliminar</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
        </div>
    )}
{activeTab === "promotions" && (
  <div className="space-y-6">
    <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
      <button
        onClick={() => {
          setShowPromotionForm(!showPromotionForm);
          if (!showPromotionForm) {
            setIsEditingPromotion(false);
            setSelectedPromotion(null);
            setPromotionForm({
              titulo: "", descripcion: "", descripcionCompleta: "", precio: "", precioAnterior: "",
              imagenUrl: "", imagenesAdicionales: "", tipoEtiqueta: "Oferta",
              stock: "Disponible", activo: true, orden: 0,
              whatsappLink: "", caracteristicas: "", metaTitulo: "", metaDescripcion: "", metaImagen: ""
            });
          }
        }}
        className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2 ${
          showPromotionForm 
            ? "bg-gray-200 text-gray-700 hover:bg-gray-300" 
            : "bg-gradient-to-r from-pink-600 to-pink-700 text-white hover:from-pink-700 hover:to-pink-800 shadow-lg"
        }`}
      >
        {showPromotionForm ? "✖️ Cerrar Formulario" : "➕ Agregar Nueva Promoción"}
      </button>
    </div>

    {showPromotionForm && (
            <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 md:mb-6">
                {isEditingPromotion ? "✏️ Editar Promoción" : "➕ Agregar Promoción"}
              </h2>
              <form onSubmit={handlePromotionSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Título *</label>
                    <input
                      name="titulo"
                      value={promotionForm.titulo}
                      onChange={handlePromotionChange}
                      placeholder="Ej: Combo de Cocina"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Etiqueta</label>
                    <select
                      name="tipoEtiqueta"
                      value={promotionForm.tipoEtiqueta}
                      onChange={handlePromotionChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none bg-white"
                    >
                      <option value="Combo">🔴 Combo</option>
                      <option value="2x1">🟠 2x1</option>
                      <option value="Descuento">🟣 Descuento</option>
                      <option value="Oferta">🔴 Oferta</option>
                      <option value="Nuevo">🔵 Nuevo</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Precio Actual (S/) *</label>
                    <input
                      name="precio"
                      type="number"
                      step="0.01"
                      value={promotionForm.precio}
                      onChange={handlePromotionChange}
                      placeholder="19.99"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Precio Anterior (S/)</label>
                    <input
                      name="precioAnterior"
                      type="number"
                      step="0.01"
                      value={promotionForm.precioAnterior}
                      onChange={handlePromotionChange}
                      placeholder="29.99 (opcional)"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Stock</label>
                    <select
                      name="stock"
                      value={promotionForm.stock}
                      onChange={handlePromotionChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none bg-white"
                    >
                      <option value="Disponible">✅ Disponible</option>
                      <option value="Limitado">⚠️ Limitado</option>
                      <option value="Agotado">❌ Agotado</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">URL Imagen Principal *</label>
                  <input
                    name="imagenUrl"
                    value={promotionForm.imagenUrl}
                    onChange={handlePromotionChange}
                    placeholder="https://..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Imágenes Adicionales (una URL por línea)</label>
                  <textarea
                    name="imagenesAdicionales"
                    value={promotionForm.imagenesAdicionales}
                    onChange={handlePromotionChange}
                    placeholder="https://imagen2.jpg
                                https://imagen3.jpg"
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descripción Corta</label>
                  <textarea
                    name="descripcion"
                    value={promotionForm.descripcion}
                    onChange={handlePromotionChange}
                    placeholder="Descripción breve para la tarjeta..."
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descripción Completa</label>
                  <textarea
                    name="descripcionCompleta"
                    value={promotionForm.descripcionCompleta}
                    onChange={handlePromotionChange}
                    placeholder="Descripción detallada para la página individual..."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Lo que Incluye (una característica por línea)</label>
                  <textarea
                    name="caracteristicas"
                    value={promotionForm.caracteristicas}
                    onChange={handlePromotionChange}
                    placeholder="Lámpara parlante Miniparlante hongo Set de cubiertos"
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Link de WhatsApp</label>
                  <input
                    name="whatsappLink"
                    value={promotionForm.whatsappLink}
                    onChange={handlePromotionChange}
                    placeholder="https://wa.me/51..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Orden (para organizar)</label>
                  <input
                    name="orden"
                    type="number"
                    value={promotionForm.orden}
                    onChange={handlePromotionChange}
                    placeholder="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                  />
                </div>

                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="activo"
                    checked={promotionForm.activo}
                    onChange={handlePromotionChange}
                    className="w-5 h-5 text-pink-600 border-gray-300 rounded focus:ring-2 focus:ring-pink-500"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-700">Promoción activa</span>
                </label>

                <div className="flex flex-col md:flex-row gap-3 pt-2">
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-pink-600 to-pink-700 text-white py-3 px-6 rounded-lg font-semibold hover:from-pink-700 hover:to-pink-800 transition shadow-md text-sm md:text-base"
                  >
                    {isEditingPromotion ? "💾 Guardar Cambios" : "➕ Agregar Promoción"}
                  </button>
                  {isEditingPromotion && (
                    <button
                      type="button"
                      onClick={handlePromotionCancel}
                      className="w-full md:w-auto px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition text-sm md:text-base"
                    >
                      ❌ Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>
    )}

            <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-6">✨ Lista ({promotions.length})</h2>
              {promotions.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-lg md:text-xl">No hay promociones</p>
                  <p className="mt-2 text-sm">¡Crea tu primera promoción! 👆</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {promotions.map((promo) => (
                    <div
                      key={promo._id}
                      className="border border-gray-200 rounded-xl p-4 hover:shadow-lg transition bg-gradient-to-br from-white to-pink-50"
                    >
                      {promo.imagenUrl && (
                        <div className="mb-3 rounded-lg overflow-hidden bg-gray-100 h-32 md:h-40 flex items-center justify-center relative">
                          <img src={promo.imagenUrl} alt={promo.titulo} className="max-h-full max-w-full object-contain" />
                          <div className="absolute top-2 right-2 bg-gradient-to-r from-red-500 to-red-600 text-white px-2 py-1 rounded-full text-xs font-bold">
                            {promo.tipoEtiqueta}
                          </div>
                        </div>
                      )}
                      <h3 className="font-bold text-base md:text-lg text-gray-800 mb-2 line-clamp-2">{promo.titulo}</h3>
                      <div className="flex items-center gap-2 mb-2">
                        {promo.precioAnterior && (
                          <span className="text-gray-400 line-through text-sm">S/ {promo.precioAnterior.toFixed(2)}</span>
                        )}
                        <span className="text-pink-600 font-bold text-xl">S/ {promo.precio.toFixed(2)}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="px-2 py-1 bg-pink-100 text-pink-700 text-xs rounded-full font-medium">
                          {getEtiquetaLabel(promo.tipoEtiqueta)}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          promo.stock === "Disponible" ? "bg-green-100 text-green-700" :
                          promo.stock === "Limitado" ? "bg-yellow-100 text-yellow-700" :
                          "bg-red-100 text-red-700"
                        }`}>
                          {promo.stock}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          promo.activo ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
                        }`}>
                          {promo.activo ? "Activa" : "Inactiva"}
                        </span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                          Orden: {promo.orden}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePromotionSelect(promo)}
                          className="flex-1 bg-pink-600 text-white py-2 px-3 rounded-lg font-medium hover:bg-pink-700 transition text-xs md:text-sm"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => handlePromotionDelete(promo._id)}
                          className="flex-1 bg-red-500 text-white py-2 px-3 rounded-lg font-medium hover:bg-red-600 transition text-xs md:text-sm"
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
        </div>
        )}
    </div>
    </div>
  );
}