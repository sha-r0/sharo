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
      <div
        className="
          mx-auto
          flex
          min-h-screen
          w-full
          max-w-7xl
          items-center
          justify-center
          px-4
          py-6
          sm:px-6
          sm:py-8
          lg:py-10
        "
      >
        <div
          className="
            grid
            w-full
            grid-cols-1
            items-center
            gap-8
            lg:min-h-[calc(100vh-80px)]
            lg:grid-cols-[1.15fr_480px]
            lg:gap-16
          "
        >
          {/* LEFT - hidden on mobile and tablet */}
          <section className="hidden h-full flex-col justify-between lg:flex">
            <HeroSection />
            <LoginFooter />
          </section>

          {/* RIGHT */}
          <section className="flex w-full justify-center lg:justify-end">
            <div
              className={`
                w-full
                max-w-[460px]
                rounded-[24px]
                bg-[#f5f5f5]
                p-5
                sm:rounded-[30px]
                sm:p-6
                md:p-8
                lg:rounded-[36px]
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