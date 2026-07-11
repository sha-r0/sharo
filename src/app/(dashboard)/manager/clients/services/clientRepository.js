import {
    addDoc,
    collection,
    getDocs,
    updateDoc,
    deleteDoc,
    doc,
  } from "firebase/firestore";
  
  import { db } from "@/lib/firebase";
  
  const clientRepository = {
  
    async save(companyId, data) {
      return addDoc(
        collection(db, "Companies", companyId, "Clients"),
        data
      );
    },
  
    async getAll(companyId) {
  
      const snap = await getDocs(
        collection(db, "Companies", companyId, "Clients")
      );
  
      return snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
  
    },
  
    async update(companyId, id, data) {
      return updateDoc(
        doc(db, "Companies", companyId, "Clients", id),
        data
      );
    },
  
    async remove(companyId, id) {
      return deleteDoc(
        doc(db, "Companies", companyId, "Clients", id)
      );
    },
  
  };
  
  export default clientRepository;