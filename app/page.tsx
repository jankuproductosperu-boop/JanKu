import Header from "@/Components/Header/Header";
import HomeProducts from "@/Components/HomeProducts/HomeProducts";
import BenefitsSection from "@/Components/BenefitsSection/BenefitsSection";
import InfoSection from "@/Components/InfoSection/Infosection";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Inicio",
  description:
    "Compra fácil y seguro en Janku. Todo lo que buscas, en un solo lugar.",
};

export default function Home() {
  return (
    <main className="w-full">
                <Header />
                <HomeProducts />
                <InfoSection />
                <BenefitsSection />
    </main>
  );
}
