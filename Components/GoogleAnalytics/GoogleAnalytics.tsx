// components/GoogleAnalytics.tsx
"use client";

import Script from "next/script";
import { useConsentimientoCookies } from "@/hooks/useConsentimientoCookies";
import { urlSinConsulta } from "@/lib/consentimiento";

// Solo se carga si el visitante aceptó las cookies de medición (D-75).
// page_location va sin consulta ni fragmento: el token del pedido (?t=) nunca sale hacia Google.
export default function GoogleAnalytics() {
  const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
  const { estado } = useConsentimientoCookies();

  if (!GA_ID || estado !== "aceptadas") {
    return null;
  }

  // Este componente solo llega aquí en el navegador (en el servidor `estado` es null).
  const pageLocation = JSON.stringify(urlSinConsulta(window.location.href)).replace(/</g, "\\u003c");
  const pagePath = JSON.stringify(window.location.pathname).replace(/</g, "\\u003c");
  const id = JSON.stringify(GA_ID).replace(/</g, "\\u003c");

  return (
    <>
      <Script
        strategy="lazyOnload"
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`}
      />
      <Script
        id="google-analytics"
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', ${id}, {
              page_path: ${pagePath},
              page_location: ${pageLocation},
            });
          `,
        }}
      />
    </>
  );
}
