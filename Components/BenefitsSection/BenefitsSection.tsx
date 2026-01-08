'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, TrendingUp, Users } from 'lucide-react';

export default function IntroJanKuSection({ marca = 'JanKu' }) {
  return (
    <section className="bg-white py-24 px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-14 items-center">

        {/* Texto */}
        <div>
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="inline-block text-yellow-500 font-semibold mb-4"
          >
            Comercio online peruano
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight"
          >
            Compras inteligentes con la
            <br />
            confianza de <span className="text-yellow-500">{marca}</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-gray-600 text-lg mb-10 max-w-xl"
          >
            En {marca} conectamos tecnología, cercanía y productos confiables
            para que tu experiencia de compra online sea clara, segura y
            eficiente desde el primer clic.
          </motion.p>

          {/* Beneficios sin cards */}
          <ul className="space-y-4">
            {[
              { Icon: ShieldCheck, text: 'Pagos y procesos 100% seguros' },
              { Icon: TrendingUp, text: 'Precios justos y productos verificados' },
              { Icon: Users, text: 'Atención humana y personalizada' },
            ].map((item, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 * i }}
                className="flex items-center gap-4 text-gray-700"
              >
                <item.Icon className="w-6 h-6 text-yellow-500 flex-shrink-0" />
                <span>{item.text}</span>
              </motion.li>
            ))}
          </ul>
        </div>

        {/* Visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          <div className="absolute -top-10 -left-10 w-48 h-48 bg-yellow-400/20 rounded-full blur-3xl" />
          <div className="relative h-80 rounded-3xl bg-gray-100 shadow-xl flex items-center justify-center text-gray-400">
            Imagen / Mockup
          </div>
        </motion.div>

      </div>
    </section>
  );
}

