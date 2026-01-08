import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "../Components/Navbar/Navbar";
import Footer from "@/Components/Footer/Footer";
import { CartProvider } from "@/context/CartContext";
import CardSidebar from "@/Components/Cart/CartSidebar"
import FloatingCartButton from "@/Components/Cart/FloatingCartButton";
import { FavoritesProvider } from "@/context/FavoritesContext";
import ErrorBoundary from "@/Components/ErrorBoundary/ErrorBoundary";
import GoogleAnalytics from "@/Components/GoogleAnalytics/GoogleAnalytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Janku | Tu tienda online",
    template: "%s | Janku",
  },
  description:
    "Janku es una tienda ecommerce moderna donde encuentras tecnología, hogar, accesorios y más al mejor precio.",
  keywords: [
    "ecommerce",
    "tienda online",
    "janku",
    "tecnología",
    "hogar",
    "compras online",
  ],
  authors: [{ name: "Janku" }],
  creator: "Janku",
  metadataBase: new URL("https://jan-ku.com"),

  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },

  openGraph: {
    title: "Janku | Tu tienda online",
    description:
      "Compra productos de calidad en Janku. Envíos rápidos y precios competitivos.",
    url: "https://jan-ku.com",
    siteName: "Janku",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Janku Ecommerce",
      },
    ],
    locale: "es_ES",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Janku | Tu tienda online",
    description:
      "Encuentra los mejores productos en Janku. Compra fácil y seguro.",
    images: ["/og-image.png"],
  },

  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <GoogleAnalytics />
        <ErrorBoundary>
        <CartProvider>
          <FavoritesProvider> 
            <Navbar /> 
            {children}
          </FavoritesProvider>
          <FloatingCartButton />
          <CardSidebar />
        </CartProvider>
        <Footer />
        </ErrorBoundary>
      </body>
    </html>
  );
}
