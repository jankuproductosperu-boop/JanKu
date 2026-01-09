"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ShoppingCart, Heart, ChevronDown, Facebook, Instagram, Twitter, Youtube, Music2, Truck, Plane, BadgePercent, User, Menu, X } from "lucide-react";
import { fetchWithCache } from "@/lib/cache";
import { useFavorites } from "@/context/FavoritesContext";

type Category = {
  _id: string;
  nombre: string;
  slug: string;
  activo: boolean;
  orden: number;
};

export default function Navbar() {
  const router = useRouter();
  const [openMobile, setOpenMobile] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { favoritesCount } = useFavorites();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("🔍 Búsqueda activada:", searchQuery);
    if (searchQuery.trim()) {
      router.push(`/busqueda?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  useEffect(() => {
    const loadCategories = async () => {
      try {
        console.log("📡 Cargando categorías...");
        
        // ✅ Usar caché para categorías
        const data = await fetchWithCache<Category[]>("/api/categories");
        
        console.log("📦 Categorías recibidas:", data);
        
        const activeCategories = (Array.isArray(data) ? data : [])
          .filter((c: Category) => c.activo)
          .sort((a: Category, b: Category) => a.orden - b.orden);
        
        console.log("✅ Categorías activas:", activeCategories);
        setCategories(activeCategories);
      } catch (err) {
        console.error("💥 Error cargando categorías:", err);
        setCategories([]);
      }
    };

    loadCategories();
  }, []);

  return (
    <header className="w-full text-white font-sans">
      {/* Top Bar */}
      <div className="w-full bg-[#241B57] flex justify-around items-center py-2 text-sm text-white">
        <div className="flex items-center gap-2">
          <Truck className="w-6 h-6" />
          <div className="leading-tight hidden sm:block">
            <p className="font-semibold">Delivery Gratis</p>
            <p className="text-xs">Entrega a domicilio</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Plane className="w-6 h-6" />
          <div className="leading-tight hidden sm:block">
            <p className="font-semibold">Envios a todo el país</p>
            <p className="text-xs">Todos los dias</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <BadgePercent className="w-6 h-6" />
          <div className="leading-tight hidden sm:block">
            <p className="font-semibold">Ofertas únicas</p>
            <p className="text-xs">Solo aquí</p>
          </div>
        </div>
      </div>

      <div className="flex justify-center w-full bg-[#2C2C6C]">
        <div className="w-full py-3 px-6 flex items-center justify-between max-w-[70%] max-w-[1000px]">
          <Link href="/" className="flex items-center gap-2">
            <img src="https://img.jan-ku.com/general/janku-logo-oficial.png" alt="JAN-KU Logo" className="w-10"/>
            <div className="hidden md:flex flex-col items-center h-8"> 
              <span className="text-2xl font-bold leading-none">JANKU</span>
              <span className="text-xs font-medium uppercase leading-none">PRODUCTOS</span>
            </div>
          </Link>
          
          <form onSubmit={handleSearch} className="flex items-center w-[68%] sm:w-[55%] md:w-[55%] bg-white rounded-full px-4 py-2 text-black">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Encuentra lo que buscas..."
              className="w-full outline-none text-sm"
            />
            <button type="submit" className="cursor-pointer">
              <Search className="w-5 h-5 text-gray-600 hover:text-gray-800" />
            </button>
          </form>
          
          <div className="flex items-center gap-4 text-white text-lg">
            <div className="max-[480px]:hidden flex items-center gap-4">
              <a href="URL_DE_TU_FACEBOOK" target="_blank" rel="noopener noreferrer">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="URL_DE_TU_INSTAGRAM" target="_blank" rel="noopener noreferrer">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="URL_DE_TU_TWITTER" target="_blank" rel="noopener noreferrer">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="URL_DE_TU_YOUTUBE" target="_blank" rel="noopener noreferrer">
                <Youtube className="w-5 h-5" />
              </a>
              <a href="URL_DE_TU_MUSICA" target="_blank" rel="noopener noreferrer">
                <Music2 className="w-5 h-5" />
              </a>
            </div>
            <Link href="/favoritos" className="relative cursor-pointer">
              <Heart className="w-6 h-6" />
              {favoritesCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {favoritesCount}
                </span>
              )}
            </Link>
            <a href="/carrito" className="cursor-pointer">
              <ShoppingCart className="w-6 h-6" />
            </a>
          </div>
        </div>
      </div>
      
      <div className="relative w-full bg-[#2C2C6C] flex justify-center ">
        <div className="w-full px-6 py-2 flex items-center justify-between text-sm max-w-[1000px] border-t border-white">
          <button className="md:hidden text-white text-2xl z-50" onClick={() => setOpenMobile(!openMobile)}>
            {openMobile ? <X /> : <Menu />}
          </button>
          
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="flex items-center gap-1 hover:text-gray-300 transition duration-150">
              Inicio
            </Link>
            <div className="relative group">
              <button className="flex items-center gap-1 hover:text-gray-300 transition">
                Categorías <ChevronDown className="w-4 h-4" />
              </button>
              <div className="absolute hidden group-hover:block bg-[#2C2C6C]/95 border border-white/30 px-0 py-1 rounded-md w-64 top-full left-0 z-20 shadow-2xl shadow-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-base">
                <div className="flex flex-col">
                  {categories.length === 0 ? (
                    <div className="py-2 px-4 text-gray-400 text-sm">No hay categorías</div>
                  ) : (
                    categories.map((category) => (
                      <Link 
                        key={category._id}
                        href={`/${category.slug}`} 
                        className="py-2 px-4 hover:text-white hover:bg-[#3C3C7C] transform hover:scale-[1.03] transition-all duration-150 ease-in-out border-b border-white/10"
                      >
                        {category.nombre}
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>
            <a href="/promociones" className="flex items-center gap-1 hover:text-gray-300 transition duration-150">
              Promociones
            </a>
            <a href="/contacto" className="flex items-center gap-1 hover:text-gray-300 transition duration-150">
              Contáctanos
            </a>
            <a href="/nosotros" className="flex items-center gap-1 hover:text-gray-300 transition duration-150">
              Nosotros
            </a>
          </nav>
          
          <div className="ml-auto flex items-center text-white text-sm">
            <a href="/login-opciones.php" className="flex items-center gap-2 bg-[#252565] py-2 px-3 rounded-md hover:bg-[#1E1E4F] transition duration-150 md:hidden">
              <User className="w-5 h-5" /> 
              <span>Identifícate</span>
            </a>
            <div className="hidden md:flex items-center">
              <a href="/registro.php" className="flex items-center gap-2 border-r border-white/40 pr-4 mr-4 hover:text-gray-300 transition duration-150">
                <User className="w-5 h-5" /> 
                <span>Regístrate</span>
              </a>
              <a href="/iniciar-sesion.php" className="hover:text-gray-300 transition duration-150">
                <span>Iniciar sesión</span>
              </a>
            </div>
          </div>
          
          {openMobile && (
            <div className="absolute top-0 left-0 w-full h-screen bg-[#1d1d4d]/95 backdrop-blur-md z-40 flex flex-col gap-3 px-8 py-24 text-lg border-t border-white">
              <Link href="/" onClick={() => setOpenMobile(false)} className="flex justify-between items-center border-b border-white/20 py-3">
                Inicio <ChevronDown className="rotate-[-90deg]" />
              </Link>
              <details className="border-b border-white/20 py-3">
                <summary className="cursor-pointer flex justify-between items-center">
                  Categorías <ChevronDown />
                </summary>
                <div className="flex flex-col mt-2 gap-2 pl-2">
                  {categories.length === 0 ? (
                    <div className="text-gray-400 text-sm py-1">No hay categorías</div>
                  ) : (
                    categories.map((category) => (
                      <Link 
                        key={category._id}
                        href={`/${category.slug}`} 
                        className="flex justify-between items-center py-1 border-b border-white/10" 
                        onClick={() => setOpenMobile(false)}
                      >
                        {category.nombre} <ChevronDown className="rotate-[-90deg]" />
                      </Link>
                    ))
                  )}
                </div>
              </details>
              <Link href="/promociones" className="flex justify-between items-center py-3 border-b border-white/20" onClick={() => setOpenMobile(false)}>
                Promociones <ChevronDown className="rotate-[-90deg]" />
              </Link>
              <Link href="/contacto" className="flex justify-between items-center py-3 border-b border-white/20" onClick={() => setOpenMobile(false)}>
                Contáctanos <ChevronDown className="rotate-[-90deg]" />
              </Link>
              <Link href="/nosotros" className="flex justify-between items-center py-3 border-b border-white/20" onClick={() => setOpenMobile(false)}>
                Sobre Nosotros <ChevronDown className="rotate-[-90deg]" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}