"use client";

import {
  Clock3,
  BarChart3,
  Users,
  Zap,
  DollarSign,
  Bot,
  Sparkles,
} from "lucide-react";

export default function BenefitsSection() {
  const neoShadow =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

  const benefits = [
    {
      icon: Clock3,
      title: "10+ Hours Saved Weekly",
      description:
        "Automate repetitive admin tasks and save valuable time every week.",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      icon: BarChart3,
      title: "Real-Time Insights",
      description:
        "Get instant access to important data and reports to make smart decisions faster.",
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
    },
    {
      icon: Users,
      title: "Complete Team Visibility",
      description:
        "Track attendance, projects, performance and productivity all in one place.",
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
    },
    {
      icon: Zap,
      title: "Faster Decision Making",
      description:
        "Access real-time insights and analytics to make confident business decisions.",
      iconBg: "bg-orange-100",
      iconColor: "text-orange-500",
    },
    {
      icon: DollarSign,
      title: "Reduced Operational Costs",
      description:
        "Minimize manual work and reduce operational costs through smart automation.",
      iconBg: "bg-pink-100",
      iconColor: "text-pink-600",
    },
    {
      icon: Bot,
      title: "Automated Workflows",
      description:
        "Automate approvals, payroll, attendance and other workflows with ease.",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
  ];

  const BenefitCard = ({ benefit }) => (
    <div
      className={`
      bg-[#f5f5f5]
      rounded-[28px]
      p-6
      flex items-start gap-6
      ${neoShadow}
    `}
    >
      <div
        className={`
        h-14
        w-14
        rounded-[18px]
        flex
        items-center
        justify-center
        shrink-0
        ${benefit.iconBg}
      `}
      >
        <benefit.icon
          size={28}
          className={benefit.iconColor}
        />
      </div>

      <div>
        <h3 className="text-2xl font-bold text-[#071330]">
          {benefit.title}
        </h3>

        <p className="mt-3 text-s text-slate-500 leading-8">
          {benefit.description}
        </p>
      </div>
    </div>
  );

  return (
    <section className="relative py-40 overflow-hidden">

      {/* LEFT BLOB */}
      <div className="absolute left-[8%] top-[58%] w-56 h-56 rounded-full bg-blue-200/30 blur-3xl" />

      {/* RIGHT BLOB */}
      <div className="absolute right-[8%] top-[28%] w-64 h-64 rounded-full bg-blue-200/30 blur-3xl" />

      {/* DOTS LEFT */}
      <div className="hidden lg:grid absolute left-28 top-[45%] grid-cols-4 gap-3 opacity-40">
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-blue-400"
          />
        ))}
      </div>

      {/* DOTS RIGHT */}
      <div className="hidden lg:grid absolute right-28 bottom-[15%] grid-cols-4 gap-3 opacity-40">
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-blue-400"
          />
        ))}
      </div>

      <div className="max-w-6xl mx-auto px-6">

        {/* BADGE */}
        <div className="flex justify-center">
          <div
            className={`
            px-6 py-2
            rounded-full
            bg-[#f5f5f5]
            flex items-center gap-2
            text-blue-600
            font-medium
            text-[14px]
            ${neoShadow}
          `}
          >
            <Sparkles size={16} />
            WHY TEAMS CHOOSE SHARO
          </div>
        </div>

        {/* HEADING */}
        <div className="text-center mt-8">
          <h2 className="text-3xl md:text-5xl font-bold leading-tight text-[#071330]">
            Save time. Reduce manual work.
            <br />
            <span className="text-blue-600">
              Run operations more efficiently.
            </span>
          </h2>

          <p className="mt-6 text-s md:text-xl text-slate-500 max-w-3xl mx-auto leading-relaxed">
            SHARO helps you eliminate repetitive tasks,
            gain real-time insights and focus on what matters most.
          </p>
        </div>

        {/* BENEFITS */}
        <div className="mt-20 space-y-8">

          {/* TOP */}
          <div className="grid md:grid-cols-2 gap-8">
            <BenefitCard benefit={benefits[0]} />
            <BenefitCard benefit={benefits[1]} />
          </div>

          {/* CENTER */}
          <div className="flex justify-center">
            <div className="w-full md:w-[650px]">
              <BenefitCard benefit={benefits[2]} />
            </div>
          </div>

          {/* BOTTOM */}
          <div className="grid md:grid-cols-2 gap-8">
            <BenefitCard benefit={benefits[3]} />
            <BenefitCard benefit={benefits[4]} />
          </div>

          {/* CENTER */}
          <div className="flex justify-center">
            <div className="w-full md:w-[650px]">
              <BenefitCard benefit={benefits[5]} />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}