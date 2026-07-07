"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

import {
    User,
    Mail,
    Phone,
    Calendar,
    Building2,
    Briefcase,
    IndianRupee,
    Landmark,
    MapPin,
    Camera,
    Eye,
    EyeOff,
    Save,
    X,
} from "lucide-react";

import Input from "./ui/Input";
import Select from "./ui/Select";
import PasswordInput from "./ui/PasswordInput";
import FileUpload from "./ui/FileUpload";
import Textarea from "./ui/Textarea";
import { useAuth } from "@/app/(auth)/context/AuthContext";
import employeeService from "@/app/allservice/employee/employeeService";

export default function EmployeeForm({ mode = "create", employee = null, }) {

    const router = useRouter();

    const { company, currentUser } = useAuth();

    const [showPassword, setShowPassword] = useState(false);

    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({

        employeeId: "",

        firestoreId: "",

        createdAt: null,

        /* ================= BASIC ================= */

        photo: null,

        firstName: "",

        lastName: "",

        email: "",

        phone: "",

        password: "",

        confirmPassword: "",

        gender: "",

        dob: "",

        /* ================= EMPLOYMENT ================= */

        department: "",

        designation: "",

        role: "Employee",

        joiningDate: "",

        employeeType: "Permanent",

        shift: "",

        /* ================= SALARY ================= */

        salaryStructure: {

            ctc: "",

            grossSalary: "",

            basicSalary: "",

            hra: "",

            otherAllowance: "",

            includePf: true,

            employeePfPercent: 12,

            employerPfPercent: 12,

            includeEsi: false,

            employeeEsiPercent: 0.75,

            employerEsiPercent: 3.25,

        },

        /* ================= BANK ================= */

        bankDetails: {

            bankName: "",

            accountNumber: "",

            ifsc: "",

            branch: "",

            accountHolderName: "",

            upi: "",

        },

        /* ================= ADDRESS ================= */

        address: {

            addressLine: "",

            city: "",

            state: "",

            country: "India",

            pincode: "",

        },
        /* ================= DOCUMENTS ================= */

        documents: {

            photo: null,

            governmentId: {

                type: "Aadhaar Card",

                number: "",

                file: null,

            },

            resume: null,

        },

    });

    /* ==========================================
    Prefill Form (Edit Mode)
========================================== */

    useEffect(() => {

        if (

            mode !== "edit" ||

            !employee

        ) {

            return;

        }

        setForm({

            employeeId:

                employee.employeeId,

            firestoreId:

                employee.firestoreId,

            createdAt:

                employee.createdAt,

            /* ===========================
               Personal
            =========================== */

            firstName:
                employee.personalInfo?.firstName || "",

            lastName:
                employee.personalInfo?.lastName || "",

            email:
                employee.personalInfo?.email || "",

            phone:
                employee.personalInfo?.phone || "",

            gender:
                employee.personalInfo?.gender || "",

            dob:
                employee.personalInfo?.dob || "",

            /* ===========================
               Employment
            =========================== */

            department:
                employee.employment?.department || "",

            designation:
                employee.employment?.designation || "",

            role:
                employee.employment?.role || "Employee",

            employeeType:
                employee.employment?.employeeType || "Permanent",

            joiningDate:
                employee.employment?.joiningDate || "",

            shift:
                employee.employment?.shift || "",

            /* ===========================
               Salary
            =========================== */

            salaryStructure: {

                ...employee.salaryStructure,

            },

            /* ===========================
               Bank
            =========================== */

            bankDetails: {

                ...employee.bankDetails,

            },

            /* ===========================
               Address
            =========================== */

            address: {

                ...employee.address,

            },

            /* ===========================
               Documents
            =========================== */

            documents: {

                photo:
                    null,

                resume:
                    null,

                governmentId: {

                    type:
                        employee.documents?.governmentId?.type || "Aadhaar Card",

                    number:
                        employee.documents?.governmentId?.number || "",

                    file:
                        null,

                },

                /* Existing URLs */

                photoUrl:
                    employee.documents?.photoUrl || "",

                resumeUrl:
                    employee.documents?.resumeUrl || "",

                governmentIdUrl:
                    employee.documents?.governmentId?.fileUrl || "",

            },

            /* ===========================
               Login
            =========================== */

            password:
                employee.login?.password || "",

        });

    }, [

        mode,

        employee,

    ]);

    function updateField(path, value) {

        setForm((prev) => {

            const updated = { ...prev };

            const keys = path.split(".");

            let current = updated;

            for (let i = 0; i < keys.length - 1; i++) {

                current[keys[i]] = { ...current[keys[i]] };

                current = current[keys[i]];

            }

            current[keys[keys.length - 1]] = value;

            return updated;

        });

    }

    function handlePhoto(e) {

        const file = e.target.files?.[0];

        if (!file) return;

        updateField("photo", file);

    }

    async function handleSubmit(e) {

        e.preventDefault();

        if (!company) {

            toast.error("Company not loaded.");

            return;

        }

        setLoading(true);

        try {

            const loadingToast = toast.loading(
                "Creating employee..."
            );

            let result;

            if (mode === "create") {

                result =
                    await employeeService.create(

                        company.id,

                        form

                    );

            }

            else {

                result =
                    await employeeService.update(

                        company.id,

                        employee.firestoreId,

                        form

                    );

            }

            if (!result.success) {

                toast.error(

                    result.errors
                        ? Object.values(result.errors).join("\n")
                        : result.message,

                    {
                        id: loadingToast,
                    }

                );

                return;

            }

            toast.success(
                result.message,
                {
                    id: loadingToast,
                }
            );

            router.push("/manager/userManagement");

        }

        catch (error) {

            console.error(error);

            toast.error(
                "Something went wrong.",
                {
                    id: loadingToast,
                }
            );

        }

        finally {

            setLoading(false);

        }

    }

    return (

        <form onSubmit={handleSubmit} className="space-y-8">

            {/* ====================================== BASIC INFORMATION ====================================== */}

            <div className="bg-white rounded-3xl border border-slate-200 p-8">

                <h2 className="text-xl font-bold text-slate-800">
                    Basic Information
                </h2>

                <p className="text-slate-500 mb-8">
                    Personal details of employee
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    <Input
                        label="Full Name"
                        icon={User}
                        required
                        value={form.firstName}
                        placeholder="Enter first name"
                        onChange={(value) => updateField("firstName", value)}
                    />

                    <Input
                        label="Last Name"
                        icon={User}
                        required
                        value={form.lastName}
                        placeholder="Enter last name"
                        onChange={(value) => updateField("lastName", value)}
                    />

                    <Input
                        label="Email"
                        icon={Mail}
                        type="email"
                        required
                        value={form.email}
                        placeholder="Enter email"
                        helperText="Used for employee login"
                        onChange={(value) => updateField("email", value)}
                    />

                    <Input
                        label="Phone Number"
                        icon={Phone}
                        required
                        value={form.phone}
                        placeholder="Enter phone number"
                        prefix="+91"
                        onChange={(value) => updateField("phone", value)}
                    />

                    <PasswordInput
                        label="Password"
                        required
                        value={form.password}
                        onChange={(value) => updateField("password", value)}
                    />

                    <PasswordInput
                        label="Confirm Password"
                        required
                        value={form.confirmPassword}
                        onChange={(value) => updateField("confirmPassword", value)}
                    />

                    <Select
                        label="Gender"
                        icon={User}
                        value={form.gender}
                        placeholder="Select Gender"
                        options={[
                            "Male",
                            "Female",
                            "Other",
                        ]}
                        onChange={(value) => updateField("gender", value)}
                    />

                    <Input
                        label="Date of Birth"
                        icon={Calendar}
                        type="date"
                        value={form.dob}
                        onChange={(value) => updateField("dob", value)}
                    />

                </div>

            </div>

            {/* ====================================== EMPLOYMENT INFORMATION ====================================== */}

            <div className="bg-white rounded-3xl border border-slate-200 p-8">

                <h2 className="text-xl font-bold text-slate-800">
                    Employment Information
                </h2>

                <p className="text-slate-500 mb-8">
                    Employee role and organization details
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Department */}

                    <Input
                        label="Department"
                        icon={Building2}
                        required
                        value={form.department}
                        placeholder="Engineering"
                        onChange={(value) => updateField("department", value)}
                    />

                    {/* Designation */}

                    <Input
                        label="Designation"
                        icon={Briefcase}
                        required
                        value={form.designation}
                        placeholder="Site Engineer"
                        onChange={(value) => updateField("designation", value)}
                    />

                    {/* Role */}

                    <Select
                        label="Role"
                        required
                        value={form.role}
                        options={[
                            "Employee",
                            "Manager",
                            "HR",
                            "Admin",
                        ]}
                        onChange={(value) => updateField("role", value)}
                    />

                    {/* Employee Type */}

                    <Select
                        label="Employee Type"
                        value={form.employeeType}
                        options={[
                            "Permanent",
                            "Contract",
                            "Intern",
                            "Consultant",
                        ]}
                        onChange={(value) => updateField("employeeType", value)}
                    />

                    {/* Joining Date */}

                    <Input
                        label="Joining Date"
                        icon={Calendar}
                        type="date"
                        value={form.joiningDate}
                        onChange={(value) => updateField("joiningDate", value)}
                    />

                    {/* Shift */}

                    <Input
                        label="Shift"
                        value={form.shift}
                        placeholder="General Shift"
                        onChange={(value) => updateField("shift", value)}
                    />

                </div>

            </div>

            {/* ====================================== SALARY STRUCTURE ====================================== */}

            <div className="bg-white rounded-3xl border border-slate-200 p-8">

                <h2 className="text-xl font-bold text-slate-800">
                    Salary Structure
                </h2>

                <p className="text-slate-500 mb-8">
                    Configure employee salary details
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                    <Input
                        label="CTC"
                        type="number"
                        prefix="₹"
                        value={form.salaryStructure.ctc}
                        onChange={(value) =>
                            setForm(prev => ({
                                ...prev,
                                salaryStructure: {
                                    ...prev.salaryStructure,
                                    ctc: value
                                }
                            }))
                        }
                    />

                    <Input
                        label="Gross Salary"
                        type="number"
                        prefix="₹"
                        value={form.salaryStructure.grossSalary}
                        onChange={(value) =>
                            setForm(prev => ({
                                ...prev,
                                salaryStructure: {
                                    ...prev.salaryStructure,
                                    grossSalary: value
                                }
                            }))
                        }
                    />

                    <Input
                        label="Basic Salary"
                        type="number"
                        prefix="₹"
                        value={form.salaryStructure.basicSalary}
                        onChange={(value) =>
                            setForm(prev => ({
                                ...prev,
                                salaryStructure: {
                                    ...prev.salaryStructure,
                                    basicSalary: value
                                }
                            }))
                        }
                    />

                    <Input
                        label="HRA"
                        type="number"
                        prefix="₹"
                        value={form.salaryStructure.hra}
                        onChange={(value) =>
                            setForm(prev => ({
                                ...prev,
                                salaryStructure: {
                                    ...prev.salaryStructure,
                                    hra: value
                                }
                            }))
                        }
                    />

                    <Input
                        label="Other Allowance"
                        type="number"
                        prefix="₹"
                        value={form.salaryStructure.otherAllowance}
                        onChange={(value) =>
                            setForm(prev => ({
                                ...prev,
                                salaryStructure: {
                                    ...prev.salaryStructure,
                                    otherAllowance: value
                                }
                            }))
                        }
                    />

                </div>

                <hr className="my-8 text-gray-200" />

                <h3 className="text-lg font-semibold mb-5">
                    Payroll Settings
                </h3>

                <div className="flex gap-10 mb-8">

                    <label className="flex items-center gap-3">

                        <input
                            type="checkbox"
                            checked={form.salaryStructure.includePf}
                            onChange={(e) =>
                                setForm(prev => ({
                                    ...prev,
                                    salaryStructure: {
                                        ...prev.salaryStructure,
                                        includePf: e.target.checked
                                    }
                                }))
                            }
                        />

                        Include PF

                    </label>

                    <label className="flex items-center gap-3">

                        <input
                            type="checkbox"
                            checked={form.salaryStructure.includeEsi}
                            onChange={(e) =>
                                setForm(prev => ({
                                    ...prev,
                                    salaryStructure: {
                                        ...prev.salaryStructure,
                                        includeEsi: e.target.checked
                                    }
                                }))
                            }
                        />

                        Include ESI

                    </label>

                </div>

                {form.salaryStructure.includePf && (

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

                        <Input
                            label="Employee PF %"
                            type="number"
                            suffix="%"
                            value={form.salaryStructure.employeePfPercent}
                            onChange={(value) =>
                                setForm(prev => ({
                                    ...prev,
                                    salaryStructure: {
                                        ...prev.salaryStructure,
                                        employeePfPercent: value
                                    }
                                }))
                            }
                        />

                        <Input
                            label="Employer PF %"
                            type="number"
                            suffix="%"
                            value={form.salaryStructure.employerPfPercent}
                            onChange={(value) =>
                                setForm(prev => ({
                                    ...prev,
                                    salaryStructure: {
                                        ...prev.salaryStructure,
                                        employerPfPercent: value
                                    }
                                }))
                            }
                        />

                    </div>

                )}

                {form.salaryStructure.includeEsi && (

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        <Input
                            label="Employee ESI %"
                            type="number"
                            suffix="%"
                            value={form.salaryStructure.employeeEsiPercent}
                            onChange={(value) =>
                                setForm(prev => ({
                                    ...prev,
                                    salaryStructure: {
                                        ...prev.salaryStructure,
                                        employeeEsiPercent: value
                                    }
                                }))
                            }
                        />

                        <Input
                            label="Employer ESI %"
                            type="number"
                            suffix="%"
                            value={form.salaryStructure.employerEsiPercent}
                            onChange={(value) =>
                                setForm(prev => ({
                                    ...prev,
                                    salaryStructure: {
                                        ...prev.salaryStructure,
                                        employerEsiPercent: value
                                    }
                                }))
                            }
                        />

                    </div>

                )}

            </div>

            {/* ====================================== BANK DETAILS ====================================== */}

            <div className="bg-white rounded-3xl border border-slate-200 p-8">

                <h2 className="text-xl font-bold text-slate-800">
                    Bank Details
                </h2>

                <p className="text-slate-500 mb-8">
                    Employee banking information
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    <Input
                        label="Bank Name"
                        icon={Landmark}
                        required
                        value={form.bankDetails.bankName}
                        placeholder="State Bank of India"
                        onChange={(value) => updateField("bankDetails.bankName", value)}
                    />

                    <Input
                        label="Account Holder Name"
                        value={form.bankDetails.accountHolderName}
                        required
                        placeholder="Account Holder Name"
                        onChange={(value) => updateField("bankDetails.accountHolderName", value)}
                    />

                    <Input
                        label="Account Number"
                        value={form.bankDetails.accountNumber}
                        required
                        placeholder="XXXXXXXXXXXX"
                        onChange={(value) => updateField("bankDetails.accountNumber", value)}
                    />

                    <Input
                        label="IFSC Code"
                        value={form.bankDetails.ifsc}
                        required
                        placeholder="SBIN0001234"
                        onChange={(value) => updateField("bankDetails.ifsc", value)}
                    />

                    <Input
                        label="Branch Name"
                        value={form.bankDetails.branch}
                        required
                        placeholder="Branch Name"
                        onChange={(value) => updateField("bankDetails.branch", value)}
                    />

                    <Input
                        label="UPI ID"
                        value={form.bankDetails.upi}
                        placeholder="name@upi"
                        helperText="Optional"
                        onChange={(value) => updateField("bankDetails.upi", value)}
                    />

                </div>

            </div>

            {/* ====================================== ADDRESS ====================================== */}

            <div className="bg-white rounded-3xl border border-slate-200 p-8">

                <h2 className="text-xl font-bold text-slate-800">
                    Address
                </h2>

                <p className="text-slate-500 mb-8">
                    Employee residential address
                </p>

                <div className="space-y-6">

                    <Textarea
                        label="Address"
                        rows={4}
                        required
                        value={form.address.addressLine}
                        placeholder="Complete Address"
                        onChange={(value) => updateField("address.addressLine", value)}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                        <Input
                            label="City"
                            value={form.address.city}
                            placeholder="City"
                            onChange={(value) => updateField("address.city", value)}
                        />

                        <Input
                            label="State"
                            value={form.address.state}
                            placeholder="State"
                            onChange={(value) => updateField("address.state", value)}
                        />

                        <Input
                            label="Country"
                            value={form.address.country}
                            placeholder="Country"
                            onChange={(value) => updateField("address.country", value)}
                        />

                        <Input
                            label="Pincode"
                            value={form.address.pincode}
                            placeholder="Pincode"
                            onChange={(value) => updateField("address.pincode", value)}
                        />

                    </div>

                </div>

            </div>

            {/* ====================================== DOCUMENTS ====================================== */}

            <div className="bg-white rounded-3xl border border-slate-200 p-8">

                <h2 className="text-xl font-bold text-slate-800">
                    Documents
                </h2>

                <p className="text-slate-500 mb-8">
                    Upload employee documents and profile photo
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">

                    {/* LEFT COLUMN */}

                    <div className="flex flex-col gap-6">

                        <FileUpload
                            label="Profile Photo"
                            file={form.documents.photo}
                            existingUrl={form.documents.photoUrl}
                            existingName="Profile Photo"
                            preview
                            accept="image/*"
                            helperText="JPG, PNG (Max 5 MB)"
                            onChange={(file) => updateField("documents.photo", file)}
                        />

                        <FileUpload
                            label="Resume"
                            file={form.documents.resume}
                            existingUrl={form.documents.resumeUrl}
                            existingName="Resume.pdf"
                            accept=".pdf,.doc,.docx"
                            helperText="PDF, DOC, DOCX"
                            onChange={(file) =>
                                updateField("documents.resume", file)
                            }
                        />

                    </div>

                    {/* RIGHT COLUMN */}

                    <div className="flex flex-col h-full">

                        <Select
                            label="Government ID"
                            value={form.documents.governmentId.type}
                            options={[
                                "Aadhaar Card",
                                "PAN Card",
                                "Passport",
                                "Driving Licence",
                                "Voter ID",
                            ]}
                            onChange={(value) =>
                                updateField("documents.governmentId.type", value)
                            }
                        />

                        <div className="mt-4">

                            <Input
                                label="Document Number"
                                value={form.documents.governmentId.number}
                                placeholder="Document Number"
                                onChange={(value) =>
                                    updateField(
                                        "documents.governmentId.number",
                                        value
                                    )
                                }
                            />

                        </div>

                        <div className="flex-1 mt-4">

                            <FileUpload
                                className="h-full"
                                label="Upload Government ID"
                                file={form.documents.governmentId.file}
                                existingUrl={form.documents.governmentIdUrl}
                                existingName={form.documents.governmentId.type}
                                preview
                                accept=".pdf,.jpg,.jpeg,.png"
                                helperText="PDF, JPG, PNG"
                                onChange={(file) =>
                                    updateField("documents.governmentId.file", file)
                                }
                            />

                        </div>

                    </div>

                </div>

            </div>


            {/* ====================================== FOOTER ====================================== */}

            <div className="bg-white rounded-3xl border border-slate-200 p-6">

                <div className="flex justify-end">

                    <button
                        type="submit"
                        disabled={loading}
                        className="
            h-12
            px-8
            rounded-xl
            bg-gradient-to-r
            from-blue-600
            to-blue-700
            text-white
            font-semibold
            hover:shadow-lg
            transition
            disabled:opacity-50
        "
                    >

                        <Save size={18} className="inline mr-2" />

                        {loading
                            ? mode === "edit"
                                ? "Updating Employee..."
                                : "Creating Employee..."
                            : mode === "edit"
                                ? "Update Employee"
                                : "Create Employee"
                        }

                    </button>

                </div>

            </div>

        </form>

    );

}