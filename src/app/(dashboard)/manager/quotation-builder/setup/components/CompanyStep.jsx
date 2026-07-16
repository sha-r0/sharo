// "use client";

// import {
//     Building2,
//     MapPin,
//     Mail,
//     Phone,
//     Globe,
//     FileText,
//     ArrowLeft,
//     ArrowRight,
// } from "lucide-react";

// const neo =
//     "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

// export default function CompanyStep({

//     form,

//     setForm,

//     next,

//     back,

// }) {

//     function update(key, value) {

//         setForm({

//             ...form,

//             [key]: value,

//         });

//     }

//     return (

//         <div className={`${neo} rounded-3xl bg-[#F9FAFC] p-8`}>

//             <h2 className="text-2xl font-bold">

//                 Company Details

//             </h2>

//             <p className="mt-2 text-slate-500">

//                 These details will appear on every quotation.

//             </p>

//             <div className="mt-8 grid gap-6 md:grid-cols-2">

//                 {/* Company Name */}

//                 <div>

//                     <label className="mb-2 flex items-center gap-2 font-semibold">

//                         <Building2 size={18}/>

//                         Company Name

//                     </label>

//                     <input

//                         value={form.companyName}

//                         onChange={(e)=>update("companyName",e.target.value)}

//                         className="w-full rounded-2xl border border-slate-300 p-4"

//                     />

//                 </div>

//                 {/* GST */}

//                 <div>

//                     <label className="mb-2 flex items-center gap-2 font-semibold">

//                         <FileText size={18}/>

//                         GST Number

//                     </label>

//                     <input

//                         value={form.gst}

//                         onChange={(e)=>update("gst",e.target.value)}

//                         className="w-full rounded-2xl border border-slate-300 p-4"

//                     />

//                 </div>

//                 {/* PAN */}

//                 <div>

//                     <label className="mb-2 font-semibold">

//                         PAN Number

//                     </label>

//                     <input

//                         value={form.pan}

//                         onChange={(e)=>update("pan",e.target.value)}

//                         className="w-full rounded-2xl border border-slate-300 p-4"

//                     />

//                 </div>

//                 {/* CIN */}

//                 <div>

//                     <label className="mb-2 font-semibold">

//                         CIN Number

//                     </label>

//                     <input

//                         value={form.cin}

//                         onChange={(e)=>update("cin",e.target.value)}

//                         className="w-full rounded-2xl border border-slate-300 p-4"

//                     />

//                 </div>

//                 {/* Email */}

//                 <div>

//                     <label className="mb-2 flex items-center gap-2 font-semibold">

//                         <Mail size={18}/>

//                         Email

//                     </label>

//                     <input

//                         type="email"

//                         value={form.email}

//                         onChange={(e)=>update("email",e.target.value)}

//                         className="w-full rounded-2xl border border-slate-300 p-4"

//                     />

//                 </div>

//                 {/* Phone */}

//                 <div>

//                     <label className="mb-2 flex items-center gap-2 font-semibold">

//                         <Phone size={18}/>

//                         Phone

//                     </label>

//                     <input

//                         value={form.phone}

//                         onChange={(e)=>update("phone",e.target.value)}

//                         className="w-full rounded-2xl border border-slate-300 p-4"

//                     />

//                 </div>

//                 {/* Website */}

//                 <div>

//                     <label className="mb-2 flex items-center gap-2 font-semibold">

//                         <Globe size={18}/>

//                         Website

//                     </label>

//                     <input

//                         value={form.website}

//                         onChange={(e)=>update("website",e.target.value)}

//                         className="w-full rounded-2xl border border-slate-300 p-4"

//                     />

//                 </div>

//                 {/* Address */}

//                 <div className="md:col-span-2">

//                     <label className="mb-2 flex items-center gap-2 font-semibold">

//                         <MapPin size={18}/>

//                         Company Address

//                     </label>

//                     <textarea

//                         rows={4}

//                         value={form.address}

//                         onChange={(e)=>update("address",e.target.value)}

//                         className="w-full rounded-2xl border border-slate-300 p-4"

//                     />

//                 </div>

//             </div>

//             <div className="mt-10 flex justify-between">

//                 <button

//                     onClick={back}

//                     className="flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-6 py-3 font-semibold"

//                 >

//                     <ArrowLeft size={18}/>

//                     Back

//                 </button>

//                 <button

//                     onClick={next}

//                     className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-8 py-3 font-semibold text-white hover:bg-indigo-700"

//                 >

//                     Continue

//                     <ArrowRight size={18}/>

//                 </button>

//             </div>

//         </div>

//     );

// }