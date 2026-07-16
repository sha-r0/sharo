import {
  collection, doc, getDocs, limit, onSnapshot, orderBy, query, runTransaction,
  serverTimestamp, setDoc, startAfter, where, writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

class NotificationRepository {
  notificationCollection(companyId) {
    return collection(db, "Companies", companyId, "Notifications");
  }

  stateCollection(companyId, userId) {
    return collection(db, "Companies", companyId, "UserNotifications", userId, "Items");
  }

  async create(companyId, payload, senderUserId) {
    const notificationRef = doc(this.notificationCollection(companyId));
    const batch = writeBatch(db);
    batch.set(notificationRef, {
      ...payload,
      notificationId: notificationRef.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    if (senderUserId) {
      batch.set(doc(this.stateCollection(companyId, senderUserId), notificationRef.id), {
        isRead: true,
        readAt: serverTimestamp(),
        isArchived: false,
        isDeleted: false,
        isPinned: false,
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
    return notificationRef.id;
  }

  subscribeNotifications(companyId, audienceKeys, callback, onError) {
    const feedQuery = query(
      this.notificationCollection(companyId),
      where("audienceKeys", "array-contains-any", audienceKeys),
      orderBy("createdAt", "desc"),
      limit(40),
    );
    return onSnapshot(feedQuery, (snapshot) => callback(
      snapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
      snapshot.docs.at(-1) || null,
    ), onError);
  }

  subscribeUserState(companyId, userId, callback, onError) {
    return onSnapshot(this.stateCollection(companyId, userId), (snapshot) => {
      const states = {};
      snapshot.docs.forEach((item) => { states[item.id] = { id: item.id, ...item.data() }; });
      callback(states);
    }, onError);
  }

  async getNextPage(companyId, audienceKeys, cursor, pageSize = 40) {
    if (!cursor) return { items: [], cursor: null };
    const pageQuery = query(
      this.notificationCollection(companyId),
      where("audienceKeys", "array-contains-any", audienceKeys),
      orderBy("createdAt", "desc"),
      startAfter(cursor),
      limit(pageSize),
    );
    const snapshot = await getDocs(pageQuery);
    return {
      items: snapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
      cursor: snapshot.docs.length === pageSize ? snapshot.docs.at(-1) : null,
    };
  }

  async createOnceForSource(companyId, sourceCollection, sourceId, eventKey, payload) {
    const sourceRef = doc(db, "Companies", companyId, sourceCollection, sourceId);
    const notificationRef = doc(this.notificationCollection(companyId));
    return runTransaction(db, async (transaction) => {
      const sourceSnapshot = await transaction.get(sourceRef);
      if (!sourceSnapshot.exists()) return null;
      const existingEvent = sourceSnapshot.data()?.notificationEvents?.[eventKey];
      if (existingEvent) return existingEvent;
      transaction.set(notificationRef, {
        ...payload,
        notificationId: notificationRef.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      transaction.update(sourceRef, {
        [`notificationEvents.${eventKey}`]: notificationRef.id,
        notificationUpdatedAt: serverTimestamp(),
      });
      return notificationRef.id;
    });
  }

  async setUserState(companyId, userId, notificationId, state) {
    await setDoc(doc(this.stateCollection(companyId, userId), notificationId), {
      ...state,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }

  async markManyRead(companyId, userId, notificationIds) {
    const chunks = [];
    for (let index = 0; index < notificationIds.length; index += 450) chunks.push(notificationIds.slice(index, index + 450));
    await Promise.all(chunks.map(async (ids) => {
      const batch = writeBatch(db);
      ids.forEach((id) => batch.set(doc(this.stateCollection(companyId, userId), id), {
        isRead: true, readAt: serverTimestamp(), updatedAt: serverTimestamp(),
      }, { merge: true }));
      await batch.commit();
    }));
  }
}

export default new NotificationRepository();
