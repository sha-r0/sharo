"use client";

import {
  ArrowRight,
  Calendar,
  Clock3,
  Users,
  FolderKanban,
  CreditCard,
  BookOpen,
} from "lucide-react";

export default function BlogSection() {
  const neoShadow =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

  const blogs = [
    {
      icon: Users,
      title: "How to Improve Employee Productivity",
      desc: "Practical strategies to improve team efficiency and employee engagement.",
      date: "Jun 20, 2026",
      read: "5 min read",
    },
    {
      icon: FolderKanban,
      title: "Project Management Best Practices",
      desc: "Learn how growing companies deliver projects faster with better visibility.",
      date: "Jun 18, 2026",
      read: "4 min read",
    },
    {
      icon: CreditCard,
      title: "Payroll Automation for Modern Teams",
      desc: "Reduce payroll errors and save hours every month with automation.",
      date: "Jun 15, 2026",
      read: "6 min read",
    },
  ];

  return (
    <section className="py-28 relative overflow-hidden">

      <div className="absolute left-0 top-40 w-64 h-64 bg-blue-200/20 rounded-full blur-3xl" />
      <div className="absolute right-0 bottom-20 w-72 h-72 bg-blue-300/20 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto px-6">

        {/* Badge */}
        <div className="flex justify-center">
          <div
            className={`
            px-5 py-2
            rounded-full
            bg-[#f5f5f5]
            text-blue-600
            text-sm
            font-medium
            flex items-center gap-2
            ${neoShadow}
          `}
          >
            <BookOpen size={16} />
            OUR BLOG
          </div>
        </div>

        {/* Heading */}
        <div className="text-center mt-8">
          <h2 className="text-3xl md:text-5xl font-bold text-[#071330]">
            Latest insights & updates
          </h2>

          <p className="mt-5 text-s text-slate-500 max-w-2xl mx-auto">
            Stay updated with the latest trends, tips and best
            practices in workforce and project management.
          </p>
        </div>

        {/* Blog Cards */}
        <div className="grid lg:grid-cols-3 gap-8 mt-16">

          {blogs.map((blog, index) => {
            const Icon = blog.icon;

            return (
              <div
                key={index}
                className={`
                bg-[#f5f5f5]
                rounded-[32px]
                overflow-hidden
                ${neoShadow}
              `}
              >
                {/* Top Illustration Area */}
                <div className="h-60 p-8">

                  <div
                    className={`
                    h-full
                    rounded-[28px]
                    bg-[#f5f5f5]
                    flex items-center justify-center
                    ${neoShadow}
                  `}
                  >
                    <div
                      className={`
                      h-24 w-24
                      rounded-full
                      bg-[#f5f5f5]
                      flex items-center justify-center
                      ${neoShadow}
                    `}
                    >
                      <Icon
                        size={42}
                        className="text-blue-600"
                      />
                    </div>
                  </div>

                </div>

                {/* Content */}
                <div className="px-8 pb-8">

                  <div className="flex items-center justify-between text-sm text-slate-500">

                    <div className="flex items-center gap-2">
                      <Calendar size={14} />
                      {blog.date}
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock3 size={14} />
                      {blog.read}
                    </div>

                  </div>

                  <h3 className="mt-6 text-2xl font-bold text-[#071330] leading-tight">
                    {blog.title}
                  </h3>

                  <p className="mt-4 text-slate-500 leading-7">
                    {blog.desc}
                  </p>

                  <button
                    className={`
                    mt-8
                    px-5 py-3
                    rounded-full
                    bg-[#f5f5f5]
                    flex items-center gap-2
                    text-blue-600
                    font-medium
                    ${neoShadow}
                  `}
                  >
                    Read More
                    <ArrowRight size={16} />
                  </button>

                </div>

              </div>
            );
          })}

        </div>

        {/* View All */}
        <div className="flex justify-center mt-12">

          <button
            className={`
            px-8 py-4
            rounded-full
            bg-[#f5f5f5]
            text-blue-600
            font-medium
            flex items-center gap-3
            ${neoShadow}
          `}
          >
            View All Articles
            <ArrowRight size={18} />
          </button>

        </div>

      </div>
    </section>
  );
}