"use client";



import {

    FolderKanban,

    Building2,

    User,

    Calendar,

    Flag,

    Briefcase,

    FileText,

    BadgeIndianRupee,

} from "lucide-react";



const neoShadow =

    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";



const input =

    `${neoShadow}

w-full

h-12

rounded-2xl

bg-[#F9FAFC]

border

border-white

px-4

outline-none

focus:ring-2

focus:ring-blue-200

transition`;



function Label({ icon: Icon, children }) {

    return (

        <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-600">

            <Icon size={16} />

            {children}

        </label>

    );

}



export default function ProjectInfoStep({



    form,



    updateField,



    clients = [],



    managers = [],



}) {



    return (



        <div className="space-y-8">



            {/* ===================================================== */}

            {/* Project Information */}

            {/* ===================================================== */}



            <section className={` px-6 py-2`}>



                <h3 className="mb-8 text-2xl font-bold text-slate-800">



                    Project Information



                </h3>



                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">



                    {/* LEFT */}



                    <div className="space-y-6">



                        <div>



                            <Label icon={FolderKanban}>

                                Project Name

                            </Label>



                            <input

                                value={form.projectName}

                                onChange={(e) =>

                                    updateField("projectName", e.target.value)

                                }

                                className={input}

                                placeholder="Enter project name"

                            />



                        </div>



                        <div>



                            <Label icon={Building2}>

                                Client

                            </Label>



                            <select

                                value={form.clientId}

                                onChange={(e) => {



                                    const selected = clients.find(

                                        c => c.id === e.target.value

                                    );



                                    updateField("clientId", selected?.id || "");

                                    updateField("clientName", selected?.clientName || "");



                                }}

                                className={input}

                            >



                                <option value="">

                                    Select Client

                                </option>



                                {clients.map(client => (



                                    <option

                                        key={client.id}

                                        value={client.id}

                                    >



                                        {client.clientName}



                                    </option>



                                ))}



                            </select>



                        </div>

                        <div>
                            <Label icon={Briefcase}>Execution Model</Label>
                            <select value={form.executionModel} onChange={(e) => updateField("executionModel", e.target.value)} className={input}>
                                <option value="inhouse">In-house</option>
                                <option value="outsourced">Outsourced</option>
                                <option value="hybrid">Hybrid</option>
                            </select>
                        </div>



                        <div>



                            {/* <Label icon={User}>

                                Project Manager

                            </Label>



                            <select

                                value={form.managerId}

                                onChange={(e) => {



                                    const manager = managers.find(

                                        m => m.id === e.target.value

                                    );



                                    updateField("managerId", manager?.id || "");

                                    updateField("managerName", manager?.fullName || "");



                                }}

                                className={input}

                            >



                                <option value="">

                                    Select Manager

                                </option>



                                {managers.map(manager => (



                                    <option

                                        key={manager.id}

                                        value={manager.id}

                                    >



                                        {manager.fullName}



                                    </option>



                                ))}



                            </select> */}



                        </div>



                    </div>



                    {/* RIGHT */}



                    <div className="space-y-6">



                        <div>



                            <Label icon={BadgeIndianRupee}>

                                PO Amount

                            </Label>



                            <input

                                type="number"

                                value={form.poAmount}

                                onChange={(e) =>

                                    updateField("poAmount", e.target.value)

                                }

                                className={input}

                                placeholder="0"

                            />



                        </div>



                        <div>



                            <Label icon={BadgeIndianRupee}>

                                Budget

                            </Label>



                            <input

                                type="number"

                                value={form.budget}

                                onChange={(e) =>

                                    updateField("budget", e.target.value)

                                }

                                className={input}

                                placeholder="0"

                            />



                        </div>



                        <div>



                            <Label icon={Briefcase}>

                                Status

                            </Label>



                            <select

                                value={form.status}

                                onChange={(e) =>

                                    updateField("status", e.target.value)

                                }

                                className={input}

                            >



                                <option>Pending</option>

                                <option>Running</option>

                                <option>Completed</option>

                                <option>On Hold</option>



                            </select>



                        </div>



                    </div>



                </div>



            </section>



            {/* ===================================================== */}

            {/* Timeline & Description */}

            {/* ===================================================== */}



            <section className={`px-6 py-2`}>



                <h3 className="mb-8 text-2xl font-bold text-slate-800">



                    Timeline & Description



                </h3>



                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">



                    {/* LEFT */}



                    <div className="space-y-6">



                        <div>



                            <Label icon={Calendar}>

                                Start Date

                            </Label>



                            <input

                                type="date"

                                value={form.startDate}

                                onChange={(e) =>

                                    updateField("startDate", e.target.value)

                                }

                                className={input}

                            />



                        </div>



                        <div>



                            <Label icon={Calendar}>

                                End Date

                            </Label>



                            <input

                                type="date"

                                value={form.endDate}

                                onChange={(e) =>

                                    updateField("endDate", e.target.value)

                                }

                                className={input}

                            />



                        </div>



                    </div>



                    {/* RIGHT */}



                    <div>



                        <Label icon={FileText}>

                            Project Description

                        </Label>



                        <textarea

                            rows={1}

                            value={form.description}

                            onChange={(e) =>

                                updateField("description", e.target.value)

                            }

                            className={`${input} h-full min-h-[50px] resize-none py-4`}

                            placeholder="Describe the project scope, objectives and notes..."

                        />



                    </div>



                </div>



            </section>



        </div>



    );



}
