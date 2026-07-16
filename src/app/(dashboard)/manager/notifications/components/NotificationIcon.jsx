import {
  Banknote, Building2, Calendar, CalendarDays, CheckSquare, Clock3, FileText,
  FolderKanban, MapPin, Megaphone, Package, ReceiptIndianRupee, Settings,
  Timer, UserRound, Wallet,
} from "lucide-react";

const icons = { clock: Clock3, calendar: Calendar, banknote: Banknote, receipt: ReceiptIndianRupee, folder: FolderKanban, timer: Timer, "map-pin": MapPin, building: Building2, "file-text": FileText, package: Package, wallet: Wallet, user: UserRound, settings: Settings, megaphone: Megaphone, "calendar-days": CalendarDays, "check-square": CheckSquare };
const tones = { blue: "bg-blue-50 text-blue-600", pink: "bg-pink-50 text-pink-600", amber: "bg-amber-50 text-amber-600", violet: "bg-violet-50 text-violet-600", indigo: "bg-indigo-50 text-indigo-600", cyan: "bg-cyan-50 text-cyan-600", red: "bg-red-50 text-red-600", emerald: "bg-emerald-50 text-emerald-600", purple: "bg-purple-50 text-purple-600", orange: "bg-orange-50 text-orange-600", green: "bg-green-50 text-green-600", slate: "bg-slate-100 text-slate-600", teal: "bg-teal-50 text-teal-600" };

export default function NotificationIcon({ icon, color, size = "md" }) {
  const Icon = icons[icon] || Megaphone;
  return <span className={`grid shrink-0 place-items-center rounded-2xl ${size === "sm" ? "h-10 w-10" : "h-12 w-12"} ${tones[color] || tones.blue}`}><Icon size={size === "sm" ? 17 : 20}/></span>;
}
