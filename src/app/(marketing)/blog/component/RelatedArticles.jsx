"use client";

import {
  Folder,
  DollarSign,
  PieChart,
  Clock3,
  Calendar,
  ArrowRight,
  Mail,
} from "lucide-react";

export default function RelatedArticles() {
  const neoShadow =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

  const articles = [
    {
      icon: Folder,
      category: "PROJECTS",
      title: "Project Management Best Practices for Growing Teams",
      date: "June 18, 2026",
      read: "4 min read",
    },
    {
      icon: DollarSign,
      category: "PAYROLL",
      title: "Payroll Automation: Benefits for Modern Businesses",
      date: "June 15, 2026",
      read: "6 min read",
    },
    {
      icon: PieChart,
      category: "OPERATIONS",
      title: "How to Streamline Operations and Save More Time",
      date: "June 12, 2026",
      read: "5 min read",
    },
  ];

  return (
    <section className="relative mt-24">

      {/* Floating Sphere */}
      {/* <div className="absolute -right-10 top-32 w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 blur-[1px]" /> */}

      <div
        className={`
        bg-[#f5f5f5]
        rounded-[40px]
        p-8
        ${neoShadow}
      `}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-[#071330]">
            Related Articles
          </h2>

          <button className="flex items-center gap-2 text-blue-600 font-medium">
            View all articles
            <ArrowRight size={18} />
          </button>
        </div>

        {/* Articles */}
        <div className="grid lg:grid-cols-3 gap-6">

          {articles.map((article, index) => {
            const Icon = article.icon;

            return (
              <div
                key={index}
                className={`
                bg-[#f5f5f5]
                rounded-[30px]
                p-6
                ${neoShadow}
              `}
              >
                <div className="flex items-start gap-5">

                  {/* Icon */}
                  <div
                    className={`
                    h-20 w-20
                    rounded-full
                    flex items-center justify-center
                    bg-[#f5f5f5]
                    shrink-0
                    ${neoShadow}
                  `}
                  >
                    <Icon
                      size={34}
                      className="text-blue-600"
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1">

                    <span
                      className="
                      inline-flex
                      px-3 py-1
                      rounded-full
                      bg-blue-50
                      text-blue-600
                      text-xs
                      font-semibold
                    "
                    >
                      {article.category}
                    </span>

                    <h3 className="mt-3 text-xl font-bold text-[#071330] leading-8">
                      {article.title}
                    </h3>

                  </div>

                  <button
                    className={`
                    h-12 w-12
                    rounded-full
                    flex items-center justify-center
                    bg-[#f5f5f5]
                    shrink-0
                    ${neoShadow}
                  `}
                  >
                    <ArrowRight
                      size={18}
                      className="text-blue-600"
                    />
                  </button>

                </div>

                <div className="flex items-center gap-6 mt-6 text-slate-500 text-sm">

                  <div className="flex items-center gap-2">
                    <Clock3 size={15} />
                    {article.read}
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar size={15} />
                    {article.date}
                  </div>

                </div>
              </div>
            );
          })}
        </div>

        {/* Newsletter */}
        <div
          className={`
          mt-8
          bg-[#f5f5f5]
          rounded-[32px]
          p-8
          ${neoShadow}
        `}
        >
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">

            <div className="flex items-center gap-6">

              <div
                className={`
                h-20 w-20
                rounded-[24px]
                flex items-center justify-center
                bg-[#f5f5f5]
                ${neoShadow}
              `}
              >
                <Mail
                  size={34}
                  className="text-blue-600"
                />
              </div>

              <div>
                <h3 className="text-3xl font-bold text-[#071330]">
                  Get the latest insights in your inbox
                </h3>

                <p className="mt-2 text-slate-500">
                  Join 2,000+ professionals who receive our weekly updates.
                </p>
              </div>

            </div>

            <div className="flex w-full lg:w-auto gap-4">

              <input
                placeholder="Enter your email"
                className={`
                flex-1
                lg:w-[320px]
                px-6
                py-4
                rounded-[20px]
                bg-[#f5f5f5]
                outline-none
                ${neoShadow}
              `}
              />

              <button
                className="
                px-8
                py-4
                rounded-[20px]
                bg-blue-600
                text-white
                font-medium
              "
              >
                Subscribe
              </button>

            </div>

          </div>
        </div>

      </div>
    </section>
  );
}