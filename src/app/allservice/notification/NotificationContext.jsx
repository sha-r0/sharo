"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/(auth)/context/AuthContext";
import notificationRepository from "./notificationRepository";
import notificationService from "./notificationService";
import { getUserAudienceKeys, isNotificationVisible } from "./notificationUtilities";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { company, currentUser } = useAuth();
  const [source, setSource] = useState([]);
  const [states, setStates] = useState({});
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [clock, setClock] = useState(Date.now());
  const userId = currentUser?.id || currentUser?.uid;
  const audienceKeys = useMemo(() => getUserAudienceKeys(currentUser), [currentUser]);
  const audienceSignature = audienceKeys.join("|");

  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!company?.id || !userId || !audienceKeys.length) {
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    setError(null);
    const unsubscribeFeed = notificationRepository.subscribeNotifications(
      company.id,
      audienceKeys,
      (items, nextCursor) => {
        setSource(items);
        setCursor(nextCursor);
        setHasMore(Boolean(nextCursor));
        setLoading(false);
      },
      (listenerError) => {
        console.error("Notification listener failed:", listenerError);
        setError("Notifications are temporarily unavailable.");
        setLoading(false);
      },
    );
    const unsubscribeState = notificationRepository.subscribeUserState(
      company.id,
      userId,
      setStates,
      (stateError) => console.error("Notification state listener failed:", stateError),
    );
    return () => { unsubscribeFeed(); unsubscribeState(); };
  }, [company?.id, userId, audienceSignature]);

  const notifications = useMemo(() => source.map((item) => ({
    ...item,
    userState: states[item.id] || { isRead: false, isArchived: false, isDeleted: false, isPinned: false },
  })).filter((item) => !item.userState.isDeleted && !item.userState.isArchived && isNotificationVisible(item, new Date(clock)))
    .sort((a, b) => {
      const pinDifference = Number(b.userState.isPinned) - Number(a.userState.isPinned);
      if (pinDifference) return pinDifference;
      const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
      const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
      return bTime - aTime;
    }), [source, states, clock]);

  const unreadCount = useMemo(() => notifications.filter((item) => !item.userState.isRead).length, [notifications]);

  const loadMore = useCallback(async () => {
    if (!company?.id || !cursor || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const page = await notificationRepository.getNextPage(company.id, audienceKeys, cursor);
      setSource((current) => {
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...page.items.filter((item) => !seen.has(item.id))];
      });
      setCursor(page.cursor);
      setHasMore(page.items.length >= 40);
    } catch (pageError) {
      console.error("Notification pagination failed:", pageError);
      setError("Could not load older notifications.");
    } finally {
      setLoadingMore(false);
    }
  }, [company?.id, cursor, audienceSignature, loadingMore, hasMore]);

  const runAction = useCallback((action, notification) => {
    if (!company?.id || !userId) return Promise.resolve();
    return notificationService[action](company.id, userId, notification.id, notification.userState?.isPinned);
  }, [company?.id, userId]);

  const markRead = useCallback((item) => runAction("markRead", item), [runAction]);
  const togglePinned = useCallback((item) => notificationService.togglePinned(company.id, userId, item.id, !item.userState?.isPinned), [company?.id, userId]);
  const archive = useCallback((item) => runAction("archive", item), [runAction]);
  const remove = useCallback((item) => runAction("remove", item), [runAction]);
  const markAllRead = useCallback(() => {
    if (!company?.id || !userId) return Promise.resolve();
    return notificationRepository.markManyRead(company.id, userId, notifications.filter((item) => !item.userState.isRead).map((item) => item.id));
  }, [company?.id, userId, notifications]);

  const value = useMemo(() => ({
    notifications, unreadCount, loading, loadingMore, hasMore, error, loadMore,
    markRead, markAllRead, togglePinned, archive, remove,
  }), [notifications, unreadCount, loading, loadingMore, hasMore, error, loadMore, markRead, markAllRead, togglePinned, archive, remove]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications must be used within NotificationProvider");
  return context;
}
