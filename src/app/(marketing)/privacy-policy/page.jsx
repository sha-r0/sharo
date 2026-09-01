import Link from "next/link";
import { Camera, CheckCircle2, LockKeyhole, MapPin, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Privacy Policy",
  description:
    "Learn how SHARO collects, uses, shares, protects, retains, and deletes personal information across its workforce management app and web services.",
  alternates: {
    canonical: "https://sharo.in/privacy-policy",
  },
  openGraph: {
    title: "Privacy Policy | SHARO",
    description:
      "SHARO's privacy practices for its Android app, website, and workforce management services.",
    url: "https://sharo.in/privacy-policy",
    type: "website",
  },
};

const sections = [
  ["introduction", "Introduction"],
  ["information-we-collect", "Information We Collect"],
  ["how-we-use-information", "How We Use Information"],
  ["location-data", "Location Data"],
  ["camera-photo-data", "Camera and Photo Data"],
  ["how-information-is-shared", "How Information Is Shared"],
  ["third-party-services", "Third-Party Services"],
  ["data-storage-security", "Data Storage and Security"],
  ["data-retention", "Data Retention"],
  ["account-data-deletion", "Account and Data Deletion"],
  ["employer-controlled-data", "Employer-Controlled Data"],
  ["user-rights", "User Rights"],
  ["childrens-privacy", "Children's Privacy"],
  ["international-processing", "International Processing"],
  ["policy-changes", "Changes to This Policy"],
  ["contact-us", "Contact Us"],
];

const cardClass =
  "scroll-mt-28 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.06)] sm:p-8 lg:p-10";
const headingClass = "text-2xl font-bold tracking-tight text-[#071330] sm:text-3xl";
const copyClass = "mt-4 space-y-4 text-[15px] leading-7 text-slate-600 sm:text-base sm:leading-8";

function BulletList({ children }) {
  return <ul className="mt-4 list-disc space-y-2 pl-5 marker:text-[#4f6df5]">{children}</ul>;
}

