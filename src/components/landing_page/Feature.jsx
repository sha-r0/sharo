import {
    Users,
    CalendarCheck,
    Wallet,
    FolderKanban,
    CreditCard,
    BarChart3,
    ShieldCheck,
    ArrowRight,
} from "lucide-react";

export default function FeaturesSection() {
    const neoShadow =
        "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

    return (
        <section id="features" className="py-10 scroll-mt-32">
            <div className="max-w-7xl mx-auto px-2">

                {/* Badge */}
                <div className="flex justify-center">
                    <div className={`${neoShadow} px-6 py-2 rounded-full text-blue-600 font-medium`}>
                        ✦ POWERFUL FEATURES
                    </div>
                </div>

                {/* Heading */}
                <div className="text-center mt-8">
                    <h2 className="text-3xl md:text-5xl font-bold text-[#071330] leading-tight">
                        Everything your company needs.
                        <br />
                        <span className="text-blue-600">
                            One powerful platform.
                        </span>
                    </h2>

                    <p className="mt-6 text-s text-slate-500 max-w-3xl mx-auto">
                        Manage employees, attendance, projects, expenses,
                        payroll and analytics from a single dashboard.
                    </p>
                </div>

                {/* BIG FEATURE CARD */}
                <div
                    className={`
      mt-20
      bg-[#f5f5f5]
      rounded-[40px]
      p-10
      ${neoShadow}
    `}
                >
                    <div className="grid lg:grid-cols-[1.3fr_1fr] gap-8 items-center">

                        {/* LEFT */}
                        <div>

                            <div className="flex items-center gap-4">

                                <div
                                    className={`
      h-14
      w-14
      rounded-2xl
      bg-[#f5f5f5]
      flex items-center justify-center
      ${neoShadow}
    `}
                                >
                                    <Users
                                        size={24}
                                        className="text-blue-600"
                                    />
                                </div>

                                <div>
                                    <h3 className="text-[26px] font-semibold text-[#071330]">
                                        Employee Management
                                    </h3>

                                    <p className="text-sm text-slate-500">
                                        Workforce Operations
                                    </p>
                                </div>

                            </div>

                            <p className="mt-6 text-base leading-7 text-slate-500 max-w-lg">
                                Manage employees, departments,
                                permissions and performance from
                                one centralized workspace.
                            </p>

                            <div className="mt-8 flex items-center gap-8">

                                <div>
                                    <h4 className="text-3xl font-bold text-[#071330]">
                                        2,486
                                    </h4>

                                    <p className="text-sm text-slate-500">
                                        Active Employees
                                    </p>
                                </div>

                                <div>
                                    <h4 className="text-3xl font-bold text-[#071330]">
                                        98%
                                    </h4>

                                    <p className="text-sm text-slate-500">
                                        Attendance Rate
                                    </p>
                                </div>

                            </div>

                        </div>

                        {/* RIGHT */}
                        <div
                            className={`
  rounded-[24px]
  p-4
  bg-[#f5f5f5]
  ${neoShadow}
`}
                        >

                            {[
                                ["Rahul Sharma", "Active"],
                                ["Priya Singh", "Active"],
                                ["Amit Kumar", "On Leave"],
                            ].map(([name, status]) => (
                                <div
                                    key={name}
                                    className="
      flex
      items-center
      justify-between

      py-3

      border-b
      border-slate-100
      last:border-0
    "
                                >
                                    <div className="flex items-center gap-3">

                                        <div className="h-8 w-8 rounded-full bg-blue-200" />

                                        <span className="text-sm font-medium text-slate-700">
                                            {name}
                                        </span>

                                    </div>

                                    <span
                                        className={`
        px-2 py-1
        rounded-full
        text-xs

        ${status === "Active"
                                                ? "bg-green-100 text-green-700"
                                                : "bg-orange-100 text-orange-700"
                                            }
      `}
                                    >
                                        {status}
                                    </span>

                                </div>
                            ))}

                        </div>

                    </div>
                </div>

                {/* FEATURE GRID */}
                <div className="grid md:grid-cols-3 gap-6 mt-8">

                    {[
                        {
                            title: "Attendance Tracking",
                            desc: "Real-time attendance with geolocation and reports.",
                            icon: CalendarCheck,
                            color: "text-blue-600",
                        },
                        {
                            title: "Expense Management",
                            desc: "Track, approve and manage expenses easily.",
                            icon: Wallet,
                            color: "text-green-600",
                        },
                        {
                            title: "Project Management",
                            desc: "Plan, assign and track project progress.",
                            icon: FolderKanban,
                            color: "text-violet-600",
                        },
                        {
                            title: "Payroll Management",
                            desc: "Automated payroll and salary processing.",
                            icon: CreditCard,
                            color: "text-orange-500",
                        },
                        {
                            title: "Analytics & Reports",
                            desc: "Powerful business insights and reporting.",
                            icon: BarChart3,
                            color: "text-pink-500",
                        },
                        {
                            title: "Automation",
                            desc: "Automate repetitive workflows and approvals.",
                            icon: ShieldCheck,
                            color: "text-blue-600",
                        },
                    ].map((feature) => (
                        <div
                            key={feature.title}
                            className={`
          bg-[#f5f5f5]
          rounded-[30px]
          p-8
          ${neoShadow}
        `}
                        >
                            <div className="flex justify-between items-start">

                                <div
                                    className={`
h-14
w-14
rounded-[16px]
              bg-[#f5f5f5]
              flex items-center justify-center
              ${neoShadow}
            `}
                                >
                                    <feature.icon
                                        size={26}
                                        className={feature.color}
                                    />
                                </div>

                                <button
                                    className={`
              h-12
              w-12
              rounded-full
              flex items-center justify-center
              bg-[#f5f5f5]
              ${neoShadow}
            `}
                                >
                                    <ArrowRight
                                        size={18}
                                        className="text-blue-600"
                                    />
                                </button>

                            </div>

                            <h4 className="mt-6 text-[26px] font-bold text-[#071330]">
                                {feature.title}
                            </h4>

                            <p className="mt-2 text-s text-slate-500">
                                {feature.desc}
                            </p>

                        </div>
                    ))}

                </div>

            </div>
        </section>
    );
}