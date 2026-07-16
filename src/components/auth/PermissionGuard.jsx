"use client";
import { useAuth } from "@/app/(auth)/context/AuthContext";
export default function PermissionGuard({ permission, fallback = null, children }) { const { can } = useAuth(); return can(permission) ? children : fallback; }
