// "use client";

// import { useEffect, useState } from "react";
// import { UserPlus, Trash2, Shield, X, Pencil, Icon, icons } from "lucide-react";
// import { db } from "@/lib/firebase";
// import {
//     collection,
//     addDoc,
//     getDoc,
//     getDocs,
//     doc,
//     updateDoc,
//     serverTimestamp,
// } from "firebase/firestore";
// import Image from "next/image";
// import {
//     User,
//     Mail,
//     Phone,
//     Briefcase,
//     Building,
//     BadgeIndianRupee,
//     IdCard
// } from "lucide-react";

// /* =========================
//    USER MANAGEMENT (DARK UI)
// ========================= */

// export default function UserManagement() {
//     const [users, setUsers] = useState([]);
//     const [selectedUser, setSelectedUser] = useState(null);
//     const [showModal, setShowModal] = useState(false);
//     const [isEditing, setIsEditing] = useState(false);
//     const [companyId, setCompanyId] = useState(null);

//     const [formData, setFormData] = useState({
//         employeeId: "",
//         name: "",
//         email: "",
//         phone: "",
//         role: "",
//         plan: "basic",
//         salary: "",
//         designation: "",
//         department: "",
//         joiningDate: "",
//         photoUrl: "",
//         isActive: true,
//     });

//     useEffect(() => {
//         const stored = localStorage.getItem("adminUser");

//         if (stored) {
//             const user = JSON.parse(stored);
//             setCompanyId(user.companyDocId);
//         }
//     }, []);

//     const [planLimit, setPlanLimit] = useState({
//         basic: 0,
//         pro: 0,
//         enterprise: 0,
//     });

//     const fetchPlan = async () => {
//         if (!companyId) return;

//         const docRef = doc(db, "Companies", companyId);
//         const snap = await getDoc(docRef);

//         if (snap.exists()) {
//             setPlanLimit(snap.data().planDistribution || {});
//         }
//     }


//     const fetchUsers = async () => {
//         if (!companyId) return; // 🔥 important

//         const userCollection = collection(
//             db,
//             "Companies",
//             companyId,
//             "Usermanagement"
//         );

//         const snapshot = await getDocs(userCollection);
//         const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

//         setUsers(list);
//         setSelectedUser((prev) => {
//             // 1. keep previous if still exists
//             if (prev) {
//               const stillExists = list.find((u) => u.id === prev.id);
//               if (stillExists) return stillExists;
//             }
          
//             // 2. select first ACTIVE user
//             const activeUser = list.find((u) => u.isActive !== false);
//             if (activeUser) return activeUser;
          
//             // 3. fallback first user
//             return list[0] || null;
//           });
//     };

//     // const fetchUsers = async () => {
//     //     const snapshot = await getDocs(userCollection);
//     //     const list = snapshot.docs
//     //         .map((d) => ({ id: d.id, ...d.data() }))
//     //         .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

//     //     setUsers(list);
//     //     if (list.length > 0) setSelectedUser(list[0]);
//     // };

//     useEffect(() => {
//         if (!companyId) return;

//         fetchUsers();
//         fetchPlan();
//     }, [companyId]);

//     const resetForm = () => {
//         setFormData({
//             employeeId: "",
//             password: "",
//             name: "",
//             email: "",
//             phone: "",
//             role: "",
//             salary: "",
//             designation: "",
//             department: "",
//             joiningDate: "",
//             isActive: true,
//         });
//     };

//     const handleAddUser = async () => {
//         if (!companyId) {
//             alert("Company not found. Please login again.");
//             return;
//         }

//         const userCollection = collection(
//             db,
//             "Companies",
//             companyId,
//             "Usermanagement"
//         );

//         if (!formData.employeeId || !formData.name || !formData.email || !formData.role) {
//             alert("Please fill required fields");
//             return;
//         }

//         const selectedPlan = formData.plan || "basic";

//         // count existing users by plan
//         const planCount = {
//             basic: 0,
//             pro: 0,
//             enterprise: 0,
//           };
          
//           users.forEach((u) => {
//             if (u.plan && u.isActive !== false) {
//               planCount[u.plan]++;
//             }
//           });

