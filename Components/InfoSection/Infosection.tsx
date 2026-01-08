'use client';

import { motion } from 'framer-motion';
import { Truck, Handshake, Star } from 'lucide-react';
import Link from 'next/link';

export default function NosotrosSection({
  titulo = 'Sobre',
  marca = 'JanKu',
  badge = 'Envíos desde Perú',
  ctaText = 'Ver productos',
  ctaHref = '/productos',
}) {
  return (
    <section className="bg-gradient-to-b from-[#0b0f2e] to-[#12163a] py-24 px-6 min-h-screen flex items-center">
      <div className="max-w-6xl mx-auto text-center text-white">

        {/* Título */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-5xl font-bold mb-4"
        >
          {titulo} <span className="text-yellow-400">{marca}</span>
        </motion.h2>

        {/* Badge */}
        <motion.span
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 bg-yellow-400 text-[#0b0f2e] font-semibold px-6 py-1 rounded-full mb-6"
        >
          <Truck className="w-4 h-4" />
          {badge}
        </motion.span>

        {/* Descripción */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="max-w-3xl mx-auto text-gray-300 text-lg leading-relaxed mb-12"
        >
          En <strong>{marca}</strong> somos una empresa peruana enfocada en ofrecer
          productos de calidad, precios competitivos y una experiencia de compra
          segura. Nuestro compromiso es llegar a cada rincón del país con un
          servicio confiable y atención personalizada.
        </motion.p>

        {/* CTA como Link */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mb-16"
        >
          <Link
            href={ctaHref}
            className="inline-block bg-yellow-400 text-[#0b0f2e] font-bold px-8 py-4 text-lg rounded-2xl hover:bg-yellow-300 transition"
          >
            {ctaText}
          </Link>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[{
            Icon: Truck,
            title: 'Envíos a todo el Perú',
            desc: 'Llegamos a nivel nacional con entregas rápidas y seguras.',
          },{
            Icon: Handshake,
            title: 'Confianza y respaldo',
            desc: 'Cada compra está respaldada por un equipo comprometido contigo.',
          },{
            Icon: Star,
            title: 'Calidad garantizada',
            desc: 'Seleccionamos cuidadosamente nuestros productos para ti.',
          }].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 * i }}
              className="bg-[#1a1f5a] p-8 rounded-2xl shadow-lg hover:scale-105 transition"
            >
              <div className="flex justify-center mb-4">
                <item.Icon className="w-10 h-10 text-yellow-400" aria-hidden />
              </div>
              <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
              <p className="text-gray-300">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
