import Navbar from "@/components/landing_page/Navbar";
import Footer from "@/components/landing_page/Footer";

export default function MarketingLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#eef2f7] text-[#071330] flex flex-col">
      <Navbar />

      <div className="flex-1">
        {children}
      </div>

      <Footer />
    </div>
  );
}