//         if (planCount[selectedPlan] >= planLimit[selectedPlan]) {
//             alert(`❌ ${selectedPlan} plan limit reached`);
//             return;
//         }

//         const enteredId = formData.employeeId.trim().toLowerCase();

//         // 🔍 check duplicate
//         const exists = users.some(
//             (u) => u.employeeId?.toLowerCase() === enteredId
//         );

//         if (exists) {
//             alert("❌ Employee ID already exists");
//             return;
//         }

//         await addDoc(userCollection, {
//             employeeId: formData.employeeId.trim().toLowerCase(),
//             password: formData.password || "default123",
//             name: formData.name.trim(),
//             email: formData.email.trim(),
//             phone: formData.phone || "",
//             role: formData.role,

//             plan: formData.plan || "basic", // 🔥 FIX

//             salary: Number(formData.salary || 0),
//             designation: formData.designation || "",
//             department: formData.department || "",
//             joiningDate: formData.joiningDate || "",
//             isActive: true,
//             createdAt: serverTimestamp(),
//             updatedAt: serverTimestamp(),
//         });

//         setShowModal(false);
//         resetForm();
//         fetchUsers();
//     };

//     const handleUpdateUser = async () => {
//         if (!selectedUser) return;
//         const enteredId = formData.employeeId.trim().toLowerCase();

//         const exists = users.some(
//             (u) =>
//                 u.employeeId?.toLowerCase() === enteredId &&
//                 u.id !== selectedUser.id
//         );

//         if (exists) {
//             alert("❌ Employee ID already exists");
//             return;
//         }

//         await updateDoc(
//             doc(db, "Companies", companyId, "Usermanagement", selectedUser.id),
//             {
//                 ...formData,
//                 plan: formData.plan,
//                 salary: Number(formData.salary || 0),
//                 updatedAt: serverTimestamp(),
//             }
//         );

//         setShowModal(false);
//         setIsEditing(false);
//         resetForm();
//         fetchUsers();
//     };

//     const handleDisableUser = async (user) => {
//         if (!confirm("Mark this user as inactive?")) return;

//         await updateDoc(
//             doc(db, "Companies", companyId, "Usermanagement", user.id),
//             {
//                 isActive: false,
//                 updatedAt: serverTimestamp(),
//             }
//         );

//         fetchUsers();
//     };

//     const isUserActive = (u) => u?.isActive !== false;

//     return (
//         <>
//             {/* <Navbar /> */}

//             <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-6  text-black mt-4">

//                 {/* LEFT PANEL */}
//                 <div className="bg-white rounded-2xl shadow-lg flex flex-col overflow-hidden border border-gray-200">

//                     <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
//                         <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-800">
//                             <Shield size={20} className="text-blue-500" />
//                             User Management
//                         </h2>

//                         <button
//                             onClick={() => {
//                                 resetForm();
//                                 setIsEditing(false);
//                                 setShowModal(true);
//                             }}
//                             className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
//                         >
//                             <UserPlus size={16} />
//                             Add User
//                         </button>
//                     </div>

//                     <div className="overflow-y-auto h-[calc(100vh-180px)] p-4 bg-gray-50">
//                         <table className="w-full text-sm">

//                             <thead className="bg-gray-100 text-gray-600">
//                                 <tr>
//                                     <th className="px-3 py-2 text-left">Employee</th>
//                                     <th className="px-3 py-2 text-left">Role</th>
//                                     <th className="px-3 py-2 text-center">Actions</th>
//                                 </tr>
//                             </thead>

//                             <tbody>
//                                 {users.map((u) => {
//                                     const active = isUserActive(u);

//                                     return (
//                                         <tr
//                                             key={u.id}
//                                             className="border-b border-gray-200 hover:bg-gray-100 cursor-pointer transition"
//                                             onClick={() => setSelectedUser(u)}
//                                         >
//                                             <td className="px-3 py-3 font-medium text-gray-800">
//                                                 {u.name}
//                                                 <span
//                                                     className={`ml-2 text-xs px-2 py-0.5 rounded-full
//                     ${active
//                                                             ? "bg-green-100 text-green-700"
//                                                             : "bg-red-100 text-red-600"
//                                                         }
//                   `}
//                                                 >
//                                                     {active ? "Active" : "Inactive"}
//                                                 </span>
//                                             </td>

