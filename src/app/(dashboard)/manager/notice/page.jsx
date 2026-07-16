"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
    collection,
    addDoc,
    getDocs,
    doc,
    deleteDoc,
    query,
    where
} from "firebase/firestore";

import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL,
} from "firebase/storage";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import notificationService from "@/app/allservice/notification/notificationService";

/* =========================
   MAIN COMPONENT
========================= */
export default function NoticePage() {
    const [notices, setNotices] = useState([]);
    const [users, setUsers] = useState([]); // ✅ NEW
    const [selectedList, setSelectedList] = useState([]); // ✅ NEW
    const [selectedType, setSelectedType] = useState(""); // ✅ NEW

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);

    const storage = getStorage();


    const [companyId, setCompanyId] = useState(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem("adminUser");
    
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
    
                    if (parsed?.companyDocId) {
                        setCompanyId(parsed.companyDocId);
                    }
                } catch (e) {
                    console.error("Invalid adminUser in localStorage");
                }
            }
        }
    }, []);

    /* =========================
       FETCH USERS
    ========================= */
    const fetchUsers = async () => {
    
        const q = query(
            collection(db, "Companies", companyId, "Usermanagement"),
            where("isActive", "==", true)
        );
    
        const snap = await getDocs(q);
    
        const list = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
        }));
    
        setUsers(list);
    };

    /* =========================
       FETCH NOTICES
    ========================= */
    const fetchNotices = async () => {
        const snap = await getDocs(
            collection(db, "Companies", companyId, "Notices")
        );

        const list = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
        }));

        setNotices(list);
    };

    useEffect(() => {
        if (companyId) {
            fetchUsers();
            fetchNotices();
        }
    }, [companyId]);

    /* =========================
       UPLOAD PDF
    ========================= */
    const uploadPDF = async (file) => {
        const fileRef = ref(storage, `Notices/${companyId}/${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        return url;
    };

    /* =========================
       CREATE NOTICE
    ========================= */
    const createNotice = async () => {
        if (!title) return alert("Title required");

        try {
            setLoading(true);

            let fileUrl = "";

            if (file) {
                fileUrl = await uploadPDF(file);
            }

            const noticeRef = await addDoc(
                collection(db, "Companies", companyId, "Notices"),
                {
                    title,
                    description,
                    fileUrl,
                    assignedTo: [],
                    responses: {},
                    createdAt: new Date().toISOString(),
                }
            );

            await notificationService.emitSafe("notice.created", {
                companyId, message: description, receiver: "company", title,
                actionId: noticeRef.id, actionRoute: "/manager/notice",
                metadata: { noticeId: noticeRef.id, noticeTitle: title },
            });

            alert("Notice Published ✅");

            setTitle("");
            setDescription("");
            setFile(null);

            fetchNotices();

        } catch (e) {
            console.error(e);
            alert("Upload failed ❌");
        } finally {
            setLoading(false);
        }
    };

    const deleteNotice = async (id) => {
        if (!confirm("Delete this notice?")) return;

        try {
            await deleteDoc(doc(db, "Companies", companyId, "Notices", id));
            fetchNotices();
        } catch (e) {
            console.error(e);
            alert("Delete failed ❌");
        }
    };

    /* =========================
       STATUS COUNT
    ========================= */
    const getStatus = (notice) => {
        const responses = notice.responses || {};

        let accepted = 0;
        let rejected = 0;

        Object.values(responses).forEach((r) => {
            if (r.status === "accepted") accepted++;
            if (r.status === "rejected") rejected++;
        });

        const totalUsers = users.length;
        const pending = totalUsers - (accepted + rejected);

        return { accepted, rejected, pending };
    };

    /* =========================
       GET EMPLOYEE LIST
    ========================= */
    const getEmployeeLists = (notice) => {
        const responses = notice.responses || {};

        const accepted = [];
        const rejected = [];
        const pending = [];

        users.forEach((u) => {
            const res = responses[u.id];

            if (res && res.status === "accepted") {
                accepted.push(u);
            } else if (res && res.status === "rejected") {
                rejected.push(u);
            } else {
                // ✅ THIS HANDLES DEFAULT PENDING
                pending.push(u);
            }
        });

        return { accepted, rejected, pending };
    };

    const handleStatusClick = (notice, type) => {
        const lists = getEmployeeLists(notice);
        setSelectedList(lists[type]);
        setSelectedType(type);
    };

    /* =========================
       UI
    ========================= */
    return (
        <div className="p-6 max-w-6xl mx-auto space-y-8">

            {/* ================= CREATE NOTICE ================= */}
            <div className="bg-white p-6 rounded-xl shadow border">
                <h2 className="text-xl font-bold mb-4">Create Notice</h2>

                <div className="grid gap-4">
                    <Input
                        placeholder="Notice Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />

                    <Textarea
                        placeholder="Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />

                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-500 transition">
                        <p className="text-gray-500 mb-2">Upload Notice PDF</p>

                        <label className="cursor-pointer inline-block bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition">
                            Choose File
                            <input
                                type="file"
                                accept="application/pdf"
                                onChange={(e) => setFile(e.target.files[0])}
                                className="hidden"
                            />
                        </label>

                        {file && (
                            <p className="text-sm text-green-600 mt-3 font-medium">
                                ✅ {file.name}
                            </p>
                        )}
                    </div>

                    <Button
                        className="bg-blue-700"
                        onClick={createNotice}
                        disabled={loading}
                    >
                        {loading ? "Uploading..." : "Publish Notice"}
                    </Button>
                </div>
            </div>

            {/* ================= NOTICE LIST ================= */}
            <div>
                <h2 className="text-xl font-bold mb-4">All Notices</h2>

                <div className="space-y-4">
                    {notices.map((n) => {
                        const s = getStatus(n);

                        return (
                            <div
                                key={n.id}
                                className="bg-white border rounded-xl p-5 shadow"
                            >
                                <div className="flex justify-between items-center">
                                    <h3 className="font-semibold text-lg">{n.title}</h3>

                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-gray-500">
                                            {new Date(n.createdAt).toLocaleDateString()}
                                        </span>

                                        <button
                                            onClick={() => deleteNotice(n.id)}
                                            className="text-red-600 text-sm hover:underline"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>

                                <p className="text-gray-600 mt-2">{n.description}</p>

                                {n.fileUrl && (
                                    <a
                                        href={n.fileUrl}
                                        target="_blank"
                                        className="text-blue-600 text-sm underline mt-2 block"
                                    >
                                        📄 View Notice PDF
                                    </a>
                                )}

                                {/* CLICKABLE STATUS */}
                                <div className="flex gap-6 mt-4 text-sm font-medium">
                                    <span
                                        className="text-green-600 cursor-pointer"
                                        onClick={() => handleStatusClick(n, "accepted")}
                                    >
                                        ✔ {s.accepted} Accepted
                                    </span>

                                    <span
                                        className="text-red-600 cursor-pointer"
                                        onClick={() => handleStatusClick(n, "rejected")}
                                    >
                                        ✖ {s.rejected} Rejected
                                    </span>

                                    <span
                                        className="text-yellow-600 cursor-pointer"
                                        onClick={() => handleStatusClick(n, "pending")}
                                    >
                                        ⏳ {s.pending} Pending
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ================= EMPLOYEE LIST ================= */}
            {selectedList.length > 0 && (
                <div className="bg-white p-5 rounded-xl shadow border mt-6">
                    <h3 className="font-semibold mb-4 capitalize">
                        {selectedType} Employees
                    </h3>

                    <div className="space-y-2">
                        {selectedList.map((u) => (
                            <div
                                key={u.id}
                                className="flex justify-between border p-3 rounded-lg"
                            >
                                <span>{u.name}</span>
                                <span className="text-sm text-gray-500">
                                    {u.designation}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
