// Fase 27 (D-91): esqueletos de carga. Next.js los muestra al instante al tocar un enlace mientras llega
// la página real (archivos loading.tsx). Imitan su forma con bloques grises que laten; no piden datos ni
// llevan código de cliente (salvo EsqueletoTienda, que solo elige cuál mostrar). La página ya cargada no
// cambia (N1-1).

import type { ReactNode } from "react";

function Bloque({ className = "" }: { className?: string }) {
  return <div className={`bg-gray-200 rounded-md animate-pulse ${className}`} />;
}

/** Envoltura accesible: un lector de pantalla oye «Cargando…» una sola vez. */
function Cargando({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">Cargando…</span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

/** Tarjeta de producto: imagen cuadrada, dos líneas de nombre y precio (como ProductCard). */
function TarjetaProducto() {
  return (
    <div>
      <Bloque className="w-full aspect-square" />
      <Bloque className="h-3 md:h-4 w-11/12 mt-2" />
      <Bloque className="h-3 md:h-4 w-2/3 mt-1" />
      <Bloque className="h-5 md:h-6 w-1/3 mt-2" />
    </div>
  );
}

function Cuadricula({ cantidad, columnas }: { cantidad: number; columnas: string }) {
  return (
    <div className={`grid ${columnas} gap-2 md:gap-4 mb-4 md:mb-6`}>
      {Array.from({ length: cantidad }, (_, i) => (
        <TarjetaProducto key={i} />
      ))}
    </div>
  );
}

/** Inicio: encabezado con carrusel y categorías, dos banners y la cuadrícula de productos. */
export function EsqueletoInicio() {
  return (
    <Cargando className="w-full">
      <section className="w-full bg-gradient-to-b from-[#2C2C6C] via-[#241B57]/90 to-white py-10">
        <div className="w-[90%] max-w-[1000px] mx-auto">
          <div className="w-full aspect-[16/4] sm:aspect-[16/5] md:aspect-[16/4] rounded-md bg-white/15 animate-pulse" />
          <div className="h-6 md:h-7 w-64 max-w-[80%] mx-auto mt-6 rounded-md bg-white/20 animate-pulse" />
          <div className="flex gap-6 overflow-hidden py-2 px-2 mt-8">
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className="min-w-[140px] sm:min-w-[170px] md:min-w-[180px] h-[150px] sm:h-[170px] bg-white shadow-md rounded-xl p-3 sm:p-4 flex flex-col items-center"
              >
                <Bloque className="w-12 h-12 md:w-16 md:h-16 rounded-full" />
                <Bloque className="h-4 w-20 mt-3" />
                <Bloque className="h-3 w-24 mt-2" />
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="w-full max-w-[1000px] mx-auto pb-10 px-2 md:px-4">
        <div className="grid grid-cols-2 gap-2 md:gap-4 mb-4 md:mb-6">
          <Bloque className="w-full aspect-[16/9]" />
          <Bloque className="w-full aspect-[16/9]" />
        </div>
        <Cuadricula cantidad={8} columnas="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" />
      </section>
    </Cargando>
  );
}

/** Categoría: título, descripción, barra de filtros y cuadrícula de 4 columnas. */
export function EsqueletoCategoria() {
  return (
    <Cargando className="w-full max-w-[1000px] mx-auto pb-10 px-2 md:px-4 pt-4 md:pt-6">
      <div className="mb-6">
        <Bloque className="h-8 md:h-9 w-56 mb-3" />
        <Bloque className="h-4 w-full max-w-md mb-4" />
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <Bloque className="h-5 w-44" />
            <div className="flex gap-2 md:gap-3">
              <Bloque className="h-9 flex-1 md:flex-none md:w-40" />
              <Bloque className="h-9 flex-1 md:flex-none md:w-48" />
            </div>
          </div>
        </div>
      </div>
      <Cuadricula cantidad={8} columnas="grid-cols-2 md:grid-cols-4" />
    </Cargando>
  );
}

/** Ficha de producto: ruta, galería con miniaturas y columna de datos con el botón de compra. */
export function EsqueletoProducto() {
  return (
    <Cargando className="w-full max-w-[1000px] mx-auto pb-10 px-4 pt-6">
      <Bloque className="h-4 w-64 max-w-full mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div className="space-y-4">
          <Bloque className="aspect-square w-full rounded-xl" />
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Bloque key={i} className="aspect-square w-full" />
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div>
            <Bloque className="h-8 md:h-10 w-11/12 mb-2" />
            <Bloque className="h-6 w-28 rounded-full" />
          </div>
          <div className="border-t border-b py-4">
            <Bloque className="h-10 w-40" />
          </div>
          <div className="space-y-2">
            <Bloque className="h-4 w-full" />
            <Bloque className="h-4 w-full" />
            <Bloque className="h-4 w-3/4" />
          </div>
          <Bloque className="h-14 w-full rounded-lg" />
          <Bloque className="h-14 w-full rounded-lg" />
        </div>
      </div>
    </Cargando>
  );
}

/** Mis pedidos: título con enlace al perfil y la lista de pedidos. */
export function EsqueletoMisPedidos() {
  return (
    <Cargando className="min-h-screen bg-gradient-to-br from-[#2C2C6C]/5 to-white py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Bloque className="h-8 w-44" />
          <Bloque className="h-4 w-20" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <Bloque className="h-5 w-40" />
                <Bloque className="h-3 w-52 max-w-full" />
              </div>
              <Bloque className="h-5 w-16" />
            </div>
          ))}
        </div>
      </div>
    </Cargando>
  );
}

/** Detalle del pedido: código, aviso de WhatsApp y las dos columnas (productos, entrega y totales). */
export function EsqueletoPedido() {
  return (
    <Cargando className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Bloque className="h-8 md:h-9 w-60" />
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Bloque className="h-8 md:h-9 w-44" />
            <Bloque className="h-8 w-24 rounded-lg" />
          </div>
          <Bloque className="h-4 w-80 max-w-full" />
          <Bloque className="h-12 md:h-14 w-full sm:w-72 rounded-lg" />
        </div>
        <div className="grid md:grid-cols-2 gap-6 items-start">
          <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 space-y-4">
            <Bloque className="h-6 w-32" />
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex gap-3">
                <Bloque className="w-16 h-16 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Bloque className="h-4 w-full" />
                  <Bloque className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 space-y-3">
              <Bloque className="h-6 w-44" />
              <Bloque className="h-4 w-full" />
              <Bloque className="h-4 w-5/6" />
              <Bloque className="h-4 w-2/3" />
            </div>
            <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 space-y-3">
              <Bloque className="h-4 w-full" />
              <Bloque className="h-6 w-1/2" />
            </div>
          </div>
        </div>
      </div>
    </Cargando>
  );
}

/** Resto de la tienda sin esqueleto propio (búsqueda, promoción…): título y cuadrícula. */
export function EsqueletoGenerico() {
  return (
    <Cargando className="w-full max-w-[1000px] mx-auto pb-10 px-2 md:px-4 pt-4 md:pt-6">
      <Bloque className="h-8 md:h-9 w-56 mb-6" />
      <Cuadricula cantidad={8} columnas="grid-cols-2 md:grid-cols-4" />
    </Cargando>
  );
}