//                                             <td className="px-3 py-3 capitalize text-gray-600">
//                                                 {u.role}
//                                             </td>

//                                             <td className="px-3 py-3 flex justify-center gap-3">
//                                                 <button
//                                                     onClick={(e) => {
//                                                         e.stopPropagation();
//                                                         if (!active) return;
//                                                         setIsEditing(true);
//                                                         setShowModal(true);
//                                                         setSelectedUser(u);
//                                                         setFormData({
//                                                             ...u,
//                                                             isActive: active,
//                                                         });
//                                                     }}
//                                                     disabled={!active}
//                                                     className={`text-blue-500 ${!active
//                                                         ? "opacity-40 cursor-not-allowed"
//                                                         : "hover:text-blue-600"
//                                                         }`}
//                                                 >
//                                                     <Pencil size={16} />
//                                                 </button>

//                                                 <button
//                                                     onClick={(e) => {
//                                                         e.stopPropagation();
//                                                         handleDisableUser(u);
//                                                     }}
//                                                     className="text-red-500 hover:text-red-600"
//                                                 >
//                                                     <Trash2 size={16} />
//                                                 </button>
//                                             </td>
//                                         </tr>
//                                     );
//                                 })}

//                                 {users.length === 0 && (
//                                     <tr>
//                                         <td colSpan={3} className="text-center text-gray-400 py-6">
//                                             No users found
//                                         </td>
//                                     </tr>
//                                 )}
//                             </tbody>

//                         </table>
//                     </div>
//                 </div>

//                 {/* RIGHT PANEL */}
//                 <div className="bg-white rounded-2xl shadow-md p-6 sticky top-6 h-fit border border-gray-200">

//                     {selectedUser ? (
//                         <>
//                             {/* Profile Header */}
//                             <div className="flex items-center gap-5 mb-8">

//                                 <div className="relative w-[110px] h-[110px] rounded-full overflow-hidden border-4 border-white shadow-lg flex items-center justify-center bg-gray-100">

//                                     {selectedUser?.photoUrl ? (
//                                         <Image
//                                             src={selectedUser.photoUrl}
//                                             alt="Profile"
//                                             fill
//                                             className="object-cover"
//                                         />
//                                     ) : (
//                                         <User size={40} className="text-gray-400" />
//                                     )}

//                                 </div>

//                                 <div>
//                                     <h3 className="text-2xl font-semibold text-gray-900">
//                                         {selectedUser.name}
//                                     </h3>

//                                     <p className="text-gray-500 mt-1">
//                                         {selectedUser.designation}
//                                     </p>

//                                     <span
//                                         className={`inline-block mt-2 px-3 py-1 text-sm rounded-full font-medium
//             ${isUserActive(selectedUser)
//                                                 ? "bg-green-100 text-green-700"
//                                                 : "bg-red-100 text-red-600"
//                                             }`}
//                                     >
//                                         {isUserActive(selectedUser) ? "Active" : "Inactive"}
//                                     </span>
//                                 </div>

//                             </div>

//                             {/* Details */}
//                             <div className="space-y-3">

//                                 <Detail
//                                     icon={<IdCard size={18} />}
//                                     label="Employee ID"
//                                     value={selectedUser.employeeId}
//                                     color="bg-blue-100 text-blue-600"
//                                 />

//                                 <Detail
//                                     icon={<Mail size={18} />}
//                                     label="Email"
//                                     value={selectedUser.email}
//                                     color="bg-indigo-100 text-indigo-600"
//                                 />

//                                 <Detail
//                                     icon={<Phone size={18} />}
//                                     label="Phone"
//                                     value={selectedUser.phone}
//                                     color="bg-green-100 text-green-600"
//                                 />

//                                 <Detail
//                                     icon={<Briefcase size={18} />}
//                                     label="Role"
//                                     value={selectedUser.role}
//                                     color="bg-purple-100 text-purple-600"
//                                 />

