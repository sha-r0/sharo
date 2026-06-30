import {
    Users,
    FolderKanban,
    ShieldCheck,
    Building2,
    Cog,
    Briefcase,
    Factory,
    ShoppingCart,
    PieChart,
    Clock3,
  } from "lucide-react";
  
  export default function TrustedSection() {
    const stats = [
      {
        icon: <Users className="w-8 h-8 text-blue-500" />,
        value: "500+",
        label: "Employees Managed",
      },
      {
        icon: <FolderKanban className="w-8 h-8 text-green-500" />,
        value: "50+",
        label: "Projects Running",
      },
      {
        icon: <ShieldCheck className="w-8 h-8 text-violet-500" />,
        value: "99.9%",
        label: "System Uptime",
      },
      {
        icon: <Clock3 className="w-8 h-8 text-orange-500" />,
        value: "24/7",
        label: "Support Available",
      }
    ];
  
    const industries = [
      {
        icon: <Building2 className="w-8 h-8 text-blue-500" />,
        name: "Construction",
      },
      {
        icon: <Cog className="w-8 h-8 text-blue-500" />,
        name: "Engineering",
      },
      {
        icon: <Briefcase className="w-8 h-8 text-blue-500" />,
        name: "Consulting",
      },
      {
        icon: <Factory className="w-8 h-8 text-blue-500" />,
        name: "Manufacturing",
      },
      {
        icon: <ShoppingCart className="w-8 h-8 text-blue-500" />,
        name: "Retail",
      },
      {
        icon: <PieChart className="w-8 h-8 text-blue-500" />,
        name: "Operations",
      },
    ];
  
    const neoShadow =
      "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";
  
    return (
      <section id="solutions" className="relative py-10 overflow-hidden scroll-mt-22">
  
        {/* Background Blobs */}
        <div className="absolute left-10 top-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-blue-200/40 blur-xl" />
  
        <div className="absolute right-10 top-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-blue-300/40 blur-xl" />
  
        <div className="">
  
          {/* Main Container */}
          <div
            className={`
            relative
            rounded-[40px]
            px-8 md:px-20
            py-20
          `}
          >
            {/* Badge */}
            <div className="flex justify-center">
              <div
                className={`
                px-4 py-2
                rounded-full
                bg-[#f5f5f5]
                text-blue-600
                font-medium
                tracking-wide
                text-[14px]
                inline-flex items-center gap-3
                ${neoShadow}
              `}
              >
                <ShieldCheck className="w-4 h-4 fill-current" />
                TRUSTED BY GROWING TEAMS
              </div>
            </div>
  
            {/* Heading */}
            <div className="max-w-4xl mx-auto text-center mt-10">
              <h2 className="text-3xl md:text-5xl font-bold text-slate-900 leading-tight">
                Trusted by teams building
                <br />
                the future
              </h2>
  
              <p className="mt-8 text-lg text-slate-500 leading-relaxed">
                Companies manage employees, projects,
                payroll and operations more efficiently
                with SHARO.
              </p>
            </div>
  
            {/* Stats */}
            <div className="grid md:grid-cols-4 gap-8 mt-16">
  
              {stats.map((item, index) => (
                <div
                  key={index}
                  className={`
                  bg-[#f5f5f5]
                  rounded-[24px]
                  p-6
                  text-center
                  ${neoShadow}
                `}
                >
                  <div className="flex justify-center mb-6">
                    <div
                      className={`
                      h-14 w-14
                      rounded-full
                      bg-[#f5f5f5]
                      flex items-center justify-center
                      ${neoShadow}
                    `}
                    >
                      {item.icon}
                    </div>
                  </div>
  
                  <h3 className="text-4xl font-bold text-slate-900">
                    {item.value}
                  </h3>
  
                  <p className="mt-4 text-base text-slate-500">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
  
            {/* Industries */}
            <div className="grid md:grid-cols-3 gap-8 mt-16">
  
              {industries.map((item, index) => (
                <div
                  key={index}
                  className={`
                  bg-[#f5f5f5]
                   rounded-[20px]
                   px-5
                   py-4
                   gap-4
                  flex items-center
                  ${neoShadow}
                `}
                >
                  <div
                    className={`
                    h-12 w-12
                    rounded-full
                    bg-[#f5f5f5]
                    flex items-center justify-center
                    ${neoShadow}
                  `}
                  >
                    {item.icon}
                  </div>
  
                  <span className="text-lg font-medium text-slate-800">
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
  
          </div>
        </div>
      </section>
    );
  }