export default function PrivacyPolicyPage() {
  return (
    <main className="bg-[#eef2f7] pb-16 sm:pb-24">
      <section className="px-4 pb-10 pt-12 sm:px-6 sm:pb-14 sm:pt-16 lg:px-8 lg:pt-20">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#5f72ff] to-[#3d5afe] text-white shadow-[0_14px_35px_rgba(79,109,245,0.3)]">
            <ShieldCheck aria-hidden="true" size={28} />
          </div>
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-[#4f6df5]">Legal &amp; Privacy</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-[#071330] sm:text-5xl lg:text-6xl">Privacy Policy</h1>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
            This policy explains how SHARO handles personal information across our Android app, website, and workforce management services.
          </p>
          <p className="mt-5 inline-flex rounded-full border border-[#4f6df5]/15 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
            Last Updated: September 1, 2026
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <nav aria-label="Privacy policy sections" className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_16px_50px_rgba(15,23,42,0.06)] sm:p-6">
            <h2 className="text-base font-bold text-[#071330]">Table of contents</h2>
            <ol className="mt-4 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-1">
              {sections.map(([id, label], index) => (
                <li key={id}>
                  <a href={`#${id}`} className="flex rounded-xl px-3 py-2 text-sm leading-5 text-slate-600 transition-colors hover:bg-[#eef2ff] hover:text-[#3d5afe] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d5afe]">
                    <span className="mr-2 tabular-nums text-slate-400">{index + 1}.</span>{label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <article className="min-w-0 space-y-6" aria-label="SHARO Privacy Policy">
          <section id="introduction" className={cardClass}>
            <h2 className={headingClass}>1. Introduction</h2>
            <div className={copyClass}>
              <p>SHARO respects your privacy and is committed to handling personal information responsibly. This Privacy Policy describes how SHARO collects, uses, shares, stores, and protects information when you use the SHARO Android application, the website at <a className="font-medium text-[#3d5afe] underline underline-offset-4" href="https://sharo.in">sharo.in</a>, and related services (collectively, the “Services”).</p>
              <p>SHARO is a business and workforce management platform used by companies, business owners, managers, administrators, and employees in India. By using the Services, you acknowledge the practices described in this policy.</p>
            </div>
          </section>

          <section id="information-we-collect" className={cardClass}>
            <h2 className={headingClass}>2. Information We Collect</h2>
            <div className={copyClass}>
              <p>The information we collect depends on your role, the SHARO features used by your company, and the permissions you grant.</p>
              <h3 className="pt-2 text-lg font-bold text-[#071330]">Account and identity information</h3>
              <p>This may include your name, employee ID, corporate or company ID, email address, user ID, role or designation, company information, and authentication information used to secure and manage your account.</p>
              <h3 className="pt-2 text-lg font-bold text-[#071330]">Employee and workplace information</h3>
              <p>This may include employment information, department, designation, shift details, attendance, leave, work logs, projects, expenses, advance requests, approval records, and payroll-related information.</p>
              <h3 className="pt-2 text-lg font-bold text-[#071330]">Location information</h3>
              <p>When GPS attendance or another location-based feature is used, SHARO may collect precise or approximate location information during check-in, check-out, or another employer-configured attendance function. This policy does not represent that SHARO continuously tracks background location.</p>
              <h3 className="pt-2 text-lg font-bold text-[#071330]">Photos and camera</h3>
              <p>When enabled or required by your employer, SHARO may access your device camera to capture an attendance selfie or photo. The photo may be uploaded and stored securely for attendance verification.</p>
              <h3 className="pt-2 text-lg font-bold text-[#071330]">Device and technical information</h3>
              <p>This may include device information, operating system, app version, IP address, login and session information, error or debugging information, and security logs.</p>
              <h3 className="pt-2 text-lg font-bold text-[#071330]">Attendance device and biometric integrations</h3>
              <p>SHARO may integrate with third-party attendance or biometric systems configured by an employer. We may receive attendance event information such as an employee identifier, punch or check-in/check-out time, attendance verification method, and attendance device information. SHARO does not claim to directly store fingerprint templates, facial biometric templates, or other raw biometric data as part of these integrations.</p>
            </div>
          </section>

          <section id="how-we-use-information" className={cardClass}>
            <h2 className={headingClass}>3. How We Use Information</h2>
            <div className={copyClass}>
              <p>We may use information to:</p>
              <BulletList>
                <li>authenticate users and provide, maintain, and administer the Services;</li>
                <li>record and verify attendance and manage employees, leave, shifts, and payroll processes;</li>
                <li>support expenses, advance requests, approvals, projects, and work management;</li>
                <li>send service, workplace, approval, security, and other relevant notifications;</li>
                <li>prevent fraud, misuse, and unauthorized access and protect the security of the Services;</li>
                <li>troubleshoot issues and improve application performance and reliability; and</li>
                <li>comply with applicable legal, accounting, regulatory, and contractual requirements.</li>
              </BulletList>
            </div>
          </section>

          <section id="location-data" className={`${cardClass} border-[#4f6df5]/25 bg-[#fbfcff]`}>
            <div className="flex items-start gap-4"><div className="rounded-2xl bg-[#e9edff] p-3 text-[#3d5afe]"><MapPin aria-hidden="true" size={24} /></div><div><h2 className={headingClass}>4. Location Data</h2><p className="mt-2 text-sm font-medium text-[#4f6df5]">Important information about Android location permission</p></div></div>
            <div className={copyClass}>
              <p>SHARO may request location permission to support GPS-based attendance and confirm the location associated with an attendance event. Location may be collected when you use check-in, check-out, or another location-based attendance function configured by your employer.</p>
              <p>Your employer may configure location requirements, permitted attendance locations, or verification rules. If location permission is not granted, location-dependent attendance features may not work as intended. SHARO does not sell location information.</p>
            </div>
          </section>

          <section id="camera-photo-data" className={`${cardClass} border-[#4f6df5]/25 bg-[#fbfcff]`}>
            <div className="flex items-start gap-4"><div className="rounded-2xl bg-[#e9edff] p-3 text-[#3d5afe]"><Camera aria-hidden="true" size={24} /></div><h2 className={headingClass}>5. Camera and Photo Data</h2></div>
            <div className={copyClass}>
              <p>SHARO may request camera permission when your employer requires an attendance selfie or photo. The camera is used to capture that image for attendance recording and verification. Photos may be uploaded and securely stored with the relevant attendance record and made available to authorized company users.</p>
              <p>Attendance photos are not used for advertising.</p>
            </div>
          </section>

          <section id="how-information-is-shared" className={cardClass}>
            <h2 className={headingClass}>6. How Information Is Shared</h2>
            <div className={copyClass}>
              <p><strong className="text-[#071330]">SHARO does not sell users’ personal information.</strong> We may share information only as reasonably necessary with:</p>
              <BulletList>
                <li>your employer, company administrator, and authorized users within your company;</li>
                <li>infrastructure and service providers needed to operate the Services, including cloud hosting, database, storage, authentication, and notification providers;</li>
                <li>payment processing providers where a payment-related feature is used;</li>
                <li>attendance hardware or integration providers where configured by your employer; and</li>
                <li>legal, regulatory, or government authorities when required by applicable law or to protect rights, safety, and security.</li>
              </BulletList>
              <p>Employee data belonging to one company is not intentionally made available to another company. Company-based access restrictions are used to separate customer workspaces.</p>
            </div>
          </section>

          <section id="third-party-services" className={cardClass}>
            <h2 className={headingClass}>7. Third-Party Services</h2>
            <div className={copyClass}>
              <p>SHARO may use third-party service providers to deliver the Services, such as Google Firebase or Google Cloud, authentication services, cloud database and storage services, Cloud Functions or other backend infrastructure, payment processing providers where applicable, notification services, and attendance hardware or integration providers configured by an employer.</p>
              <p>These providers may process information on our behalf to perform their services. Their handling of information may also be governed by their own privacy terms.</p>
            </div>
          </section>

          <section id="data-storage-security" className={cardClass}>
            <div className="flex items-start gap-4"><div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700"><LockKeyhole aria-hidden="true" size={24} /></div><h2 className={headingClass}>8. Data Storage and Security</h2></div>
            <div className={copyClass}>
              <p>We use reasonable administrative, technical, and organizational measures designed to protect information. These may include authentication, access controls, company-based access restrictions, secure cloud infrastructure, encrypted network communication where supported, security monitoring, and restricted administrative access.</p>
              <p>No system or method of transmission is completely secure. We therefore cannot guarantee absolute security.</p>
            </div>
          </section>

          <section id="data-retention" className={cardClass}>
            <h2 className={headingClass}>9. Data Retention</h2>
            <div className={copyClass}>
              <p>We retain information only for as long as reasonably necessary to provide the Services, maintain business and employment records, satisfy employer requirements, meet legal, tax, payroll, and accounting obligations, resolve disputes, enforce agreements, prevent fraud, and maintain security.</p>
              <p>Retention periods may vary by data type, employer instructions, contractual requirements, and applicable law. When information is no longer required, we may delete or anonymize it as appropriate.</p>
            </div>
          </section>

          <section id="account-data-deletion" className={cardClass}>
            <h2 className={headingClass}>10. Account and Data Deletion</h2>
            <div className={copyClass}>
              <p>Users or their company administrators may request account closure or deletion of eligible personal data. For account or personal data deletion requests, contact us at <strong className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-900">[PRIVACY EMAIL]</strong>. Employees may also contact their employer or company administrator for company-managed accounts.</p>
              <p>We will review requests in accordance with applicable law and our role in processing the data. Some business, payroll, attendance, accounting, legal, fraud-prevention, security, or compliance records may need to be retained where legally required or reasonably necessary. Deleting an account may prevent further use of the Services.</p>
            </div>
          </section>

          <section id="employer-controlled-data" className={cardClass}>
            <h2 className={headingClass}>11. Employer-Controlled Data</h2>
            <div className={copyClass}>
              <p>SHARO is a workforce and business management platform. Much of the employee information in the Services is provided, configured, or managed by the user’s employer. The employer determines many workplace processing purposes and controls authorized access within its company account.</p>
              <p>Employees may need to contact their employer or company administrator regarding incorrect employee information, employment or attendance records, payroll information, leave data, or access to a company-managed account.</p>
            </div>
          </section>

          <section id="user-rights" className={cardClass}>
            <h2 className={headingClass}>12. User Rights</h2>
            <div className={copyClass}>
              <p>Subject to applicable law, you may request access to or correction or deletion of your personal information, account closure, or information about how your data is processed. We may need to verify your identity and, for employer-controlled records, coordinate with your employer.</p>
              <p>These rights may depend on applicable law and may be limited by legitimate employer needs and legal, payroll, accounting, security, or other retention requirements.</p>
            </div>
          </section>

          <section id="childrens-privacy" className={cardClass}>
            <h2 className={headingClass}>13. Children’s Privacy</h2>
            <div className={copyClass}><p>SHARO is designed for businesses and workplaces and is not intentionally directed toward children. If we learn that personal information has been collected from a child in circumstances not permitted by applicable law, we will take appropriate steps to address it.</p></div>
          </section>

          <section id="international-processing" className={cardClass}>
            <h2 className={headingClass}>14. International Processing</h2>
            <div className={copyClass}><p>Some service providers or cloud infrastructure used by SHARO may process or store information in jurisdictions different from the user’s location. Where applicable, we take reasonable steps to use appropriate safeguards and handle such processing in accordance with applicable law.</p></div>
          </section>

          <section id="policy-changes" className={cardClass}>
            <h2 className={headingClass}>15. Changes to This Privacy Policy</h2>
            <div className={copyClass}><p>We may update this Privacy Policy from time to time to reflect changes in the Services, our practices, or legal requirements. When we do, we will revise the “Last Updated” date at the top of this page. We encourage you to review this policy periodically.</p></div>
          </section>

          <section id="contact-us" className={`${cardClass} bg-[#071330] text-white`}>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">16. Contact Us</h2>
            <div className="mt-4 space-y-5 text-[15px] leading-7 text-slate-300 sm:text-base sm:leading-8">
              <p>For questions, privacy requests, or concerns about this policy, contact:</p>
              <address className="not-italic">
                <strong className="text-white">SHARO</strong><br />
                Operated by: <span className="text-amber-300">Troynoy A Pvt Ltd</span><br />
                Website: <a className="text-white underline underline-offset-4" href="https://sharo.in">https://sharo.in</a><br />
                Email: <span className="text-amber-300">sharo.techie@gmail.com</span><br />
                Address: <span className="text-amber-300">B1 vishwakarma colony</span>
              </address>
              <Link href="/" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 font-semibold text-[#071330] transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                <CheckCircle2 aria-hidden="true" size={18} /> Return to SHARO
              </Link>
            </div>
          </section>
        </article>
      </div>
    </main>
  );
}
