"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  BanknoteArrowDown, Bell, Building2, CalendarCheck2, ChevronRight, ClipboardList,
  FileCheck2, FilePlus2, FolderKanban, LayoutDashboard, LogOut, MapPinned, Menu,
  ReceiptIndianRupee, Settings2, ShieldCheck, Store, UserPlus, Users, WalletCards,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/app/(auth)/context/AuthContext";
import { canAccessPath } from "@/app/allservice/rbac/AuthorizationService";
import activityLogRepository from "@/app/allservice/rbac/activityLogRepository";

const navigation = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/manager", icon: LayoutDashboard, exact: true }],
  },
  {
    label: "People & Workforce",
    items: [
      { label: "Employees", href: "/manager/userManagement", icon: Users, children: [
        { label: "Employee Directory", href: "/manager/userManagement" },
        { label: "Add Employee", href: "/manager/userManagement/add", icon: UserPlus },
      ] },
      { label: "Workforce", href: "/manager/Workforce", icon: CalendarCheck2, children: [
        { label: "Workforce Overview", href: "/manager/Workforce" },
        { label: "Attendance", href: "/manager/Workforce/attendance" },
        { label: "GPS Approval", href: "/manager/Workforce/gps-approval", icon: MapPinned },
        { label: "Leave Policy", href: "/manager/Workforce/leave-policy" },
        { label: "Shift Policy", href: "/manager/Workforce/shift-policy" },
        { label: "Payroll", href: "/manager/Workforce/payroll", icon: WalletCards },
      ] },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Projects", href: "/manager/projects", icon: FolderKanban },
      { label: "Clients", href: "/manager/clients", icon: Building2 },
      { label: "Vendors", href: "/manager/vendors", icon: Store },
      { label: "Expenses", href: "/manager/expenses", icon: ReceiptIndianRupee },
      { label: "Advances", href: "/manager/advance", icon: BanknoteArrowDown },
    ],
  },
  {
    label: "Finance & Sales",
    items: [
      { label: "Billing & Invoices", href: "/manager/billing", icon: WalletCards, children: [
        { label: "Billing Dashboard", href: "/manager/billing" },
        { label: "Create Invoice", href: "/manager/billing/new", icon: FilePlus2 },
        { label: "Billing Settings", href: "/manager/billing/settings", icon: Settings2 },
      ] },
      { label: "Quotations", href: "/manager/quotation-builder", icon: FileCheck2, children: [
        { label: "Quotation Dashboard", href: "/manager/quotation-builder" },
        { label: "New Quotation", href: "/manager/quotation-builder/new" },
        { label: "Quotation Setup", href: "/manager/quotation-builder/setup" },
      ] },
    ],
  },
  {
    label: "Communication",
    items: [
      { label: "Notifications", href: "/manager/notifications", icon: Bell },
      { label: "Notice Board", href: "/manager/notice", icon: ClipboardList },
    ],
  },
];

