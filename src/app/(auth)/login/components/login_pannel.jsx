"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import EmployeeForm from "./employee_form";
import AdminForm from "./admin_form";

import { login } from "../services/loginService";
import { useAuth } from "../../context/AuthContext";

import {
  ShieldCheck,
  User,
  Shield,
  ArrowRight,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";

import { motion } from "framer-motion";


export default function LoginPanel() {

  const router = useRouter();

  const {
    firebaseUser,
    company,
    loading: authLoading,
    refreshUser,
  } = useAuth();

  const [active, setActive] =
    useState("admin");

  const [remember, setRemember] =
    useState(true);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [form, setForm] = useState({

    companyId: "",

    email: "",

    password: "",

    employeeId: "",

  });

  const handleLogin = async () => {

    setError("");
  
    if (!form.companyId.trim()) {
      setError("Please enter Company ID.");
      return;
    }
  
    if (!form.email.trim()) {
      setError("Please enter Email.");
      return;
    }
  
    if (!form.password.trim()) {
      setError("Please enter Password.");
      return;
    }
  
    try {
  
      setLoading(true);
  
      const result = await login({
        companyId: form.companyId,
        email: form.email,
        password: form.password,
        rememberMe: remember,
      });
  
      if (!result.success) {
        setError(result.message);
        return;
      }
  
      await refreshUser();
  
      router.replace(result.redirectTo);
  
    } catch (error) {
  
      console.error(error);
  
      setError(error.message || "Unable to sign in.");
  
    } finally {
  
      setLoading(false);
  
    }
  
  };

  useEffect(() => {

    if (loading) return;

    if (authLoading) return;

    if (!firebaseUser || !company) return;

    if (company.workspaceCompleted) {

      router.replace("/manager");

    } else {

      router.replace("/workspace-creating");

    }

  }, [
    loading,
    authLoading,
    firebaseUser,
    company,
    router,
  ]);

  const neo =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";


  return (
    <div className="w-full">

      {/* Header */}
      <div className="mb-3">

        {/* Badge */}
        <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#f5f5f5] border border-white/80 ${neo}`}>

          <ShieldCheck size={18} className="text-blue-700" />

          <span className="text-sm font-semibold text-blue-700">
            Secure Login Portal
          </span>
        </div>

        {/* Heading */}
        <h1 className="mt-6 text-[38px] font-extrabold leading-tight tracking-[-1px] text-slate-900">
          Welcome Back!
        </h1>

      </div>

      {/* Toggle */}
      <div className={`
        relative
        w-full
        h-[68px]
        rounded-2xl
        bg-[#f5f5f5]
        border
        border-white/80
        ${neo}
        p-2
        flex
      `}
      >
        {/* Sliding Background */}
        <motion.div
          layoutId="loginToggle"
          transition={{
            type: "spring",
            stiffness: 350,
            damping: 30,
          }}
          className={`absolute top-2 bottom-2 w-[calc(50%-8px)] rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 shadow-[0_12px_25px_rgba(37,99,235,.35)]`}
          animate={{
            x: active === "employee" ? 0 : "100%",
          }}
        />

        {/* Employee */}
        <button
          disabled={loading}
          onClick={() => setActive("employee")}
          className="
          relative
          z-10
          flex-1
          flex
          items-center
          justify-center
          gap-3
          rounded-xl
          font-semibold
          transition-colors
        "
        >
          <User
            size={20}
            className={
              active === "employee"
                ? "text-white"
                : "text-slate-500"
            }
          />

          <span
            className={
              active === "employee"
                ? "text-white"
                : "text-slate-700"
            }
          >
            Employee
          </span>
        </button>

        {/* Admin */}
        <button
          disabled={loading}
          onClick={() => setActive("admin")}
          className="
          relative
          z-10
          flex-1
          flex
          items-center
          justify-center
          gap-3
          rounded-xl
          font-semibold
          transition-colors
        "
        >
          <Shield
            size={20}
            className={
              active === "admin"
                ? "text-white"
                : "text-slate-500"
            }
          />

          <span
            className={
              active === "admin"
                ? "text-white"
                : "text-slate-700"
            }
          >
            Admin
          </span>
        </button>
      </div>

      {/* Form */}
      <div className="mt-8">

        {error && (

          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4">

            <div className="flex items-start gap-3">

              <AlertCircle
                size={20}
                className="text-red-600 mt-0.5"
              />

              <div>

                <h3 className="font-semibold text-red-700">

                  Sign In Failed

                </h3>

                <p className="text-red-600 text-sm mt-1">

                  {error}

                </p>

              </div>

            </div>

          </div>

        )}

        {active === "employee" ? (
          <EmployeeForm

            form={form}

            setForm={setForm}

            disabled={loading}

          />
        ) : (
          <AdminForm
            form={form}
            setForm={setForm}
            setError={setError}
            disabled={loading}
          />
        )}

        <div className="mt-6 flex items-center justify-between">

          {/* Remember Me */}

          <button
            type="button"
            disabled={loading}
            onClick={() => setRemember(!remember)}
            className="flex items-center gap-3"
          >
            <div
              className={`
      w-6
      h-6
      rounded-lg
      flex
      items-center
      justify-center
      transition-all
      duration-300
      ${remember
                  ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg"
                  : `bg-[#EEF2F8] ${neo}`
                }
    `}
            >
              {remember && <Check size={15} />}
            </div>

            <span className="text-sm font-medium text-slate-600">
              Remember Me
            </span>
          </button>

          {/* Forgot Password */}

          <button
            type="button"
            onClick={() => router.push("/forgot-password")}
            className="
        text-sm
        font-semibold
        text-blue-600
        hover:text-blue-700
        transition
    "
          >
            Forgot Password?
          </button>

        </div>
        <button
          type="button"
          onClick={handleLogin}
          disabled={loading}
          className={`
        group
        relative
        mt-8
        w-full
        h-16
        rounded-2xl
        overflow-hidden
        bg-gradient-to-r
        from-blue-600
        via-blue-500
        to-blue-700
        text-white
        font-semibold
        text-lg
        ${neo}
        transition-all
        duration-300
        hover:-translate-y-1
        hover:shadow-[0_25px_45px_rgba(37,99,235,.45)]
        active:scale-[0.98]
        disabled:opacity-70
        disabled:cursor-not-allowed
      `}
        >
          {/* Shine Effect */}
          <div
            className="
          absolute
          inset-0
          -translate-x-full
          bg-gradient-to-r
          from-transparent
          via-white/25
          to-transparent
          group-hover:translate-x-full
          transition-transform
          duration-1000
        "
          />

          <span className="relative flex items-center justify-center gap-3">
            {loading ? (

              <>

                <Loader2
                  className="animate-spin"
                  size={22}
                />

                Authenticating...

              </>

            ) : (
              <>
                Sign In

                <ArrowRight
                  size={20}
                  className="
                transition-transform
                duration-300
                group-hover:translate-x-1
              "
                />
              </>
            )}
          </span>
        </button>
      </div>

    </div>
  );
}