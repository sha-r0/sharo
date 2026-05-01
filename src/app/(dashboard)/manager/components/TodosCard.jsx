"use client";

import { useEffect, useState } from "react";
import { Plus, Check, Trash2, CheckSquare } from "lucide-react";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function TodosCard({ companyId }) {
  const [todo, setTodo] = useState("");
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ================= FIRESTORE LISTENER ================= */
  useEffect(() => {
    if (!companyId) return;

    const todosRef = collection(
      db,
      "Companies",
      companyId,
      "Todos"
    );

    const q = query(todosRef, orderBy("createdAt", "desc"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setTodos(list);
        setLoading(false);
      },
      (err) => {
        console.error("Firestore error:", err);
      }
    );

    return () => unsub();
  }, [companyId]);

  /* ================= ADD TODO ================= */
  const addTodo = async () => {
    if (!todo.trim() || !companyId) return;

    const todosRef = collection(
      db,
      "Companies",
      companyId,
      "Todos"
    );

    await addDoc(todosRef, {
      text: todo.trim(),
      done: false,
      createdAt: serverTimestamp(),
    });

    setTodo("");
  };

  /* ================= TOGGLE ================= */
  const toggleTodo = async (id, done) => {
    if (!companyId) return;

    const ref = doc(
      db,
      "Companies",
      companyId,
      "Todos",
      id
    );

    await updateDoc(ref, { done: !done });
  };

  /* ================= DELETE ================= */
  const deleteTodo = async (id) => {
    if (!companyId) return;

    const ref = doc(
      db,
      "Companies",
      companyId,
      "Todos",
      id
    );

    await deleteDoc(ref);
  };

  /* ================= LOADING ================= */
  if (!companyId) {
    return (
      <div className="p-4 text-center text-black/50">
        Loading company...
      </div>
    );
  }

  /* ================= UI ================= */
  return (
    <div className="bg-[#F8F9FD] border border-white rounded-2xl p-5 flex flex-col">
      
      {/* HEADER */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-gradient-to-br from-amber-400 to-yellow-600 shadow-[0_8px_20px_rgba(245,158,11,0.35)]">
            <CheckSquare size={15} className="text-white" />
          </div>

          <h3 className="text-lg font-semibold text-black">
            Todos
          </h3>
        </div>

        <span className="text-xs text-amber-500 font-medium">
          {todos.filter((t) => !t.done).length} pending
        </span>
      </div>

      {/* INPUT */}
      <div className="flex gap-2 mb-4">
        <input
          value={todo}
          onChange={(e) => setTodo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTodo()}
          placeholder="Add a new task"
          className="flex-1 bg-[#e5e7f0] border border-white rounded-xl px-3 py-2 text-sm text-black"
        />

        <button
          onClick={addTodo}
          className="bg-amber-400 hover:bg-amber-600 text-white px-3 rounded-xl"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* LIST */}
      <div className="space-y-2 overflow-y-auto max-h-[220px] pr-1 manager-scroll">
        {loading ? (
          <p className="text-sm text-black/40 text-center">Loading…</p>
        ) : todos.length ? (
          todos.map((t) => (
            <div
              key={t.id}
              className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-black/5"
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleTodo(t.id, t.done)}
                  className={`w-5 h-5 rounded-full border flex justify-center items-center ${
                    t.done
                      ? "bg-green-500/20 border-green-400"
                      : "border-black/20"
                  }`}
                >
                  {t.done && (
                    <Check size={12} className="text-green-500" />
                  )}
                </button>

                <span
                  className={`text-sm ${
                    t.done
                      ? "line-through text-black/30"
                      : "text-black"
                  }`}
                >
                  {t.text}
                </span>
              </div>

              <button
                onClick={() => deleteTodo(t.id)}
                className="opacity-0 group-hover:opacity-100 text-black/40 hover:text-red-500"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        ) : (
          <p className="text-sm text-black/40 text-center">
            No tasks yet 🚀
          </p>
        )}
      </div>
    </div>
  );
}