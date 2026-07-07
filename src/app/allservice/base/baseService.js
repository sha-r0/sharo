"use client";

import {
    getDoc,
    getDocs,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
} from "firebase/firestore";

import networkManager from "../network/networkManager";
import networkQueue from "../network/networkQueue";

/* ==========================================================
   Base Service
========================================================== */

export default class BaseService {

    constructor() {

        /* ===============================
           Memory Cache
        =============================== */

        this.cache = new Map();

        /* ===============================
           Active Listeners
        =============================== */

        this.listeners = new Map();

    }

    /* ======================================================
     Execute
  ====================================================== */

    async execute({

        online,

        offlineType,

        payload,

    }) {

        if (networkManager.isOnline()) {

            return await online();

        }

        await networkQueue.add(

            offlineType,

            payload

        );

        return {

            queued: true,

        };

    }

    /* ======================================================
       Cache
    ====================================================== */

    getCache(key) {

        return this.cache.get(key);

    }

    setCache(key, value) {

        this.cache.set(key, value);

        return value;

    }

    removeCache(key) {

        this.cache.delete(key);

    }

    clearCache() {

        this.cache.clear();

    }

    /* ======================================================
       Document
    ====================================================== */

    async getDocument(docRef, mapper = null) {

        const key = docRef.path;

        if (this.cache.has(key)) {

            return this.cache.get(key);

        }

        const snapshot = await getDoc(docRef);

        if (!snapshot.exists()) {

            return null;

        }

        const data = mapper
            ? mapper({
                id: snapshot.id,
                ...snapshot.data(),
            })
            : {
                id: snapshot.id,
                ...snapshot.data(),
            };

        this.setCache(key, data);

        return data;

    }

    /* ======================================================
     Collection
  ====================================================== */

    async getCollection(collectionRef, mapper = null) {

        const snapshot = await getDocs(collectionRef);

        return snapshot.docs.map((doc) => {

            const data = mapper
                ? mapper({
                    id: doc.id,
                    ...doc.data(),
                })
                : {
                    id: doc.id,
                    ...doc.data(),
                };

            this.setCache(doc.ref.path, data);

            return data;

        });

    }

    /* ======================================================
       Create
    ====================================================== */

    async create(collectionRef, data) {

        const docRef = await addDoc(
            collectionRef,
            data
        );

        return docRef.id;

    }

    /* ======================================================
       Set Document
    ====================================================== */

    async set(docRef, data) {

        await setDoc(
            docRef,
            data
        );

        this.removeCache(docRef.path);

    }

    /* ======================================================
       Update
    ====================================================== */

    async update(docRef, data) {

        await updateDoc(
            docRef,
            data
        );

        const cached = this.getCache(docRef.path);

        if (cached) {

            this.setCache(
                docRef.path,
                {
                    ...cached,
                    ...data,
                }
            );

        }

    }

    /* ======================================================
       Delete
    ====================================================== */

    async delete(docRef) {

        await deleteDoc(docRef);

        this.removeCache(docRef.path);

    }

    /* ======================================================
     Refresh Cache
  ====================================================== */

    async refresh(docRef, mapper = null) {

        this.removeCache(docRef.path);

        return await this.getDocument(
            docRef,
            mapper
        );

    }

    /* ======================================================
       Subscribe Document
    ====================================================== */

    subscribe(
        docRef,
        callback,
        mapper = null
    ) {

        const key = docRef.path;

        // Already listening

        if (this.listeners.has(key)) {

            return this.listeners.get(key);

        }

        const unsubscribe = onSnapshot(

            docRef,

            (snapshot) => {

                if (!snapshot.exists()) {

                    this.removeCache(key);

                    callback(null);

                    return;

                }

                const data = mapper
                    ? mapper({
                        id: snapshot.id,
                        ...snapshot.data(),
                    })
                    : {
                        id: snapshot.id,
                        ...snapshot.data(),
                    };

                this.setCache(
                    key,
                    data
                );

                callback(data);

            },

            (error) => {

                console.error(
                    "Snapshot Error",
                    error
                );

            }

        );

        this.listeners.set(
            key,
            unsubscribe
        );

        return () => {

            unsubscribe();

            this.listeners.delete(key);

        };

    }

    /* ======================================================
       Stop Listener
    ====================================================== */

    unsubscribe(docRef) {

        const key = docRef.path;

        if (!this.listeners.has(key)) {

            return;

        }

        this.listeners.get(key)();

        this.listeners.delete(key);

    }

    /* ======================================================
       Remove All Listeners
    ====================================================== */

    unsubscribeAll() {

        this.listeners.forEach(

            (unsubscribe) => {

                unsubscribe();

            }

        );

        this.listeners.clear();

    }
    /* ======================================================
     Cache Information
  ====================================================== */

    hasCache(key) {

        return this.cache.has(key);

    }

    cacheSize() {

        return this.cache.size;

    }

    listenerCount() {

        return this.listeners.size;

    }

    /* ======================================================
       Destroy Service
    ====================================================== */

    destroy() {

        this.unsubscribeAll();

        this.clearCache();

    }

}