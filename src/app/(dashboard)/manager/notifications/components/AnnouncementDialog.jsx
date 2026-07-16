"use client";

import { useEffect, useMemo, useState } from "react";
import { Megaphone, X } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/app/(auth)/context/AuthContext";
import employeeService from "@/app/allservice/employee/employeeService";
import projectService from "@/app/(dashboard)/manager/projects/services/projectService";
import notificationService from "@/app/allservice/notification/notificationService";

export default function AnnouncementDialog({ open, onClose }) {
  const { company, currentUser } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: "", message: "", priority: "medium", target: "company", department: "", projectId: "", users: [], scheduledAt: "", expiresAt: "" });

  useEffect(() => {
    if (!open || !company?.id) return;
    Promise.all([employeeService.getEmployees(company.id), projectService.getProjects(company.id)])
      .then(([employeeData, projectData]) => { setEmployees(employeeData); setProjects(projectData); })
      .catch((error) => console.error("Announcement audiences failed to load:", error));
  }, [open, company?.id]);

  const departments = useMemo(() => [...new Set(employees.map((item) => item.department || item.employment?.department).filter(Boolean))].sort(), [employees]);
  if (!open) return null;

  const submit = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.message.trim()) return toast.error("Title and message are required.");
    setLoading(true);
    try {
      const selectedProject = projects.find((item) => item.id === form.projectId);
      const projectUsers = selectedProject?.employees?.flatMap((item) => [item.firestoreId || item.id, item.employeeId]).filter(Boolean) || [];
      await notificationService.createAnnouncement({
        companyId: company.id,
        title: form.title,
        message: form.message,
        priority: form.priority,
        sender: { id: currentUser.id, uid: currentUser.uid || null, name: currentUser.name || currentUser.displayName || "Manager", role: currentUser.role || "manager" },
        receiver: form.target === "company" ? "company" : null,
        targetRole: form.target === "managers" ? "manager" : null,
        targetUsers: form.target === "users" ? employees.filter((item) => form.users.includes(item.id)).flatMap((item) => [item.id, item.employeeId]).filter(Boolean) : form.target === "project" ? projectUsers : [],
        department: form.target === "department" ? form.department : null,
        projectId: form.target === "project" ? form.projectId : null,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt) : null,
        expiresAt: form.expiresAt ? new Date(form.expiresAt) : null,
        metadata: { targetType: form.target, department: form.department || null, projectId: form.projectId || null },
      });
      toast.success(form.scheduledAt ? "Announcement scheduled." : "Announcement published.");
      setForm({ title: "", message: "", priority: "medium", target: "company", department: "", projectId: "", users: [], scheduledAt: "", expiresAt: "" });
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Could not publish announcement.");
    } finally { setLoading(false); }
  };

  const field = "mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50";
  return <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/30 p-4 backdrop-blur-sm"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white bg-[#F9FAFC] shadow-2xl">
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 p-5 backdrop-blur"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-600"><Megaphone size={20}/></span><div><h2 className="text-lg font-bold text-slate-800">Create announcement</h2><p className="text-xs text-slate-500">Broadcast a targeted company message</p></div></div><button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"><X size={18}/></button></div>
    <form onSubmit={submit} className="space-y-5 p-5 sm:p-6">
      <label className="block text-xs font-bold text-slate-600">Title<input className={field} value={form.title} maxLength={120} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Important company update"/></label>
      <label className="block text-xs font-bold text-slate-600">Message<textarea className={`${field} h-28 py-3 resize-none`} value={form.message} maxLength={1000} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="Write your announcement..."/></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="block text-xs font-bold text-slate-600">Priority<select className={field} value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label><label className="block text-xs font-bold text-slate-600">Target<select className={field} value={form.target} onChange={(event) => setForm({ ...form, target: event.target.value, users: [] })}><option value="company">Entire company</option><option value="department">Department</option><option value="project">Project team</option><option value="users">Specific employees</option><option value="managers">Managers</option></select></label></div>
      {form.target === "department" && <label className="block text-xs font-bold text-slate-600">Department<select className={field} value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })}><option value="">Select department</option>{departments.map((item) => <option key={item}>{item}</option>)}</select></label>}
      {form.target === "project" && <label className="block text-xs font-bold text-slate-600">Project<select className={field} value={form.projectId} onChange={(event) => setForm({ ...form, projectId: event.target.value })}><option value="">Select project</option>{projects.map((item) => <option key={item.id} value={item.id}>{item.projectName}</option>)}</select></label>}
      {form.target === "users" && <div><p className="text-xs font-bold text-slate-600">Employees</p><div className="mt-2 grid max-h-44 gap-2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 sm:grid-cols-2">{employees.map((item) => <label key={item.id} className="flex min-w-0 items-center gap-2 rounded-xl p-2 text-sm hover:bg-slate-50"><input type="checkbox" checked={form.users.includes(item.id)} onChange={(event) => setForm({ ...form, users: event.target.checked ? [...form.users, item.id] : form.users.filter((id) => id !== item.id) })}/><span className="truncate">{item.fullName || item.name}</span></label>)}</div></div>}
      <div className="grid gap-4 sm:grid-cols-2"><label className="block text-xs font-bold text-slate-600">Schedule (optional)<input type="datetime-local" className={field} value={form.scheduledAt} onChange={(event) => setForm({ ...form, scheduledAt: event.target.value })}/></label><label className="block text-xs font-bold text-slate-600">Expiry (optional)<input type="datetime-local" min={form.scheduledAt} className={field} value={form.expiresAt} onChange={(event) => setForm({ ...form, expiresAt: event.target.value })}/></label></div>
      <div className="flex justify-end gap-3 border-t border-slate-100 pt-5"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600">Cancel</button><button disabled={loading} className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-200 disabled:opacity-60">{loading ? "Publishing..." : form.scheduledAt ? "Schedule" : "Publish"}</button></div>
    </form>
  </div></div>;
}
