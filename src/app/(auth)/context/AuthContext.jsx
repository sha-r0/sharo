"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { onAuthStateChanged } from "firebase/auth";

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
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

  const loadCurrentUser = async (uid) => {

    try {

      // ============================
      // Usermanagement
      // ============================

      const userSnap = await getDocs(
        query(
          collection(db, "Usermanagement"),
          where("uid", "==", uid)
        )
      );

      if (userSnap.empty) {

        setCurrentUser(null);
        setCompany(null);
        setCompanyEmployee(null);
        setAccess(null);

        return;

      }

      const user = {

        id: userSnap.docs[0].id,

        ...userSnap.docs[0].data(),

      };

      // ============================
      // Company
      // ============================

      const companySnap = await getDoc(
        doc(db, "Companies", user.companyId)
      );

      if (companySnap.exists()) {
        const companyData = {

          id: companySnap.id,

          ...companySnap.data(),

        };

        const employeeCollection = collection(db, "Companies", user.companyId, "Usermanagement");
        const tokenResult = await auth.currentUser?.getIdTokenResult();
        const claimedEmployeeId = tokenResult?.claims?.companyEmployeeId || user.companyEmployeeId;
        let employeeSnap = claimedEmployeeId ? { empty: false, docs: [await getDoc(doc(db, "Companies", user.companyId, "Usermanagement", claimedEmployeeId))] } : await getDocs(query(employeeCollection, where("access.authUid", "==", uid)));
        if (employeeSnap.docs?.[0] && !employeeSnap.docs[0].exists()) employeeSnap = { empty: true, docs: [] };
        if (employeeSnap.empty && user.email) employeeSnap = await getDocs(query(employeeCollection, where("personalInfo.email", "==", user.email.toLowerCase())));
        const employee = employeeSnap.empty ? null : { id: employeeSnap.docs[0].id, ...employeeSnap.docs[0].data() };
        const roleId = employee?.access?.roleId || user.role || employee?.employment?.role || "employee";
        const roleSnap = await getDoc(doc(db, "Companies", user.companyId, "Roles", String(roleId).toLowerCase().replace(/[^a-z0-9]+/g, "_")));
        const resolved = resolveAccess({ currentUser: { ...user, uid }, employee, company: companyData, role: roleSnap.exists() ? roleSnap.data() : null });

        setCurrentUser({ ...user, uid });
        setCompany(companyData);
        setCompanyEmployee(employee);
        setAccess(resolved);

        const sessionKey = `rbac-session-${uid}`;
        if (typeof window !== "undefined" && !sessionStorage.getItem(sessionKey)) {
          sessionStorage.setItem(sessionKey, "1");
          const userAgent = navigator.userAgent || "Unknown";
          const browser = userAgent.includes("Chrome") ? "Chrome" : userAgent.includes("Firefox") ? "Firefox" : userAgent.includes("Safari") ? "Safari" : "Other";
          const session = { lastLoginAt: serverTimestamp(), lastDevice: /Mobi|Android/i.test(userAgent) ? "Mobile" : "Desktop", lastBrowser: browser, lastLocation: Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown" };
          const writes = [addDoc(collection(db, "Companies", user.companyId, "ActivityLogs"), { type: "user.login", actorId: uid, targetUserId: uid, targetEmployeeId: employee?.id || null, metadata: { device: session.lastDevice, browser, location: session.lastLocation }, createdAt: serverTimestamp() })];
          if (employee) writes.push(updateDoc(doc(db, "Companies", user.companyId, "Usermanagement", employee.id), Object.fromEntries(Object.entries(session).map(([key, value]) => [`access.${key}`, value]))));
          Promise.all(writes).catch((error) => console.warn("Session audit unavailable:", error));
        }

      } else {

        setCompany(null);
        setCompanyEmployee(null);
        setAccess(null);

      }

    } catch (error) {

      console.error(error);

    }

  };

  useEffect(() => {

    const unsubscribe = onAuthStateChanged(
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

    await loadCurrentUser(firebaseUser.uid);

  };

  return (

    <AuthContext.Provider
      value={{

        firebaseUser,

        currentUser,

        company,

        companyEmployee,

        access,

        can: (permission) => hasPermission(access, permission),

        loading,

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