const neoShadow = "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function Sidebar({ expanded, onExpandedChange }) {
  const pathname = usePathname();
  const router = useRouter();
  const { company, currentUser, access } = useAuth();
  const scopedNavigation = navigation.map((group) => ({ ...group, items: group.items.map((item) => ({ ...item, children: item.children?.filter((child) => canAccessPath(access, child.href)) })).filter((item) => canAccessPath(access, item.href) || item.children?.length) })).filter((group) => group.items.length);

  const active = (item) => item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
  const navigate = (href) => router.push(href);
  const logout = async () => { try { if (company?.id && currentUser?.uid) await activityLogRepository.record(company.id, { type: "user.logout", actorId: currentUser.uid, targetUserId: currentUser.uid }); sessionStorage.removeItem(`rbac-session-${currentUser?.uid}`); await signOut(auth); router.replace("/login"); } catch (error) { console.error(error); } };

  return <aside
    onMouseEnter={() => onExpandedChange(true)}
    onMouseLeave={() => onExpandedChange(false)}
    aria-label="ERP navigation"
    className={`${neoShadow} relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/80 bg-[#F9FAFC] transition-[width] duration-300 ease-out ${expanded ? "w-[264px]" : "w-[72px]"}`}
  >
    <header className="flex h-[70px] shrink-0 items-center border-b border-slate-200/70 px-[14px]">
      <div className={`${neoShadow} grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white bg-[#F9FAFC]`}>
        {company?.logoUrl ? <img src={company.logoUrl} alt="Company logo" className="h-full w-full object-cover"/> : <Image src="/logo.png" alt="SHARO" width={44} height={44} className="object-contain"/>}
      </div>
      <div className={`ml-3 min-w-0 transition-all duration-200 ${expanded ? "translate-x-0 opacity-100" : "pointer-events-none -translate-x-2 opacity-0"}`}>
        <p className="truncate text-sm font-black text-slate-800">{company?.companyName || "SHARO ERP"}</p>
        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">Manager workspace</p>
      </div>
      {expanded && <Menu size={17} className="ml-auto shrink-0 text-slate-400"/>}
    </header>

    <nav className="no-scrollbar flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
      {scopedNavigation.map((group) => <section key={group.label} className="mb-4">
        <div className={`mb-1.5 h-5 overflow-hidden px-3 transition-opacity ${expanded ? "opacity-100" : "opacity-0"}`}>
          <p className="whitespace-nowrap text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{group.label}</p>
        </div>
        {!expanded && <div className="mx-auto mb-2 h-px w-7 bg-slate-200"/>}
        <div className="space-y-1">
          {group.items.map((item) => <NavItem key={item.href} item={item} expanded={expanded} active={active(item)} pathname={pathname} navigate={navigate}/>) }
        </div>
      </section>)}
    </nav>

    <footer className="shrink-0 border-t border-slate-200/70 p-2">
      {expanded && <div className="mb-2 flex items-center gap-3 rounded-xl bg-white/70 px-3 py-2"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><ShieldCheck size={16}/></span><div className="min-w-0"><p className="truncate text-xs font-bold text-slate-700">Secure workspace</p><p className="text-[10px] text-slate-400">Company isolated</p></div></div>}
      <button onClick={logout} title={!expanded ? "Logout" : undefined} className={`flex h-11 w-full items-center rounded-xl text-red-500 transition hover:bg-red-50 ${expanded ? "px-3" : "justify-center"}`}>
        <LogOut size={19} className="shrink-0"/><span className={`ml-3 whitespace-nowrap text-sm font-bold transition-opacity ${expanded ? "opacity-100" : "hidden opacity-0"}`}>Logout</span>
      </button>
    </footer>
  </aside>;
}

function NavItem({ item, expanded, active, pathname, navigate }) {
  const Icon = item.icon;
  const childActive = item.children?.some((child) => pathname === child.href || pathname.startsWith(`${child.href}/`));
  const selected = active || childActive;
  return <div>
    <button
      onClick={() => navigate(item.href)}
      title={!expanded ? item.label : undefined}
      aria-current={selected ? "page" : undefined}
      className={`group/item relative flex h-11 w-full items-center rounded-xl border transition-all duration-200 ${expanded ? "px-3" : "justify-center"} ${selected ? `${neoShadow} border-white bg-[#F9FAFC] text-blue-600` : "border-transparent text-slate-500 hover:border-white hover:bg-[#F9FAFC] hover:text-blue-600 hover:shadow-sm"}`}
    >
      {selected && <span className="absolute -left-2 h-7 w-1 rounded-r-full bg-blue-600"/>}
      <Icon size={19} strokeWidth={selected ? 2.35 : 2} className="shrink-0"/>
      <span className={`ml-3 min-w-0 flex-1 truncate text-left text-sm font-bold transition-all duration-200 ${expanded ? "translate-x-0 opacity-100" : "hidden -translate-x-2 opacity-0"}`}>{item.label}</span>
      {expanded && item.children?.length > 0 && <ChevronRight size={15} className={`shrink-0 transition-transform ${childActive ? "rotate-90 text-blue-500" : "text-slate-300"}`}/>}
    </button>
    {expanded && item.children?.length > 0 && <div className="relative ml-[21px] mt-1 space-y-0.5 border-l border-slate-200 pl-4">
      {item.children.map((child) => {
        const isChildActive = pathname === child.href || (child.href !== item.href && pathname.startsWith(`${child.href}/`));
        const ChildIcon = child.icon;
        return <button key={`${item.label}-${child.href}-${child.label}`} onClick={() => navigate(child.href)} className={`flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition ${isChildActive ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-white hover:text-slate-800"}`}>
          {ChildIcon && <ChildIcon size={14} className="shrink-0"/>}<span className="truncate">{child.label}</span>
        </button>;
      })}
    </div>}
  </div>;
}
