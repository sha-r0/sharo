"use client";
import { useEffect, useState, useMemo } from "react";
import { fetchUsersByCompany } from "../allservice/userService";

let cache = {}; // 🔥 company-wise cache

export const useUsers = (companyId) => {
  const [users, setUsers] = useState(cache[companyId] || []);
  const [loading, setLoading] = useState(!cache[companyId]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!companyId) return;
    if (cache[companyId]) return;

    const load = async () => {
      setLoading(true);
      const data = await fetchUsersByCompany(companyId);
      cache[companyId] = data;
      setUsers(data);
      setLoading(false);
    };

    load();
  }, [companyId]);

  // 🔥 search filter
  const filteredUsers = useMemo(() => {
    if (!search) return users;

    return users.filter((u) =>
      u.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, users]);

  return {
    users: filteredUsers,
    allUsers: users,
    loading,
    setSearch,
    refresh: async () => {
      const data = await fetchUsersByCompany(companyId);
      cache[companyId] = data;
      setUsers(data);
    },
  };
};