//                                 <Detail
//                                     icon={<Building size={18} />}
//                                     label="Department"
//                                     value={selectedUser.department}
//                                     color="bg-pink-100 text-pink-600"
//                                 />

//                                 <Detail
//                                     icon={<User size={18} />}
//                                     label="Designation"
//                                     value={selectedUser.designation}
//                                     color="bg-cyan-100 text-cyan-600"
//                                 />

//                                 <Detail
//                                     icon={<BadgeIndianRupee size={18} />}
//                                     label="Salary"
//                                     value={`₹ ${selectedUser.salary}`}
//                                     color="bg-orange-100 text-orange-600"
//                                 />

//                             </div>
//                         </>
//                     ) : (
//                         <p className="text-gray-500 text-center py-10">
//                             Select a user
//                         </p>
//                     )}

//                 </div>

//                 {/* MODAL */}
//                 {showModal && (
//                     <div className="fixed inset-0 bg-[white/80] backdrop-blur-lg flex items-center justify-center z-50">
//                         <div className="bg-[#ECF1FD] p-6 rounded-xl w-[420px] relative shadow-xl border border-gray-200 text-black">
//                             <button
//                                 className="absolute top-3 right-3 text-[#6F7195] hover:text-black"
//                                 onClick={() => setShowModal(false)}
//                             >
//                                 <X />
//                             </button>

//                             <h3 className="text-lg font-semibold mb-4 text-black">
//                                 {isEditing ? "Edit User" : "Add User"}
//                             </h3>

//                             <div className="space-y-3">
//                                 <Input placeholder="Employee ID" value={formData.employeeId} onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })} />
//                                 <Input placeholder="password " value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
//                                 <Input placeholder="Full Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
//                                 <Input placeholder="Email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
//                                 <Input placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
//                                 <Input type="number" placeholder="Salary" value={formData.salary} onChange={(e) => setFormData({ ...formData, salary: e.target.value })} />
//                                 <Input placeholder="Designation" value={formData.designation} onChange={(e) => setFormData({ ...formData, designation: e.target.value })} />
//                                 <Input placeholder="Department" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} />
//                                 <Input type="date" value={formData.joiningDate} onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })} />

//                                 <select
//                                     value={formData.plan}
//                                     onChange={(e) =>
//                                         setFormData({ ...formData, plan: e.target.value })
//                                     }
//                                     className="bg-[#F8F9FD] text-black border rounded-lg px-4 py-2 w-full"
//                                 >
//                                     <option value="basic">Basic</option>
//                                     <option value="pro">Pro</option>
//                                     <option value="enterprise">Enterprise</option>
//                                 </select>

//                                 <select
//                                     value={formData.role}
//                                     onChange={(e) => setFormData({ ...formData, role: e.target.value })}
//                                     className="bg-[#F8F9FD] text-black border border-white rounded-lg px-4 py-2 w-full"
//                                 >
//                                     <option value="">Select Role</option>
//                                     <option value="user">User</option>
//                                     <option value="manager">Manager</option>
//                                     <option value="accountant">Accountant</option>
//                                 </select>

//                                 <select
//                                     value={formData.isActive !== false ? "active" : "inactive"}
//                                     onChange={(e) =>
//                                         setFormData({
//                                             ...formData,
//                                             isActive: e.target.value === "active",
//                                         })
//                                     }
//                                     className="bg-[#F8F9FD] text-black border border-whit rounded-lg px-4 py-2 w-full"
//                                 >
//                                     <option value="active">Active</option>
//                                     <option value="inactive">Inactive</option>
//                                 </select>

//                                 <button
//                                     onClick={isEditing ? handleUpdateUser : handleAddUser}
//                                     className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg"
//                                 >
//                                     {isEditing ? "Update User" : "Add User"}
//                                 </button>
//                             </div>
//                         </div>
//                     </div>
//                 )}
//             </div>
//         </>
//     );
// }

// /* =========================
//    SMALL COMPONENTS (DARK)
// ========================= */

// function Detail({ icon, label, value, color }) {
//     return (
//         <div className="flex items-center justify-between bg-[#F8F9FD] rounded-xl px-4 py-3">

//             <div className="flex items-center gap-3">

