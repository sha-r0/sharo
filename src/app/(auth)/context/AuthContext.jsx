"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { onIdTokenChanged, signOut } from "firebase/auth";

import {
  doc,
  getDoc,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import { resolveAccess, can as hasPermission } from "@/app/allservice/rbac/AuthorizationService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {

  const [firebaseUser, setFirebaseUser] = useState(null);

  const [currentUser, setCurrentUser] = useState(null);

  const [company, setCompany] = useState(null);

  const [companyEmployee, setCompanyEmployee] = useState(null);

  const [access, setAccess] = useState(null);

  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const loadCurrentUser = async (uid) => {

    try {

      // ============================
      // Usermanagement
      // ============================

      const token = await auth.currentUser.getIdToken();
      const identityResponse = await fetch("/api/rbac/session", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!identityResponse.ok) {

        setCurrentUser(null);
        setCompany(null);
        setCompanyEmployee(null);
        setAccess(null);

        return false;

      }

      const identity = await identityResponse.json();

      // ============================
      // Company
      // ============================

      const companyPath = `Companies/${identity.companyId}`;
      console.info(`[Auth Restore] ${identity.isOwner ? "OWNER" : "EMPLOYEE"} GET START ${companyPath}`);
      let companySnap;
      try {
        companySnap = await getDoc(doc(db, "Companies", identity.companyId));
        console.info(`[Auth Restore] ${identity.isOwner ? "OWNER" : "EMPLOYEE"} GET SUCCESS ${companyPath}`);
      } catch (error) {
        console.error(`[Auth Restore] FAILED GET ${companyPath}`, {
          uid,
          code: error?.code,
          message: error?.message,
        });
        error.authRestoreLogged = true;
        throw error;
      }

      if (companySnap.exists()) {
        const companyData = {

          id: companySnap.id,

          ...companySnap.data(),

        };

        if (identity.isOwner && companyData.ownerUid !== uid) {
          throw new Error("Resolved company is not owned by the authenticated user.");
        }

        let user;
        if (identity.isOwner) {
          user = {
            id: uid,
            uid,
            companyId: identity.companyId,
            name: companyData.ownerName || auth.currentUser.displayName || "Owner",
            email: companyData.ownerEmail || auth.currentUser.email || null,
            phone: companyData.ownerPhone || null,
            role: "owner",
            accountType: "owner",
          };
        } else {
          const userPath = `Usermanagement/${identity.rootUserId}`;
          console.info(`[Auth Restore] EMPLOYEE GET START ${userPath}`);
          let userDoc;
          try {
            userDoc = await getDoc(doc(db, "Usermanagement", identity.rootUserId));
            console.info(`[Auth Restore] EMPLOYEE GET SUCCESS ${userPath}`);
          } catch (error) {
            console.error(`[Auth Restore] FAILED GET ${userPath}`, {
              uid,
              code: error?.code,
              message: error?.message,
            });
            error.authRestoreLogged = true;
            throw error;
          }
          if (!userDoc.exists() || userDoc.data()?.uid !== uid) {
            throw new Error("Authenticated employee profile not found.");
          }
          user = { id: userDoc.id, ...userDoc.data() };
        }

        const employeeSnap = identity.companyEmployeeId
          ? await getDoc(doc(db, "Companies", identity.companyId, "Usermanagement", identity.companyEmployeeId))
          : null;
        const employee = employeeSnap?.exists()
          ? { id: employeeSnap.id, ...employeeSnap.data() }
          : null;
        const roleId = employee?.access?.roleId || user.role || employee?.employment?.role || "employee";
        const roleSnap = identity.isOwner
          ? null
          : await getDoc(doc(db, "Companies", identity.companyId, "Roles", String(roleId).toLowerCase().replace(/[^a-z0-9]+/g, "_")));
        const resolved = resolveAccess({ currentUser: { ...user, uid }, employee, company: companyData, role: roleSnap?.exists() ? roleSnap.data() : null });

        setCurrentUser({ ...user, uid });
        setCompany(companyData);
        setCompanyEmployee(employee);
        setAccess(resolved);
        setAuthError(null);

        const sessionKey = `rbac-session-${uid}`;
        if (typeof window !== "undefined" && !sessionStorage.getItem(sessionKey)) {
          sessionStorage.setItem(sessionKey, "1");
          fetch("/api/rbac/session/audit", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown" }),
          }).then((response) => {
            if (!response.ok) throw new Error("Session audit request failed");
          }).catch((error) => console.warn("Session audit unavailable:", error));
        }

      } else {

        setCompany(null);
        setCompanyEmployee(null);
        setAccess(null);

        return false;

      }

      return true;

    } catch (error) {

      if (!error?.authRestoreLogged) {
        console.error("[Auth Restore] FAILED", {
          uid,
          code: error?.code,
          message: error?.message,
        });
      }
      setAuthError(error);
      setCurrentUser(null);
      setCompany(null);
      setCompanyEmployee(null);
      setAccess(null);
      return false;

    }

  };

  useEffect(() => {

    const unsubscribe = onIdTokenChanged(
      auth,
      async (user) => {

        setLoading(true);

        setFirebaseUser(user);

        if (!user) {

          setCurrentUser(null);

          setCompany(null);
          setCompanyEmployee(null);
          setAccess(null);

          setLoading(false);

          return;

        }

        await loadCurrentUser(user.uid);

        setLoading(false);

      }
    );

    return () => unsubscribe();

  }, []);

  const refreshUser = async () => {

    if (!firebaseUser) return;

    return loadCurrentUser(firebaseUser.uid);

  };

  return (

    <AuthContext.Provider
      value={{

        firebaseUser,

        currentUser,

        company,

        companyEmployee,

        access,

        employee: companyEmployee,

        permissions: access?.permissions || [],

        roleId: access?.roleId || null,

        roleLevel: access?.roleLevel || null,

        isOwner: Boolean(access?.isOwner),

        isEmployee: Boolean(access?.isEmployee),

        accountType: access?.accountType || null,

        can: (permission) => hasPermission(access, permission),

        hasPermission: (permission) => hasPermission(access, permission),

        hasAnyPermission: (permissions) => permissions.some((permission) => hasPermission(access, permission)),

        hasAllPermissions: (permissions) => permissions.every((permission) => hasPermission(access, permission)),

        loading,

        authError,

        logout: () => signOut(auth),

        refreshUser,

      }}
    >

      {children}

    </AuthContext.Provider>

  );

}

export function useAuth() {

  return useContext(AuthContext);

}
