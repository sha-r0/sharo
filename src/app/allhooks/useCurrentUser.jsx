"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function useCurrentUser() {

  const {
    user: firebaseUser,
    loading: authLoading,
  } = useAuth();

  const [loading, setLoading] = useState(true);

  const [user, setUser] = useState(null);

  const [company, setCompany] = useState(null);

  useEffect(() => {

    if (authLoading) return;

    if (!firebaseUser) {

      setLoading(false);

      setUser(null);

      setCompany(null);

      return;

    }

    async function loadUser() {

      try {

        // ===========================
        // Usermanagement
        // ===========================

        const userSnap = await getDocs(
          query(
            collection(db, "Usermanagement"),
            where("uid", "==", firebaseUser.uid)
          )
        );

        if (userSnap.empty) {

          setLoading(false);

          return;

        }

        const currentUser = {
          id: userSnap.docs[0].id,
          ...userSnap.docs[0].data(),
        };

        setUser(currentUser);

        // ===========================
        // Company
        // ===========================

        const companySnap = await getDoc(
          doc(
            db,
            "Companies",
            currentUser.companyId
          )
        );

        if (companySnap.exists()) {

          setCompany({
            id: companySnap.id,
            ...companySnap.data(),
          });

        }

      } catch (error) {

        console.error(error);

      }

      setLoading(false);

    }

    loadUser();

  }, [
    firebaseUser,
    authLoading,
  ]);

  return {

    firebaseUser,

    user,

    company,

    role: user?.role,

    companyId: user?.companyId,

    loading,

  };

}