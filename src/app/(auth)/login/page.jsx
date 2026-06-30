import LoginPanel from "./components/login_pannel";
import HeroSection from "./components/hero_section";
import LoginFooter from "./components/login_footer";


export const metadata = {
  title: {
    default: "Authentication",
    template: "%s | SHARO",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthLayout({ children }) {
  const neoShadow =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

  return (
    <main className="min-h-screen bg-[#eef2f7]">
      <div className="max-w-7xl mx-auto min-h-screen px-6 py-10">

        <div className="grid lg:grid-cols-[1.15fr_480px] gap-16 items-center min-h-[calc(100vh-80px)]">

          {/* LEFT */}
          <section className="flex flex-col justify-between h-full">

            <HeroSection />

            <LoginFooter />

          </section>

          {/* RIGHT */}
          <section className="flex justify-center lg:justify-end">

            <div
              className={`
                w-full
                max-w-[460px]
                bg-[#f5f5f5]
                rounded-[36px]
                p-8
                ${neoShadow}
              `}
            >
              <LoginPanel />
            </div>

          </section>

        </div>

      </div>
    </main>
  );
}