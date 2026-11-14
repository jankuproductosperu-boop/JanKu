import Navbar from "@/Components/Navbar/Navbar";
import Footer from "@/Components/Footer/Footer";
import CartSidebar from "@/Components/Cart/CartSidebar";
import FloatingCartButton from "@/Components/Cart/FloatingCartButton";
import FloatingWhatsApp from "@/Components/FloatingWhatsApp/FloatingWhatsApp";
import OfferPopup from "@/Components/OfferPopup/OfferPopup";

export default function TiendaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <div className="pt-[150px]">{children}</div>
      <FloatingWhatsApp />
      <FloatingCartButton />
      <CartSidebar />
      <OfferPopup />
      <Footer />
    </>
  );
}
