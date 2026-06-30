"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Clock3,
  Calendar,
  User,
  ArrowRight,
} from "lucide-react";
import RelatedArticles from "./component/RelatedArticles";

export default function BlogDetailPage() {
  const neoShadow =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

  return (
    <main className="min-h-screen bg-[#eef2f7]">
      <div className="max-w-7xl mx-auto px-6 py-16">

        <div className="grid lg:grid-cols-[260px_1fr] gap-10">

          {/* SIDEBAR */}
          <aside className="hidden lg:block">
            <div
              className={`
              sticky top-28
              bg-[#f5f5f5]
              rounded-[28px]
              p-6
              ${neoShadow}
            `}
            >
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                On This Page
              </h4>

              <div className="mt-6 space-y-5">

                <a
                  href="#intro"
                  className="block text-blue-600 font-medium"
                >
                  Introduction
                </a>

                <a
                  href="#why"
                  className="block text-slate-500"
                >
                  Why Productivity Matters
                </a>

                <a
                  href="#challenges"
                  className="block text-slate-500"
                >
                  Common Challenges
                </a>

                <a
                  href="#practices"
                  className="block text-slate-500"
                >
                  Best Practices
                </a>

                <a
                  href="#tools"
                  className="block text-slate-500"
                >
                  Tools That Help
                </a>

                <a
                  href="#conclusion"
                  className="block text-slate-500"
                >
                  Conclusion
                </a>

              </div>
            </div>
          </aside>

          {/* CONTENT */}
          <article>

            {/* Back */}
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-blue-600 font-medium"
            >
              <ArrowLeft size={18} />
              Back to Blog
            </Link>

            {/* Badge */}
            <div className="mt-8">
              <span
                className={`
                px-4 py-2
                rounded-full
                bg-[#f5f5f5]
                text-blue-600
                text-sm
                font-medium
                ${neoShadow}
              `}
              >
                WORKFORCE
              </span>
            </div>

            {/* Title */}
            <h1 className="mt-8 text-5xl md:text-6xl font-bold text-[#071330] leading-tight max-w-5xl">
              How to Improve Employee
              Productivity in 2026
            </h1>

            {/* Description */}
            <p className="mt-6 text-xl text-slate-500 max-w-4xl leading-9">
              Practical strategies and proven methods to boost
              productivity, improve focus and build a
              high-performing team.
            </p>

            {/* Meta */}
            <div className="flex flex-wrap gap-8 mt-8 text-slate-500">

              <div className="flex items-center gap-2">
                <Clock3 size={16} />
                5 min read
              </div>

              <div className="flex items-center gap-2">
                <Calendar size={16} />
                June 20, 2026
              </div>

              <div className="flex items-center gap-2">
                <User size={16} />
                SHARO Team
              </div>

            </div>

            {/* HERO IMAGE */}
            <div
              className={`
              mt-12
              bg-[#f5f5f5]
              rounded-[40px]
              p-6
              ${neoShadow}
            `}
            >
              <img
                src="/blog-cover.png"
                alt="Blog Cover"
                className="rounded-[28px] w-full"
              />
            </div>

            {/* ARTICLE CONTENT */}
            <div className="max-w-4xl mt-16">

              <section id="intro">
                <h2 className="text-4xl font-bold text-[#071330]">
                  Introduction
                </h2>

                <p className="mt-6 text-lg leading-9 text-slate-600">
                  Employee productivity is no longer just
                  about working longer hours. Modern
                  organizations focus on creating systems,
                  processes and tools that help employees
                  perform at their best.
                </p>
              </section>

              <section id="why" className="mt-16">
                <h2 className="text-4xl font-bold text-[#071330]">
                  Why Productivity Matters
                </h2>

                <p className="mt-6 text-lg leading-9 text-slate-600">
                  High-performing teams complete projects
                  faster, reduce operational costs and
                  deliver better customer experiences.
                </p>

                <ul className="mt-8 space-y-4 text-lg text-slate-600">
                  <li>✓ Better operational efficiency</li>
                  <li>✓ Improved employee satisfaction</li>
                  <li>✓ Higher profitability</li>
                  <li>✓ Faster project delivery</li>
                </ul>
              </section>

              <section id="challenges" className="mt-16">
                <h2 className="text-4xl font-bold text-[#071330]">
                  Common Challenges
                </h2>

                <p className="mt-6 text-lg leading-9 text-slate-600">
                  Many businesses struggle with manual
                  attendance tracking, disconnected
                  communication, poor visibility into
                  projects and repetitive administrative
                  work.
                </p>
              </section>

              <section id="practices" className="mt-16">
                <h2 className="text-4xl font-bold text-[#071330]">
                  Best Practices
                </h2>

                <p className="mt-6 text-lg leading-9 text-slate-600">
                  Organizations can significantly improve
                  productivity by automating routine
                  processes, tracking performance metrics
                  and centralizing operations in a single
                  platform.
                </p>
              </section>

              <section id="tools" className="mt-16">
                <h2 className="text-4xl font-bold text-[#071330]">
                  Tools That Help
                </h2>

                <p className="mt-6 text-lg leading-9 text-slate-600">
                  Platforms like SHARO combine attendance,
                  payroll, employee management, project
                  tracking and expense management into one
                  streamlined system.
                </p>
              </section>

              <section id="conclusion" className="mt-16">
                <h2 className="text-4xl font-bold text-[#071330]">
                  Conclusion
                </h2>

                <p className="mt-6 text-lg leading-9 text-slate-600">
                  Improving employee productivity requires
                  the right culture, systems and tools.
                  Businesses that invest in operational
                  excellence gain a significant competitive
                  advantage.
                </p>
              </section>

            </div>

            {/* AUTHOR */}
            <div
              className={`
              mt-20
              bg-[#f5f5f5]
              rounded-[32px]
              p-8
              ${neoShadow}
            `}
            >
              <h3 className="text-2xl font-bold text-[#071330]">
                SHARO Editorial Team
              </h3>

              <p className="mt-4 text-slate-500 leading-8">
                Experts in workforce management,
                productivity, payroll automation and
                business operations.
              </p>
            </div>

          </article>

          

        </div>
        <RelatedArticles />
      </div>

      
    </main>
  );
}