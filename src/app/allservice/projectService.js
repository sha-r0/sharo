import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

/* =========================
   🔥 COLLECTION HELPER
========================= */
const getProjectCollection = (companyId) => {
  return collection(db, "Companies", companyId, "Projectmanagement");
};

/* =========================
   🔥 CREATE PROJECT
========================= */
export const createProject = async (companyId, data) => {
  try {
    const ref = getProjectCollection(companyId);

    const docRef = await addDoc(ref, {
      ...data,
      createdAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    console.error("Create Project Error:", error);
    throw error;
  }
};

/* =========================
   🔥 GET ALL PROJECTS
========================= */
export const getProjects = async (companyId) => {
  try {
    const ref = getProjectCollection(companyId);

    const q = query(ref, orderBy("createdAt", "desc"));

    const snap = await getDocs(q);

    return snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Fetch Projects Error:", error);
    return [];
  }
};

/* =========================
   🔥 UPDATE PROJECT
========================= */
export const updateProject = async (companyId, projectId, data) => {
  try {
    const ref = doc(
      db,
      "Companies",
      companyId,
      "Projectmanagement",
      projectId
    );

    await updateDoc(ref, data);

    return true;
  } catch (error) {
    console.error("Update Project Error:", error);
    throw error;
  }
};

/* =========================
   🔥 DELETE PROJECT
========================= */
export const deleteProject = async (companyId, projectId) => {
  try {
    const ref = doc(
      db,
      "Companies",
      companyId,
      "Projectmanagement",
      projectId
    );

    await deleteDoc(ref);

    return true;
  } catch (error) {
    console.error("Delete Project Error:", error);
    throw error;
  }
};

