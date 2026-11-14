"use client";
import { useState, useEffect } from "react";
import { Package, FolderTree, Sparkles, AlertCircle, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { ProductAdmin, Category, Promotion } from "@/types";
import ProductosTab from "@/app/(admin)/admin/_components/ProductosTab";
import CategoriasTab from "@/app/(admin)/admin/_components/CategoriasTab";
import BannersTab, { type BannerConPosicion } from "@/app/(admin)/admin/_components/BannersTab";
import PromocionesTab from "@/app/(admin)/admin/_components/PromocionesTab";

export default function AdminPage() {
  const { isAuthenticated, isChecking } = useAuth();

  const [activeTab, setActiveTab] = useState<"products" | "banners" | "categories" | "promotions">("products");
  const [products, setProducts] = useState<ProductAdmin[]>([]);
  const [banners, setBanners] = useState<BannerConPosicion[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  // ─── LOADERS ────────────────────────────────────────────────────────────────

  const loadProducts = async () => {
    try { const res = await fetch("/api/admin/products"); const d = await res.json(); setProducts(Array.isArray(d) ? d : []); }
    catch { setProducts([]); }
  };
  const loadBanners = async () => {
    try { const res = await fetch("/api/admin/banners"); const d = await res.json(); setBanners(Array.isArray(d) ? d : []); }
    catch { setBanners([]); }
  };
  const loadCategories = async () => {
    try { const res = await fetch("/api/categories"); const d = await res.json(); setCategories(Array.isArray(d) ? d : []); }
    catch { setCategories([]); }
  };
  const loadPromotions = async () => {
    try { const res = await fetch("/api/admin/promotions"); const d = await res.json(); setPromotions(Array.isArray(d) ? d : []); }
    catch { setPromotions([]); }
  };
    useEffect(() => {
    const cargarTodo = async () => {
      await Promise.all([
        loadProducts(),
        loadBanners(),
        loadCategories(),
        loadPromotions(),
      ]);
    };
    cargarTodo();
  }, []);
  // ─── STATS ──────────────────────────────────────────────────────────────────

  const stats = [
    { title: "Productos", value: products.length, icon: Package, color: "bg-blue-500", details: `${products.filter(p => p.mostrarEnHome).length} en home`, link: "products" },
    { title: "Categorías", value: categories.filter(c => c.activo).length, icon: FolderTree, color: "bg-purple-500", details: `${categories.length} total`, link: "categories" },
    { title: "Banners", value: banners.filter(b => b.activo).length, icon: Sparkles, color: "bg-orange-500", details: `${banners.length} total`, link: "banners" },
    { title: "Promociones", value: promotions.filter(p => p.activo).length, icon: Sparkles, color: "bg-pink-500", details: `${promotions.length} total`, link: "promotions" },
  ];
  const stockStats = {
    disponible: products.filter(p => p.stock === "Disponible").length,
    limitado: products.filter(p => p.stock === "Limitado").length,
    agotado: products.filter(p => p.stock === "Agotado").length,
  };

  // ─── AUTH GUARDS ─────────────────────────────────────────────────────────────

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
  if (!isAuthenticated) return null;

  // ─── RENDER ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-orange-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-gray-800">Panel Administrativo</h1>
            <p className="text-gray-600 text-sm md:text-base mt-1">Gestiona productos, banners y categorías</p>
          </div>
        </div>

        <div className="space-y-6 mb-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <button key={i} onClick={() => setActiveTab(stat.link as "products" | "banners" | "categories" | "promotions")} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 text-left">
                <div className="flex items-start justify-between mb-4">
                  <div className={`${stat.color} p-3 rounded-xl text-white`}><stat.icon className="w-6 h-6" /></div>
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <h3 className="text-gray-600 text-sm font-medium mb-1">{stat.title}</h3>
                <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.details}</p>
              </button>
            ))}
          </div>

          {/* Stock + Resumen */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-4"><AlertCircle className="w-5 h-5 text-indigo-600" /><h3 className="text-lg font-bold text-gray-800">Estado de Stock</h3></div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg"><div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-full"></div><span className="text-sm font-medium text-gray-700">Disponible</span></div><span className="text-lg font-bold text-green-600">{stockStats.disponible}</span></div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg"><div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-500 rounded-full"></div><span className="text-sm font-medium text-gray-700">Limitado</span></div><span className="text-lg font-bold text-yellow-600">{stockStats.limitado}</span></div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg"><div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-full"></div><span className="text-sm font-medium text-gray-700">Agotado</span></div><span className="text-lg font-bold text-red-600">{stockStats.agotado}</span></div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
              <h3 className="text-lg font-bold mb-4">📊 Resumen Rápido</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-white/20"><span className="text-sm opacity-90">Total productos</span><span className="text-2xl font-bold">{products.length}</span></div>
                <div className="flex items-center justify-between pb-3 border-b border-white/20"><span className="text-sm opacity-90">Categorías activas</span><span className="text-2xl font-bold">{categories.filter(c => c.activo).length}</span></div>
                <div className="flex items-center justify-between pb-3 border-b border-white/20"><span className="text-sm opacity-90">Banners activos</span><span className="text-2xl font-bold">{banners.filter(b => b.activo).length}</span></div>
                <div className="flex items-center justify-between"><span className="text-sm opacity-90">Promociones activas</span><span className="text-2xl font-bold">{promotions.filter(p => p.activo).length}</span></div>
              </div>
            </div>
          </div>

          {stockStats.limitado > 0 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-4"><div className="flex items-start gap-3"><AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" /><div><h4 className="font-bold text-yellow-800 mb-1">⚠️ Atención requerida</h4><p className="text-sm text-yellow-700">Tienes <strong>{stockStats.limitado}</strong> producto{stockStats.limitado !== 1 ? "s" : ""} con stock limitado. Considera reabastecer pronto.</p></div></div></div>
          )}
          {stockStats.agotado > 0 && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4"><div className="flex items-start gap-3"><AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" /><div><h4 className="font-bold text-red-800 mb-1">❌ Productos agotados</h4><p className="text-sm text-red-700">Tienes <strong>{stockStats.agotado}</strong> producto{stockStats.agotado !== 1 ? "s" : ""} agotado{stockStats.agotado !== 1 ? "s" : ""}. Los clientes no podrán comprarlos hasta que actualices el stock.</p></div></div></div>
          )}
        </div>

        {/* ── Tabs ── */}
        <div className="bg-white rounded-2xl shadow-lg p-2 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {[
              { key: "products", label: "📦 Productos", grad: "from-indigo-600 to-indigo-700" },
              { key: "banners", label: "🎨 Banners", grad: "from-orange-500 to-orange-600" },
              { key: "categories", label: "📂 Categorías", grad: "from-purple-600 to-purple-700" },
              { key: "promotions", label: "✨ Promociones", grad: "from-pink-600 to-pink-700" },
            ].map(({ key, label, grad }) => (
              <button key={key} onClick={() => setActiveTab(key as "products" | "banners" | "categories" | "promotions")}
                className={`flex-shrink-0 py-2 md:py-3 px-4 md:px-6 rounded-xl font-semibold transition text-sm md:text-base whitespace-nowrap ${activeTab === key ? `bg-gradient-to-r ${grad} text-white shadow-md` : "text-gray-600 hover:bg-gray-100"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "products" && <ProductosTab products={products} categories={categories} onReload={loadProducts} />}
        {activeTab === "categories" && <CategoriasTab categories={categories} onReload={loadCategories} />}
        {activeTab === "banners" && <BannersTab banners={banners} categories={categories} onReload={loadBanners} />}
        {activeTab === "promotions" && <PromocionesTab promotions={promotions} onReload={loadPromotions} />}

      </div>
    </div>
  );
}
