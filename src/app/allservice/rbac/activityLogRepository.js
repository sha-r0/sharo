import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
class ActivityLogRepository {
  async record(companyId, event) { return addDoc(collection(db, "Companies", companyId, "ActivityLogs"), { ...event, companyId, createdAt: serverTimestamp() }); }
  async recent(companyId, count = 50) { const snap = await getDocs(query(collection(db, "Companies", companyId, "ActivityLogs"), orderBy("createdAt", "desc"), limit(count))); return snap.docs.map((item) => ({ id: item.id, ...item.data() })); }
}
export default new ActivityLogRepository();
