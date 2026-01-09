"use client";

import React, { useRef } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Smartphone,
  Home,
  Gamepad2,
  Brush,
  Glasses, Tag, Box
} from "lucide-react";

export default function CarruselCategorias() {
  const carruselRef = useRef<HTMLDivElement | null>(null);

  const categorias = [
    {
      nombre: "Tecnología",
      descripcion: "Encuentra dispositivos útiles, modernos y al mejor precio",
      iconoGray: <Smartphone className="w-12 h-12 sm:w-15 sm:h-15 md:w-18 md:h-18 text-gray-500" />,
      iconoColor: <Smartphone className="w-12 h-12 sm:w-15 sm:h-15 md:w-18 md:h-18 text-blue-500" />,
      url: "/tecnologia-y-electronica",
    },
    {
      nombre: "Hogar",
      descripcion: "Artículos prácticos para mejorar y organizar tu hogar",
      iconoGray: <Home className="w-12 h-12 sm:w-15 sm:h-15 md:w-18 md:h-18 text-gray-500" />,
      iconoColor: <Home className="w-12 h-12 sm:w-15 sm:h-15 md:w-18 md:h-18 text-green-500" />,
      url: "/hogar",
    },
    {
      nombre: "Juguetes",
      descripcion: "Diversión y creatividad para niños de todas las edades.",
      iconoGray: <Gamepad2 className="w-12 h-12 sm:w-15 sm:h-15 md:w-18 md:h-18 text-gray-500" />,
      iconoColor: <Gamepad2 className="w-12 h-12 sm:w-15 sm:h-15 md:w-18 md:h-18 text-yellow-500" />,
      url: "/jugueteria",
    },
    {
      nombre: "Belleza",
      descripcion: "Artículos esenciales para tu bienestar y rutina diaria.",
      iconoGray: <Brush className="w-12 h-12 sm:w-15 sm:h-15 md:w-18 md:h-18 text-gray-500" />,
      iconoColor: <Brush className="w-12 h-12 sm:w-15 sm:h-15 md:w-18 md:h-18 text-pink-500" />,
      url: "/belleza-y-cuidado-personal",
    },
    {
      nombre: "Accesorios",
      descripcion: "Complementos útiles y modernos para tu día a día.",
      iconoGray: <Glasses className="w-12 h-12 sm:w-15 sm:h-15 md:w-18 md:h-18 text-gray-500" />,
      iconoColor: <Glasses className="w-12 h-12 sm:w-15 sm:h-15 md:w-18 md:h-18 text-purple-500" />,
      url: "/accesorios",
    },
    {
      nombre: "Ofertas",
      descripcion: "Productos en promoción y descuentos especiales.",
      iconoGray: <Tag className="w-12 h-12 sm:w-15 sm:h-15 md:w-18 md:h-18 text-gray-500" />,
      iconoColor: <Tag className="w-12 h-12 sm:w-15 sm:h-15 md:w-18 md:h-18 text-purple-500" />,
      url: "/ofertas",
    },
    {
      nombre: "Otros",
      descripcion: "Complementos útiles y modernos para tu día a día.",
      iconoGray: <Box className="w-12 h-12 sm:w-15 sm:h-15 md:w-18 md:h-18 text-gray-500" />,
      iconoColor: <Box className="w-12 h-12 sm:w-15 sm:h-15 md:w-18 md:h-18 text-purple-500" />,
      url: "/otros",
    },
  ];

  const mover = (dir: "left" | "right") => {
    if (!carruselRef.current) return;
    const width = carruselRef.current.clientWidth;
    carruselRef.current.scrollBy({
      left: dir === "left" ? -width : width,
      behavior: "smooth",
    });
  };

  // Slider automático (promociones)
const promoImages = [
    "https://img.jan-ku.com/general/banner-header-02.webp",
    "https://img.jan-ku.com/general/banner-header-01.webp",
    "https://img.jan-ku.com/general/banner-header-03.webp",
];

const [currentSlide, setCurrentSlide] = React.useState(0);

React.useEffect(() => {
  const interval = setInterval(() => {
    setCurrentSlide((prev) =>
      prev === promoImages.length - 1 ? 0 : prev + 1
    );
  }, 5000); // cambia cada 5 segundos

  return () => clearInterval(interval);
}, []);

  return (
    <section className="w-full bg-gradient-to-b from-[#2C2C6C] via-[#241B57]/90 to-white py-10 select-none">
      {/* CARRUSEL PROMO */}
      <div className="relative w-full flex justify-center">
        <div className="relative w-[90%] max-w-[1000px] aspect-[16/4] sm:aspect-[16/5] md:aspect-[16/4] overflow-hidden">
          <div
            className="absolute inset-0 flex transition-transform duration-700 ease-in-out"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {promoImages.map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`promo-${i}`}
                className="w-full h-full object-contain shrink-0"
              />
            ))}
          </div>
        </div>
      </div>
      <h2 className="text-center text-xl md:text-2xl font-semibold mt-6 text-gray-100 drop-shadow-md">
        Encuentra lo que estás buscando ...
      </h2>
{/* CONTENEDOR PRINCIPAL */}
<div className="relative w-full flex justify-center mt-8">
  {/* NUEVO CONTENEDOR INTERMEDIO: Limita el ancho y es RELATIVE */}
  <div className="relative w-[90%] max-w-[1000px] shrink-0">
    {/* BOTÓN IZQUIERDO — pegado al carrusel */}
    <button
      onClick={() => mover("left")}
      className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-black/40 hover:bg-black/60 text-white p-3 rounded-full backdrop-blur-md transition">
      <ChevronLeft />
    </button>
    {/* CARRUSEL */}
<div
      ref={carruselRef}
      className="flex gap-6 overflow-x-auto scrollbar-hide scroll-smooth py-2 px-2" 
    >
      {categorias.map((cat, index) => (
<Link
  key={index}
  href={cat.url}
  className="min-w-[140px] sm:min-w-[170px] md:min-w-[180px] bg-white shadow-md rounded-xl p-3 sm:p-4 md:p-5 flex flex-col items-center text-center hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 group">
          <div className="mb-3">
            <div className="group-hover:hidden">{cat.iconoGray}</div>
            <div className="hidden group-hover:block">{cat.iconoColor}</div>
          </div>
          <h3 className="font-semibold text-gray-800 text-sm sm:text-base">
            {cat.nombre}
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 mt-1 sm:mt-2">
            {cat.descripcion}
          </p>
        </Link>
      ))}
    </div>
    {/* BOTÓN DERECHO — pegado al carrusel */}
    <button
      onClick={() => mover("right")}
      className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 z-20 bg-black/40 hover:bg-black/60 text-white p-3 rounded-full backdrop-blur-md transition">
      <ChevronRight />
    </button>
  </div> {/* Cierre del Nuevo Contenedor Intermedio */}
</div>
    </section>
  );
}

