export const metadata = {
  title: "Sobre Nosotros | Janku",
  description:
    "Conoce más sobre Janku, nuestra misión y visión como tienda ecommerce.",
};

export default function NosotrosPage() {
  const imagenUrl = "https://img.jan-ku.com/general/nosotros-img.webp"; // ✅ Coloca aquí la URL de tu imagen

  return (
    <div className="min-h-screen bg-[#f5f6fa]">
      <section className="w-full py-28">
        <div className="max-w-7xl mx-auto px-6">

          {/* Encabezado */}
          <div className="max-w-3xl mb-24">
            <span className="inline-block mb-4 text-sm font-semibold tracking-widest text-[#4b4fa3] uppercase">
              Sobre Nosotros
            </span>

            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
              Estamos construyendo una tienda pensada para ti
            </h1>

            <p className="mt-6 text-gray-600 leading-relaxed text-lg">
              Janku es una empresa ecommerce en crecimiento. Estamos dando
              nuestros primeros pasos con una idea clara: ofrecer variedad,
              buenos precios y una experiencia de compra simple y segura.
            </p>
          </div>

          {/* Quiénes somos */}
          <div className="grid md:grid-cols-2 gap-16 items-center mb-32">
            <div>
              <h2 className="text-3xl font-semibold text-gray-900 mb-6">
                ¿Quiénes somos?
              </h2>

              <p className="text-gray-600 mb-4 leading-relaxed">
                Janku nace como un proyecto en etapa inicial, impulsado por
                el deseo de crear una tienda online útil y cercana.
              </p>

              <p className="text-gray-600 mb-4 leading-relaxed">
                Empezamos poco a poco, ampliando nuestro catálogo y mejorando
                constantemente para crecer junto a nuestros clientes.
              </p>

              <p className="text-gray-600 leading-relaxed">
                Nuestro objetivo es que encuentres todo en un solo lugar,
                con una compra sencilla, segura y sin complicaciones.
              </p>
            </div>

            {/* Bloque visual - ✅ Ahora acepta imagen */}
            <div className="relative h-full overflow-hidden">
              {imagenUrl ? (
                <img
                  src={imagenUrl}
                  alt="Janku - Sobre nosotros"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-[#2d2f63] to-[#4b4fa3] flex items-end">
                  <div className="m-6 bg-white/90 backdrop-blur px-5 py-3 rounded-xl shadow">
                    <p className="text-sm font-semibold text-gray-900">
                      Todo en un solo lugar
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Misión & Visión */}
          <div className="grid md:grid-cols-2 gap-12">
            <div className="bg-white rounded-2xl p-10 shadow-sm">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                Nuestra Misión
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Crear una tienda online accesible y confiable, donde las personas
                puedan encontrar productos variados y útiles, ofreciendo una
                experiencia de compra simple, clara y segura desde el inicio.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-10 shadow-sm">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                Nuestra Visión
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Crecer paso a paso hasta convertirnos en una tienda ecommerce
                reconocida por su variedad, honestidad y cercanía con los
                clientes, construyendo confianza a largo plazo.
              </p>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
