// "use client";

// import { useEffect, useMemo, useState } from "react";

// import { useRouter } from "next/navigation";

// import {

//     Search,

//     Filter,

//     Plus,

//     ChevronDown,

// } from "lucide-react";

// import { useAuth } from "@/app/(auth)/context/AuthContext";
// import employeeService from "@/app/allservice/employee/employeeService";

// export default function EmployeeTable() {

//     const router = useRouter();

//     const { company } = useAuth();

//     const [loading, setLoading] = useState(true);

//     const [employees, setEmployees] = useState([]);

//     const [search, setSearch] = useState("");

//     const [department, setDepartment] = useState("All");

//     const [status, setStatus] = useState("All");

//     useEffect(() => {

//         loadEmployees();

//     }, []);

//     async function loadEmployees() {

//         try {

//             setLoading(true);

//             const data = await employeeService.getEmployees(

//                 company.id
            
//             );
            
//             setEmployees(data);

//         }

//         finally {

//             setLoading(false);

//         }

//     }

//     const filteredEmployees = useMemo(() => {

//         return employees.filter((employee) => {

//             const keyword = search.toLowerCase();

//             const matchesSearch =

//                 employee.name?.toLowerCase().includes(keyword) ||

//                 employee.employeeId?.toLowerCase().includes(keyword) ||

//                 employee.email?.toLowerCase().includes(keyword);

//             const matchesDepartment =

//                 department === "All" ||

//                 employee.department === department;

//             const matchesStatus =

//                 status === "All" ||

//                 employee.status === status;

//             return (

//                 matchesSearch &&

//                 matchesDepartment &&

//                 matchesStatus

//             );

//         });

//     }, [

//         employees,

//         search,

//         department,

//         status,

//     ]);

//     return (

//         <div
//             className="
//         rounded-3xl
//         bg-white
//         border
//         border-slate-200
//         shadow-sm
//         overflow-hidden
//       "
//         >

//             {/* ============================
//             TOOLBAR
//       ============================ */}

//             <div
//                 className="
//           p-5
//           border-b
//           border-slate-200
//           flex
//           flex-wrap
//           gap-4
//           justify-between
//           items-center
//         "
//             >

//                 {/* Search */}

//                 <div
//                     className="
//             flex
//             items-center
//             gap-3
//             h-12
//             w-[340px]
//             rounded-xl
//             border
//             border-slate-200
//             px-4
//           "
//                 >

//                     <Search

//                         size={18}

//                         className="text-slate-400"

//                     />

//                     <input

//                         value={search}

//                         onChange={(e) =>

//                             setSearch(e.target.value)

//                         }

//                         placeholder="Search employees..."

//                         className="
//               flex-1
//               outline-none
//               bg-transparent
//             "

//                     />

//                 </div>

//                 {/* Filters */}

//                 <div className="flex gap-3">

//                     <select

//                         value={department}

//                         onChange={(e) =>

//                             setDepartment(e.target.value)

//                         }

//                         className="
//               h-12
//               px-4
//               rounded-xl
//               border
//               border-slate-200
//             "

//                     >

//                         <option>All</option>

//                         <option>Engineering</option>

//                         <option>HR</option>

//                         <option>Finance</option>

//                     </select>

//                     <select

//                         value={status}

//                         onChange={(e) =>

//                             setStatus(e.target.value)

//                         }

//                         className="
//               h-12
//               px-4
//               rounded-xl
//               border
//               border-slate-200
//             "

//                     >

//                         <option>All</option>

//                         <option>Active</option>

//                         <option>Inactive</option>

//                     </select>

//                 </div>

//             </div>

//             {/* ============================
//             TABLE
//       ============================ */}

//             <div className="overflow-x-auto">

//                 <table className="w-full">

//                     <thead>

//                         <tr className="border-b border-slate-200 bg-slate-50">

//                             <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
//                                 Employee
//                             </th>

//                             <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
//                                 Employee ID
//                             </th>

//                             <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
//                                 Department
//                             </th>

//                             <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
//                                 Designation
//                             </th>

//                             <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
//                                 Status
//                             </th>

//                         </tr>

//                     </thead>

//                     <tbody>

//                         {/* ============================
//           Loading
//     ============================ */}

//                         {loading &&

//                             Array.from({ length: 8 }).map((_, index) => (

//                                 <tr
//                                     key={index}
//                                     className="border-b border-slate-100"
//                                 >

//                                     <td className="px-6 py-5">

//                                         <div className="flex items-center gap-4">

//                                             <div className="w-12 h-12 rounded-full bg-slate-200 animate-pulse" />

//                                             <div>

//                                                 <div className="h-4 w-40 rounded bg-slate-200 animate-pulse mb-2" />

