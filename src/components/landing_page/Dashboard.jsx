import {
  Bell,
  Search,
  Users,
  CalendarCheck,
  FolderKanban,
  ShieldCheck,
} from "lucide-react";
import Motion from "@/components/animation/Motion";

export default function DashboardPreview() {
  return (
    <Motion >
      <div
        className="
        w-full
        max-w-[760px]
  
        bg-[#f5f5f5]
  
        rounded-[36px]
  
        p-6
  
        shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]
      "
      >
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <div
            className="
            flex items-center gap-3
  
            px-5 py-3
  
            rounded-[18px]
  
            bg-[#f5f5f5]
  
            shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]
          "
          >
            <Search size={18} />
            <span className="text-slate-400">
              Search anything...
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Bell size={18} />

            <div className="flex items-center gap-3">
              <img
                src="https://i.pravatar.cc/100?img=12"
                className="w-10 h-10 rounded-full"
              />

              <div>
                <p className="font-semibold text-sm">
                  Ashish Kumar
                </p>

                <p className="text-xs text-slate-500">
                  Admin
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-4 gap-4">

          {[
            {
              title: "Employees",
              value: "128",
              icon: <Users size={18} />,
            },
            {
              title: "Present",
              value: "96",
              icon: <CalendarCheck size={18} />,
            },
            {
              title: "Projects",
              value: "14",
              icon: <FolderKanban size={18} />,
            },
            {
              title: "Approvals",
              value: "6",
              icon: <ShieldCheck size={18} />,
            },
          ].map((item, index) => (
            <Motion
              key={item.title}
              delay={0.3 + index * 0.08}
              hover
            >
              <div
                className="
      p-5
      rounded-[22px]
      bg-[#f5f5f5]
      shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]
    "
              >
                <div className="flex justify-between items-center">
                  <p className="text-xs text-slate-500">
                    {item.title}
                  </p>

                  {item.icon}
                </div>

                <h3 className="mt-4 text-3xl font-bold text-slate-900">
                  {item.value}
                </h3>
              </div>
            </Motion>
          ))}
        </div>

        {/* CHART + ACTIVITY */}
        <div className="grid grid-cols-3 gap-4 mt-5">

          {/* CHART */}
          <div
            className="
            col-span-2
  
            h-[190px]
  
            rounded-[26px]
  
            p-6
  
            bg-[#f5f5f5]
  
            shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]
          "
          >
            <h4 className="font-semibold text-lg mb-10">
              Attendance Overview
            </h4>

            <div className="flex items-end gap-4 h-[100px]">
              {[70, 90, 55, 75, 60, 95].map((h, i) => (
                <div
                  key={i}
                  className="
                  flex-1
  
                    bg-gradient-to-r
  from-[#5f72ff]
  to-[#3d5afe]
  
                  rounded-t-xl
                "
                  style={{
                    height: `${h}%`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* ACTIVITY */}
          <div
            className="
            rounded-[26px]
  
            p-5
  
            bg-[#f5f5f5]
  
            shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]
          "
          >
            <h4 className="font-semibold mb-5">
              Activity
            </h4>

            <div className="space-y-4 text-sm">
              <p>✓ Rahul checked in</p>
              <p>✓ Expense approved</p>
            </div>
          </div>
        </div>

        {/* BOTTOM */}
        <div className="grid grid-cols-2 gap-4 mt-5">

          <div
            className="
            p-6
  
            rounded-[26px]
  
            bg-[#f5f5f5]
  
            shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]
          "
          >
            <p className="text-slate-500">
              Monthly Expenses
            </p>

            <h3 className="text-4xl font-bold mt-4">
              ₹2.45L
            </h3>
          </div>

          <div
            className="
            p-6
  
            rounded-[26px]
  
            bg-[#f5f5f5]
  
            shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]
          "
          >
            <p className="font-semibold">
              Top Projects
            </p>

            <div className="mt-5 space-y-4">

              <div>
                <div className="flex justify-between mb-2 text-sm">
                  <span>Mobile App</span>
                  <span>75%</span>
                </div>

                <div className="h-2 rounded-full bg-slate-200">
                  <div className="h-full w-[75%] rounded-full bg-blue-500" />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2 text-sm">
                  <span>Website</span>
                  <span>60%</span>
                </div>

                <div className="h-2 rounded-full bg-slate-200">
                  <div className="h-full w-[60%] rounded-full bg-blue-500" />
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </Motion>
  );
}