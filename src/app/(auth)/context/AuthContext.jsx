"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { onIdTokenChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { resolveAccess, can as hasPermission } from "@/app/allservice/rbac/AuthorizationService";

const AuthContext = createContext(null);
const invalidSession = (message) => Object.assign(new Error(message), { code: "auth/invalid-session" });
const isInvalidSession = (error) => [
  "auth/invalid-session", "auth/user-disabled", "auth/user-not-found", "auth/user-token-expired",
  "auth/invalid-user-token", "auth/id-token-revoked", "auth/id-token-expired",
  "permission-denied", "unauthenticated", "firestore/permission-denied", "firestore/unauthenticated",
].includes(error?.code);
// Firestore reads produce new objects even when their contents are unchanged.
const retainUnchanged = (previous, next) => JSON.stringify(previous) === JSON.stringify(next) ? previous : next;

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [companyEmployee, setCompanyEmployee] = useState(null);
  const [access, setAccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [authError, setAuthError] = useState(null);
  const validatedIdentity = useRef(null);
  const requestVersion = useRef(0);
  const mounted = useRef(false);

  const clearSession = useCallback(() => {
    validatedIdentity.current = null;
    setCurrentUser(null); setCompany(null); setCompanyEmployee(null); setAccess(null);
  }, []);

  const revalidate = useCallback(async (user) => {
    const version = ++requestVersion.current;
    const isCurrent = () => mounted.current && version === requestVersion.current && auth.currentUser?.uid === user?.uid;
    if (!user) {
      clearSession(); setFirebaseUser(null); setAuthError(null); setLoading(false); setValidating(false);
      return false;
    }
    const background = validatedIdentity.current?.uid === user.uid;
    if (!background) { clearSession(); setLoading(true); }
    setFirebaseUser((previous) => previous?.uid === user.uid ? previous : user);
    setValidating(true); setAuthError(null);
    try {
      let token = await user.getIdToken();
      if (!isCurrent()) return false;
      const response = await fetch("/api/rbac/session", { headers: { Authorization: `Bearer ${token}` } });
      if (!isCurrent()) return false;
      if (response.status === 401 || response.status === 403) throw invalidSession("Session is no longer authorized.");
      if (!response.ok) throw new Error("Session validation is temporarily unavailable. Please retry.");
      const identity = await response.json();
      if (!isCurrent()) return false;
      if (identity.claimsRefreshRequired) {
        token = await user.getIdToken(true);
        if (!isCurrent()) return false;
      }
      const previous = validatedIdentity.current;
      if (previous && (previous.companyId !== identity.companyId || previous.companyEmployeeId !== identity.companyEmployeeId || previous.isOwner !== identity.isOwner)) {
        // A real tenant/employee identity change must never reuse the old workspace.
        clearSession(); setLoading(true);
      }
      const companySnap = await getDoc(doc(db, "Companies", identity.companyId));
      if (!isCurrent()) return false;
      if (!companySnap.exists()) throw invalidSession("Authenticated company not found.");
      const companyData = { id: companySnap.id, ...companySnap.data() };
      if (identity.isOwner && companyData.ownerUid !== user.uid) throw invalidSession("Resolved company is not owned by the authenticated user.");
      let profile;
      if (identity.isOwner) {
        profile = {
          id: user.uid, uid: user.uid, companyId: identity.companyId,
          name: companyData.ownerName || user.displayName || "Owner",
          email: companyData.ownerEmail || user.email || null, phone: companyData.ownerPhone || null,
          role: "owner", accountType: "owner",
        };
      } else {
        const rootUser = await getDoc(doc(db, "Usermanagement", identity.rootUserId));
        if (!isCurrent()) return false;
        if (!rootUser.exists() || rootUser.data()?.uid !== user.uid) throw invalidSession("Authenticated employee profile not found.");
        profile = { id: rootUser.id, ...rootUser.data() };
      }
      const employeeSnap = identity.companyEmployeeId
        ? await getDoc(doc(db, "Companies", identity.companyId, "Usermanagement", identity.companyEmployeeId))
        : null;
      if (!isCurrent()) return false;
      const employee = employeeSnap?.exists() ? { id: employeeSnap.id, ...employeeSnap.data() } : null;
      const roleId = employee?.access?.roleId || profile.role || employee?.employment?.role || "employee";
      const roleSnap = identity.isOwner ? null : await getDoc(doc(db, "Companies", identity.companyId, "Roles", String(roleId).toLowerCase().replace(/[^a-z0-9]+/g, "_")));
      if (!isCurrent()) return false;
      const resolved = resolveAccess({ currentUser: { ...profile, uid: user.uid }, employee, company: companyData, role: roleSnap?.exists() ? roleSnap.data() : null });
      if (resolved.isEmployee && (!resolved.loginEnabled || resolved.status !== "active")) throw invalidSession("Employee access is disabled or inactive.");

      validatedIdentity.current = { uid: user.uid, companyId: identity.companyId, companyEmployeeId: identity.companyEmployeeId, isOwner: identity.isOwner };
      setCurrentUser((previous) => retainUnchanged(previous, { ...profile, uid: user.uid }));
      setCompany((previous) => retainUnchanged(previous, companyData));
      setCompanyEmployee((previous) => retainUnchanged(previous, employee));
      setAccess((previous) => retainUnchanged(previous, resolved));
      setAuthError(null);

      // Auditing is best-effort and must not invalidate a successfully restored session.
      try {
        const sessionKey = `rbac-session-${user.uid}`;
        if (typeof window !== "undefined" && !sessionStorage.getItem(sessionKey)) {
          sessionStorage.setItem(sessionKey, "1");
          fetch("/api/rbac/session/audit", {
            method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown" }),
          }).then((result) => { if (!result.ok) throw new Error("Session audit request failed"); })
            .catch((error) => console.warn("Session audit unavailable:", error));
        }
      } catch (error) { console.warn("Session audit unavailable:", error); }
      return true;
    } catch (error) {
      if (!isCurrent()) return false;
      setAuthError(error);
      if (isInvalidSession(error)) {
        clearSession(); setFirebaseUser(null); setLoading(false); setValidating(false);
        await signOut(auth);
      } else {
        // Preserve the last validated identity on transient network/server failure.
        console.warn("[Auth Restore] validation temporarily unavailable", { code: error?.code, message: error?.message });
      }
      return false;
    } finally {
      if (mounted.current && version === requestVersion.current) { setLoading(false); setValidating(false); }
    }
  }, [clearSession]);

  useEffect(() => {
    mounted.current = true;
    const unsubscribe = onIdTokenChanged(auth, revalidate);
    return () => { mounted.current = false; requestVersion.current += 1; unsubscribe(); };
  }, [revalidate]);

  const refreshUser = useCallback(() => revalidate(auth.currentUser), [revalidate]);
  const logout = useCallback(() => signOut(auth), []);
  const can = useCallback((permission) => hasPermission(access, permission), [access]);
  const hasAnyPermission = useCallback((permissions) => permissions.some((permission) => hasPermission(access, permission)), [access]);
  const hasAllPermissions = useCallback((permissions) => permissions.every((permission) => hasPermission(access, permission)), [access]);
  const value = useMemo(() => ({
    firebaseUser, currentUser, company, companyEmployee, access, employee: companyEmployee,
    permissions: access?.permissions || [], roleId: access?.roleId || null, roleLevel: access?.roleLevel || null,
    isOwner: Boolean(access?.isOwner), isEmployee: Boolean(access?.isEmployee), accountType: access?.accountType || null,
    can, hasPermission: can, hasAnyPermission, hasAllPermissions,
    loading, validating, authError, logout, refreshUser,
  }), [firebaseUser, currentUser, company, companyEmployee, access, can, hasAnyPermission, hasAllPermissions, loading, validating, authError, logout, refreshUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
