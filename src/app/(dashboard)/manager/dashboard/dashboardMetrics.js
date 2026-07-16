const DAY = 86_400_000;

export function asDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  if (typeof value === "object" && Number.isFinite(value.seconds)) {
    return new Date(value.seconds * 1000);
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function dateKey(value) {
  const date = asDate(value);
  if (!date) return typeof value === "string" ? value.slice(0, 10) : "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const lower = (value) => String(value || "").trim().toLowerCase();
const amount = (value) => Number(value || 0) || 0;

function recordDate(item) {
  return dateKey(
    item.date ||
      item.workDate ||
      item.createdAt ||
      item.appliedAt ||
      item.startTime ||
      item.checkIn,
  );
}

export function getRange(preset, now = new Date()) {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  let start;
  if (preset === "today") start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  else if (preset === "week") {
    const weekday = (now.getDay() + 6) % 7;
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - weekday);
  } else if (preset === "year") start = new Date(now.getFullYear(), 0, 1);
  else start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { start: dateKey(start), end: dateKey(end) };
}

function inRange(item, range) {
  const key = recordDate(item);
  return !key || (key >= range.start && key <= range.end);
}

function statusIs(item, ...statuses) {
  return statuses.includes(lower(item.status || item.approvalStatus || item.workStatus));
}

function employeeName(employee) {
  return employee.fullName || employee.name || employee.personalInfo?.fullName || "Unknown employee";
}

function hoursFor(item) {
  const direct = amount(item.totalHours || item.hoursWorked || item.durationHours || item.hours);
  if (direct) return direct;
  const start = asDate(item.startTime || item.checkIn);
  const end = asDate(item.endTime || item.checkOut);
  return start && end ? Math.max(0, (end - start) / 3_600_000) : 0;
}

function buildTrend(items, range, valueOf, days = 7) {
  const end = asDate(range.end) || new Date();
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(end.getTime() - (days - index - 1) * DAY);
    const key = dateKey(date);
    return {
      label: date.toLocaleDateString("en-IN", { weekday: "short" }),
      value: items.filter((item) => recordDate(item) === key).reduce((sum, item) => sum + valueOf(item), 0),
    };
  });
}

function activityFrom(type, items, title, subtitle) {
  return items.map((item) => ({
    id: `${type}-${item.id}`,
    type,
    title: title(item),
    subtitle: subtitle(item),
    date: asDate(item.updatedAt || item.createdAt || item.appliedAt || item.date || item.checkIn),
    status: item.status || item.approvalStatus || "",
  }));
}