//                 <div className={`w-9 h-9 flex items-center justify-center rounded-full ${color}`}>
//                     {icon}
//                 </div>

//                 <span className="text-gray-600 font-medium">{label}</span>

//             </div>

//             <span className="font-semibold text-gray-900">{value}</span>

//         </div>
//     );
// }

// function Input({ placeholder, value, onChange, type = "text" }) {
//     return (
//         <input
//             type={type}
//             placeholder={placeholder}
//             value={value || ""}
//             onChange={onChange}
//             className="bg-[#F8F9FD] text-black border border-white rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-500 outline-none"
//         />
//     );
// }

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/app/(auth)/context/AuthContext";

import employeeService from "@/app/allservice/employee/employeeService";

import EmployeeStats from "./components/EmployeeStats";
import EmployeeToolbar from "./components/EmployeeToolbar";
import EmployeeList from "./components/EmployeeList";
import RoleManagement from "./components/RoleManagement";

export default function EmployeePage() {

    const router = useRouter();

    const { company } = useAuth();

    const [loading, setLoading] = useState(true);

    const [employees, setEmployees] = useState([]);

    const [search, setSearch] = useState("");

    const [department, setDepartment] = useState("All");

    const [role, setRole] = useState("All");

    const [status, setStatus] = useState("All");

    const [view, setView] = useState("employees");

    useEffect(() => {

        if (!company) return;

        loadEmployees();

    }, [company]);

    async function loadEmployees() {

        try {

            setLoading(true);

            const data = await employeeService.getEmployees(

                company.id

            );

            setEmployees(data);

        }

        finally {

            setLoading(false);

        }

    }

    const departments = useMemo(() => {

        return [

            ...new Set(

                employees.map(

                    (e) => e.department

                )

            ),

        ];

    }, [employees]);

    const roles = useMemo(() => {

        return [

            ...new Set(

                employees.map(

                    (e) => e.role

                )

            ),

        ];

    }, [employees]);

    const filteredEmployees = useMemo(() => {

        return employees.filter((employee) => {

            const keyword = search.toLowerCase();

            const matchesSearch =

                employee.fullName

                    ?.toLowerCase()

                    .includes(keyword)

                ||

                employee.employeeId

                    ?.toLowerCase()

                    .includes(keyword)

                ||

                employee.email

                    ?.toLowerCase()

                    .includes(keyword)

                ||

                employee.phone

                    ?.includes(keyword);

            const matchesDepartment =

                department === "All"

                ||

                employee.department === department;

            const matchesRole =

                role === "All"

                ||

                employee.role === role;

            const matchesStatus =

                status === "All"

                ||

                employee.status === status;

            return (

                matchesSearch &&

                matchesDepartment &&

                matchesRole &&

                matchesStatus

            );

        });

    }, [

        employees,

        search,

        department,

        role,

        status,

    ]);

    return (

        <div className="space-y-6">

            {/* Header */}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

                <h1 className="text-3xl font-bold">

                    Employees

                </h1>

                <p className="text-slate-500 mt-1">

                    Manage your company's workforce

                </p>

                <div className="flex gap-2 rounded-2xl bg-white p-1.5"><button onClick={() => setView("employees")} className={`rounded-xl px-4 py-2 text-sm font-bold ${view === "employees" ? "bg-blue-600 text-white" : "text-slate-500"}`}>Employees</button><button onClick={() => setView("roles")} className={`rounded-xl px-4 py-2 text-sm font-bold ${view === "roles" ? "bg-blue-600 text-white" : "text-slate-500"}`}>Roles & Permissions</button></div>
            </div>

            {view === "roles" ? <RoleManagement /> : <>

            {/* Stats */}

            <EmployeeStats

                employees={employees}

            />

            {/* Toolbar */}

            <EmployeeToolbar

                search={search}
                setSearch={setSearch}

                department={department}
                setDepartment={setDepartment}

                role={role}
                setRole={setRole}

                status={status}
                setStatus={setStatus}

                departments={departments}

                roles={roles}

            />

            {/* Employee List */}

            <EmployeeList

                loading={loading}

                employees={filteredEmployees}

            />

            </>}

        </div>

    );

}