//                                                 <div className="h-3 w-28 rounded bg-slate-100 animate-pulse" />

//                                             </div>

//                                         </div>

//                                     </td>

//                                     <td className="px-6">

//                                         <div className="h-4 w-24 rounded bg-slate-200 animate-pulse" />

//                                     </td>

//                                     <td className="px-6">

//                                         <div className="h-4 w-24 rounded bg-slate-200 animate-pulse" />

//                                     </td>

//                                     <td className="px-6">

//                                         <div className="h-4 w-32 rounded bg-slate-200 animate-pulse" />

//                                     </td>

//                                     <td className="px-6">

//                                         <div className="h-7 w-20 rounded-full bg-slate-200 animate-pulse" />

//                                     </td>

//                                 </tr>

//                             ))}

//                         {/* ============================
//           Empty State
//     ============================ */}

//                         {!loading &&
//                             filteredEmployees.length === 0 && (

//                                 <tr>

//                                     <td
//                                         colSpan={5}
//                                         className="py-20"
//                                     >

//                                         <div className="flex flex-col items-center">

//                                             <div
//                                                 className="
//                   w-20
//                   h-20
//                   rounded-full
//                   bg-blue-50
//                   flex
//                   items-center
//                   justify-center
//                 "
//                                             >

//                                                 <Plus
//                                                     size={32}
//                                                     className="text-blue-600"
//                                                 />

//                                             </div>

//                                             <h3 className="mt-6 text-xl font-bold text-slate-700">

//                                                 No Employees Found

//                                             </h3>

//                                             <p className="mt-2 text-slate-500">

//                                                 Create your first employee to get started.

//                                             </p>

//                                             <button

//                                                 onClick={() =>

//                                                     router.push("/manager/userManagement/add")

//                                                 }

//                                                 className="
//                   mt-6
//                   h-11
//                   px-6
//                   rounded-xl
//                   bg-blue-600
//                   text-white
//                   font-semibold
//                   hover:bg-blue-700
//                   transition
//                 "
//                                             >

//                                                 Add Employee

//                                             </button>

//                                         </div>

//                                     </td>

//                                 </tr>

//                             )}

//                         {/* ============================
//           Rows
//     ============================ */}

//                         {!loading &&
//                             filteredEmployees.map((employee) => (

//                                 <tr

//                                     key={employee.id}

//                                     onClick={() =>

//                                         router.push(

//                                             `/manager/employee/${employee.id}`

//                                         )

//                                     }

//                                     className="
//             cursor-pointer
//             border-b
//             border-slate-100
//             hover:bg-blue-50/50
//             transition
//           "
//                                 >

//                                     <td className="px-6 py-5">

//                                         <div className="flex items-center gap-4">

//                                             {employee.photoUrl ? (

//                                                 <img

//                                                     src={employee.photoUrl}

//                                                     alt="Employee"

//                                                     className="
//                     w-12
//                     h-12
//                     rounded-full
//                     object-cover
//                   "

//                                                 />

//                                             ) : (

//                                                 <div
//                                                     className="
//                     w-12
//                     h-12
//                     rounded-full
//                     bg-gradient-to-r
//                     from-blue-600
//                     to-blue-700
//                     flex
//                     items-center
//                     justify-center
//                     text-white
//                     font-bold
//                   "
//                                                 >

//                                                     {employee.name
//                                                         ?.charAt(0)
//                                                         ?.toUpperCase()}

//                                                 </div>

//                                             )}

//                                             <div>

//                                                 <h3 className="font-semibold text-slate-800">

//                                                     {employee.name}

//                                                 </h3>

//                                                 <p className="text-sm text-slate-500">

//                                                     {employee.email}

//                                                 </p>

//                                             </div>

//                                         </div>

//                                     </td>

//                                     <td className="px-6 font-medium">

//                                         {employee.employeeId}

//                                     </td>

//                                     <td className="px-6">

//                                         {employee.department}

//                                     </td>

//                                     <td className="px-6">

//                                         {employee.designation}

//                                     </td>

//                                     <td className="px-6">

//                                         <span
//                                             className={`
//                 inline-flex
//                 items-center
//                 rounded-full
//                 px-3
//                 py-1
//                 text-xs
//                 font-semibold

//                 ${employee.status === "Active"
//                                                     ? "bg-green-100 text-green-700"
//                                                     : "bg-red-100 text-red-600"
//                                                 }
//               `}
//                                         >

//                                             {employee.status}

//                                         </span>

//                                     </td>

//                                 </tr>

//                             ))}

//                     </tbody>

//                 </table>

//             </div>

//         </div>

//     );

// }