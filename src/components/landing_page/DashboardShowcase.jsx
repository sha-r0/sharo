export default function DashboardShowcase() {

    const neoShadow =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

    return (
        <section className="py-20">
            <div
                className={`
  mt-12
  rounded-[40px]
  bg-[#f5f5f5]
  p-6
  ${neoShadow}
`}
            >
                <div className="grid lg:grid-cols-[220px_1fr] gap-6">

                    {/* SIDEBAR */}
                    <div
                        className={`
      rounded-[30px]
      p-5
      bg-[#f5f5f5]
      ${neoShadow}
    `}
                    >
                        <div className="flex items-center gap-3 mb-10">
                            <div className="h-10 w-10 rounded-xl bg-blue-600" />
                            <span className="text-2xl font-bold">
                                SHARO
                            </span>
                        </div>

                        <div className="space-y-3">
                            {[
                                "Dashboard",
                                "Employees",
                                "Attendance",
                                "Projects",
                                "Expenses",
                                "Payroll",
                                "Reports",
                                "Settings",
                            ].map((item, i) => (
                                <div
                                    key={item}
                                    className={`
            px-4 py-3 rounded-xl

            ${i === 0
                                            ? "bg-blue-600 text-white"
                                            : "text-slate-600"
                                        }
          `}
                                >
                                    {item}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CONTENT */}
                    <div>

                        {/* TOP BAR */}
                        <div className="flex justify-between items-center mb-6">

                            <div>
                                <h3 className="text-3xl font-bold text-[#071330]">
                                    Welcome back, John 👋
                                </h3>

                                <p className="text-slate-500">
                                    Here's what's happening today.
                                </p>
                            </div>

                            <div
                                className={`
          px-5 py-3 rounded-2xl
          bg-[#f5f5f5]
          w-72
          ${neoShadow}
        `}
                            >
                                Search...
                            </div>

                        </div>

                        {/* STATS */}
                        <div className="grid md:grid-cols-4 gap-4">

                            {[
                                "Employees",
                                "Attendance",
                                "Projects",
                                "Expenses",
                            ].map((item) => (
                                <div
                                    key={item}
                                    className={`
            rounded-[24px]
            p-5
            bg-[#f5f5f5]
            ${neoShadow}
          `}
                                >
                                    <p className="text-sm text-slate-500">
                                        {item}
                                    </p>

                                    <h4 className="mt-2 text-3xl font-bold">
                                        2,486
                                    </h4>

                                    <span className="text-green-500 text-sm">
                                        +12.5%
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* CHART + ACTIVITY */}
                        <div className="grid lg:grid-cols-[2fr_1fr] gap-5 mt-5">

                            <div
                                className={`
          h-[320px]
          rounded-[30px]
          bg-[#f5f5f5]
          p-6
          ${neoShadow}
        `}
                            >
                                <h4 className="font-semibold mb-6">
                                    Attendance Overview
                                </h4>

                                <div className="h-[220px] flex items-end gap-4">
                                    {[40, 70, 55, 85, 65, 95].map((h, i) => (
                                        <div
                                            key={i}
                                            className="flex-1 bg-blue-500/20 rounded-t-xl"
                                            style={{ height: `${h}%` }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div
                                className={`
          rounded-[30px]
          bg-[#f5f5f5]
          p-6
          ${neoShadow}
        `}
                            >
                                <h4 className="font-semibold mb-5">
                                    Recent Activity
                                </h4>

                                <div className="space-y-4">
                                    {[
                                        "Attendance marked",
                                        "Expense approved",
                                        "New project created",
                                        "Payroll generated",
                                    ].map((item) => (
                                        <div key={item}>
                                            <p className="text-sm font-medium">
                                                {item}
                                            </p>

                                            <p className="text-xs text-slate-500">
                                                10 minutes ago
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>

                    </div>

                </div>
            </div>
        </section>
    );
}