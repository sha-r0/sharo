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
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {

  const [firebaseUser, setFirebaseUser] = useState(null);

  const [currentUser, setCurrentUser] = useState(null);

  const [company, setCompany] = useState(null);

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

        return;

      }

      const user = {

        id: userSnap.docs[0].id,

        ...userSnap.docs[0].data(),

      };

      setCurrentUser(user);

      // ============================
      // Company
      // ============================

      const companySnap = await getDoc(
        doc(db, "Companies", user.companyId)
      );

      if (companySnap.exists()) {

        setCompany({

          id: companySnap.id,

          ...companySnap.data(),

        });

      } else {

        setCompany(null);

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