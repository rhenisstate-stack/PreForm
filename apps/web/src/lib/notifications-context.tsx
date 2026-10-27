"use client";

import * as React from "react";

export interface CandidateNotification {
  id: string;
  title: string;
  summary: string;
  timestamp: string;
  read: boolean;
  destination?: string;
  category: "study" | "exam" | "account";
}

const DEFAULT_NOTIFICATIONS: CandidateNotification[] = [
  {
    id: "notif-1",
    title: "Welcome to PREform NCLEX",
    summary: "Your candidate study portal is active. Start with an NCLEX diagnostic assessment.",
    timestamp: "10 mins ago",
    read: false,
    destination: "/courses",
    category: "account",
  },
  {
    id: "notif-2",
    title: "New NGN Case Studies Available",
    summary: "6-part unfolding clinical judgment case studies have been updated with new rationales.",
    timestamp: "3 hours ago",
    read: false,
    destination: "/blog/mastering-ngn-clinical-judgment-measurement-model",
    category: "study",
  },
  {
    id: "notif-3",
    title: "Pharmacology High-Alert Medication Guide",
    summary: "Review critical antidote associations and safe insulin administration windows.",
    timestamp: "1 day ago",
    read: true,
    destination: "/blog/high-alert-medications-nclex-pharmacology",
    category: "study",
  },
];

export interface NotificationsContextType {
  notifications: CandidateNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

const NotificationsContext = React.createContext<NotificationsContextType | undefined>(undefined);

const NOTIFICATIONS_STORAGE_KEY = "preform_notifications";

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = React.useState<CandidateNotification[]>(DEFAULT_NOTIFICATIONS);
  const [isInitialized, setIsInitialized] = React.useState(false);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setNotifications(parsed);
        }
      }
    } catch (e) {
      console.warn("Failed to read notifications from localStorage:", e);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  React.useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
    } catch (e) {
      console.warn("Failed to persist notifications:", e);
    }
  }, [notifications, isInitialized]);

  const markAsRead = React.useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = React.useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = React.useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationsProvider");
  }
  return context;
}