export function buildDashboardMetrics(data, range) {
  const today = dateKey(new Date());
  const employees = data.employees || [];
  const activeEmployees = employees.filter((item) => lower(item.status || item.employment?.status || (item.isActive === false ? "inactive" : "active")) === "active");
  const allAttendance = data.attendance || [];
  const attendance = allAttendance.filter((item) => inRange(item, range));
  const todayAttendance = allAttendance.filter((item) => recordDate(item) === today);
  const todayEmployeeIds = new Set(todayAttendance.map((item) => item.employeeFirestoreId || item.employeeId));
  const present = todayAttendance.filter((item) => statusIs(item, "present", "late", "half day", "half-day") || item.checkIn);
  const late = todayAttendance.filter((item) => statusIs(item, "late") || item.isLate === true);
  const halfDay = todayAttendance.filter((item) => statusIs(item, "half day", "half-day", "halfday"));
  const allLeaves = data.leaves || [];
  const leaves = allLeaves.filter((item) => inRange(item, range));
  const onLeave = allLeaves.filter((item) => {
    const from = dateKey(item.fromDate || item.startDate || item.date);
    const to = dateKey(item.toDate || item.endDate || item.date);
    return statusIs(item, "approved") && from <= today && to >= today;
  });
  const absent = Math.max(0, activeEmployees.length - todayEmployeeIds.size - onLeave.length);
  const allProjects = data.projects || [];
  const projects = allProjects.filter((item) => inRange(item, range));
  const runningProjects = allProjects.filter((item) => statusIs(item, "running", "active", "in progress"));
  const completedProjects = projects.filter((item) => statusIs(item, "completed", "done"));
  const delayedProjects = allProjects.filter((item) => item.overdue || statusIs(item, "delayed", "overdue") || (item.endDate && dateKey(item.endDate) < today && !statusIs(item, "completed", "done")));
  const expenses = (data.expenses || []).filter((item) => inRange(item, range));
  const todayExpenses = expenses.filter((item) => recordDate(item) === today);
  const workLogs = (data.workLogs || []).filter((item) => inRange(item, range));
  const todayWork = workLogs.filter((item) => recordDate(item) === today);
  const working = todayWork.filter((item) => statusIs(item, "working", "active", "in progress") || (item.startTime && !item.endTime));
  const paused = todayWork.filter((item) => statusIs(item, "paused", "break"));
  const finishedWork = todayWork.filter((item) => statusIs(item, "completed", "done") || item.endTime);
  const allAdvances = data.advances || [];
  const advances = allAdvances.filter((item) => inRange(item, range));
  const gps = (data.gpsPunches?.length ? data.gpsPunches : todayAttendance).filter((item) => recordDate(item) === today);
  const employeeHours = new Map();
  workLogs.forEach((log) => {
    const id = log.employeeFirestoreId || log.employeeId || log.userId;
    employeeHours.set(id, (employeeHours.get(id) || 0) + hoursFor(log));
  });
  const performers = employees.map((employee) => ({
    id: employee.id,
    name: employeeName(employee),
    department: employee.department || employee.employment?.department || "General",
    hours: employeeHours.get(employee.id) || employeeHours.get(employee.employeeId) || 0,
  })).sort((a, b) => b.hours - a.hours);
  const attendanceByEmployee = new Map();
  attendance.forEach((item) => {
    const id = item.employeeFirestoreId || item.employeeId;
    if (!id) return;
    const current = attendanceByEmployee.get(id) || { total: 0, present: 0 };
    current.total += 1;
    if (statusIs(item, "present", "late", "half day", "half-day") || item.checkIn) current.present += 1;
    attendanceByEmployee.set(id, current);
  });
  const lowestAttendance = employees.map((employee) => {
    const record = attendanceByEmployee.get(employee.id) || attendanceByEmployee.get(employee.employeeId);
    return { id: employee.id, name: employeeName(employee), percentage: record?.total ? record.present / record.total * 100 : 0, records: record?.total || 0 };
  }).filter((item) => item.records).sort((a, b) => a.percentage - b.percentage).slice(0, 5);
  const departments = new Set(activeEmployees.map((item) => item.department || item.employment?.department).filter(Boolean));
  const budget = projects.reduce((sum, item) => sum + amount(item.budget), 0);
  const projectExpense = projects.reduce((sum, item) => sum + amount(item.totalExpense), 0);
  const profit = projects.reduce((sum, item) => sum + amount(item.totalProfit ?? item.profit), 0);
  const completion = projects.length ? projects.reduce((sum, item) => sum + amount(item.progress), 0) / projects.length : 0;
  const totalWorkHours = workLogs.reduce((sum, item) => sum + hoursFor(item), 0);
  const todayHours = todayWork.reduce((sum, item) => sum + hoursFor(item), 0);
  const now = new Date();
  const weekStart = dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7)));
  const monthStart = dateKey(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const allWorkLogs = data.workLogs || [];
  const weeklyHours = allWorkLogs.filter((item) => recordDate(item) >= weekStart && recordDate(item) <= today).reduce((sum, item) => sum + hoursFor(item), 0);
  const monthlyHours = allWorkLogs.filter((item) => recordDate(item) >= monthStart && recordDate(item) <= today).reduce((sum, item) => sum + hoursFor(item), 0);
  const monthlyExpenses = (data.expenses || []).filter((item) => recordDate(item) >= monthStart && recordDate(item) <= today);
  const categoryTotals = Object.entries(expenses.reduce((result, item) => {
    const category = item.category || "Other";
    result[category] = (result[category] || 0) + amount(item.amount);
    return result;
  }, {})).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  const activities = [
    ...activityFrom("attendance", attendance, (item) => `${item.employeeName || "Employee"} attendance`, (item) => item.status || "Attendance recorded"),
    ...activityFrom("expense", expenses, (item) => item.description || item.category || "Expense submitted", (item) => `${item.employeeName || "Employee"} • ₹${amount(item.amount).toLocaleString("en-IN")}`),
    ...activityFrom("leave", leaves, (item) => `${item.employeeName || "Employee"} requested leave`, (item) => item.leaveType || item.duration || "Leave request"),
    ...activityFrom("advance", advances, (item) => `${item.employeeName || "Employee"} advance`, (item) => `₹${amount(item.amount).toLocaleString("en-IN")}`),
    ...activityFrom("project", projects, (item) => item.projectName || "Project updated", (item) => item.status || "Project activity"),
    ...activityFrom("work", workLogs, (item) => item.employeeName || "Work log", (item) => item.projectName || `${hoursFor(item).toFixed(1)} hours`),
  ].sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0)).slice(0, 10);

  const upcomingRecurringDate = (value) => {
    const original = asDate(value);
    if (!original) return null;
    const candidate = new Date(now.getFullYear(), original.getMonth(), original.getDate());
    if (candidate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) candidate.setFullYear(candidate.getFullYear() + 1);
    return candidate;
  };
  const employeeOccasions = employees.flatMap((employee) => {
    const birthday = upcomingRecurringDate(employee.personalInfo?.dob || employee.dob || employee.dateOfBirth);
    const anniversary = upcomingRecurringDate(employee.employment?.joiningDate || employee.joiningDate || employee.joinDate);
    return [
      birthday && { id: `birthday-${employee.id}`, title: employeeName(employee), subtitle: "Birthday", date: birthday, type: "birthday" },
      anniversary && { id: `anniversary-${employee.id}`, title: employeeName(employee), subtitle: "Work anniversary", date: anniversary, type: "anniversary" },
    ].filter(Boolean);
  }).filter((item) => item.date.getTime() - now.getTime() <= 45 * DAY).sort((a, b) => a.date - b.date).slice(0, 5);
  const upcomingHolidays = (data.holidays || []).map((holiday) => ({
    ...holiday,
    title: holiday.name || holiday.title || "Company holiday",
    date: asDate(holiday.date || holiday.holidayDate || holiday.startDate),
  })).filter((holiday) => holiday.date && holiday.date >= new Date(now.getFullYear(), now.getMonth(), now.getDate())).sort((a, b) => a.date - b.date).slice(0, 5);

  return {
    summary: {
      employees: employees.length, present: present.length, absent, onLeave: onLeave.length,
      working: working.length, running: runningProjects.length, completed: completedProjects.length,
      delayed: delayedProjects.length, todayExpense: todayExpenses.reduce((s, i) => s + amount(i.amount), 0),
      monthlyExpense: monthlyExpenses.reduce((s, i) => s + amount(i.amount), 0),
      pendingExpenses: expenses.filter((item) => statusIs(item, "pending")).length,
      pendingLeaves: leaves.filter((item) => statusIs(item, "pending")).length,
      pendingAdvances: allAdvances.filter((item) => statusIs(item, "pending") || !item.status).length,
      todayHours,
    },
    employee: { departments: departments.size, newEmployees: [...employees].sort((a, b) => (asDate(b.createdAt)?.getTime() || 0) - (asDate(a.createdAt)?.getTime() || 0)).slice(0, 5), performers: performers.slice(0, 5), lowestAttendance, withoutWorkLogs: activeEmployees.filter((employee) => !employeeHours.has(employee.id) && !employeeHours.has(employee.employeeId)).length },
    project: { running: runningProjects.length, completed: completedProjects.length, delayed: delayedProjects.length, health: projects.length ? projects.reduce((s, i) => s + amount(i.healthScore), 0) / projects.length : 0, budget, expense: projectExpense, profit, completion, recent: [...projects].sort((a, b) => (asDate(b.createdAt)?.getTime() || 0) - (asDate(a.createdAt)?.getTime() || 0)).slice(0, 5) },
    work: { working: working.length, paused: paused.length, completed: finishedWork.length, todayHours, weeklyHours, monthlyHours, totalHours: totalWorkHours, average: workLogs.length ? totalWorkHours / workLogs.length : 0, productivity: totalWorkHours ? completedProjects.length / totalWorkHours * 100 : 0, top: performers[0] || null },
    attendance: { percentage: activeEmployees.length ? (present.length / activeEmployees.length) * 100 : 0, present: present.length, absent, late: late.length, halfDay: halfDay.length, onLeave: onLeave.length },
    leave: { pending: leaves.filter((i) => statusIs(i, "pending")).length, approved: leaves.filter((i) => statusIs(i, "approved")).length, rejected: leaves.filter((i) => statusIs(i, "rejected")).length, onLeave: onLeave.length },
    advance: { pending: advances.filter((i) => statusIs(i, "pending") || !i.status).length, approved: advances.filter((i) => statusIs(i, "approved", "closed")).length, company: advances.filter((i) => lower(i.category) === "company advance").reduce((s, i) => s + amount(i.amount), 0), personal: advances.filter((i) => lower(i.category) === "personal advance").reduce((s, i) => s + amount(i.amount), 0), outstanding: advances.filter((i) => lower(i.category) === "personal advance" && !statusIs(i, "closed", "paid")).reduce((s, i) => s + amount(i.outstandingAmount ?? i.amount), 0) },
    gps: { checkedIn: gps.filter((i) => i.checkIn && !i.checkOut).length, checkedOut: gps.filter((i) => i.checkOut).length, outside: gps.filter((i) => i.gpsValid === false || i.outsideRadius === true).length, missing: Math.max(0, activeEmployees.length - new Set(gps.map((i) => i.employeeFirestoreId || i.employeeId)).size) },
    clients: { total: data.clients?.length || 0, recent: [...(data.clients || [])].sort((a, b) => (asDate(b.createdAt)?.getTime() || 0) - (asDate(a.createdAt)?.getTime() || 0)).slice(0, 5) },
    charts: { attendance: buildTrend(attendance, range, (item) => statusIs(item, "present", "late") || item.checkIn ? 1 : 0), expense: buildTrend(expenses, range, (item) => amount(item.amount)), work: buildTrend(workLogs, range, hoursFor), leave: buildTrend(leaves, range, () => 1), projectStatus: [{ label: "Running", value: runningProjects.length }, { label: "Completed", value: completedProjects.length }, { label: "Delayed", value: delayedProjects.length }], performance: performers.slice(0, 6).map((item) => ({ label: item.name.split(" ")[0], value: item.hours })) },
    categoryTotals,
    recentExpenses: [...expenses].sort((a, b) => (asDate(b.createdAt || b.date)?.getTime() || 0) - (asDate(a.createdAt || a.date)?.getTime() || 0)).slice(0, 5),
    recentWorkLogs: [...workLogs].sort((a, b) => (asDate(b.updatedAt || b.endTime || b.startTime || b.date)?.getTime() || 0) - (asDate(a.updatedAt || a.endTime || a.startTime || a.date)?.getTime() || 0)).slice(0, 5),
    dailyAttendance: [...todayAttendance].sort((a, b) => (asDate(b.checkIn || b.updatedAt)?.getTime() || 0) - (asDate(a.checkIn || a.updatedAt)?.getTime() || 0)).slice(0, 5),
    pendingLeaves: allLeaves.filter((item) => statusIs(item, "pending") || !item.status).sort((a, b) => (asDate(b.appliedAt || b.createdAt)?.getTime() || 0) - (asDate(a.appliedAt || a.createdAt)?.getTime() || 0)).slice(0, 5),
    pendingAdvances: allAdvances.filter((item) => statusIs(item, "pending") || !item.status).sort((a, b) => (asDate(b.appliedAt || b.createdAt || b.date)?.getTime() || 0) - (asDate(a.appliedAt || a.createdAt || a.date)?.getTime() || 0)).slice(0, 5),
    todayGpsPunches: [...gps].sort((a, b) => (asDate(b.checkIn || b.createdAt)?.getTime() || 0) - (asDate(a.checkIn || a.createdAt)?.getTime() || 0)).slice(0, 5),
    employeeOccasions,
    upcomingHolidays,
    attention: [
      { id: "delayed-projects", title: "Delayed projects", value: delayedProjects.length, href: "/manager/projects" },
      { id: "pending-leaves", title: "Pending leave requests", value: allLeaves.filter((item) => statusIs(item, "pending") || !item.status).length, href: "/manager/Workforce" },
      { id: "pending-advances", title: "Pending advance requests", value: allAdvances.filter((item) => statusIs(item, "pending") || !item.status).length, href: "/manager/advance" },
      { id: "gps-review", title: "GPS punches to review", value: gps.filter((item) => item.gpsValid === false || item.outsideRadius).length, href: "/manager/Workforce/gps-approval" },
    ],
    activities,
  };
}
