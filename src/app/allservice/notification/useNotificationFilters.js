"use client";

import { useMemo } from "react";

export default function useNotificationFilters(notifications, { search = "", filter = "all" } = {}) {
  return useMemo(() => {
    const text = search.trim().toLowerCase();
    return notifications.filter((item) => {
      const matchesFilter = filter === "all" || (filter === "unread" ? !item.userState?.isRead : item.module === filter);
      const sender = item.sender && typeof item.sender === "object"
        ? `${item.sender.name || ""} ${item.sender.email || ""}`
        : String(item.sender || item.senderName || "");
      const matchesSearch = !text || `${item.title} ${item.message} ${item.module} ${sender} ${item.metadata?.employeeName || ""} ${item.metadata?.projectName || ""}`.toLowerCase().includes(text);
      return matchesFilter && matchesSearch;
    });
  }, [notifications, search, filter]);
}
