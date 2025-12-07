"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck, Loader2 } from "lucide-react";
import { cn } from "@rekon/ui";
import { API_CONFIG } from "@rekon/config";

interface Notification {
  id: string;
  type: "order" | "trade" | "position" | "market" | "alert";
  title: string;
  message: string;
  status: "unread" | "read";
  createdAt: string;
  metadata?: {
    marketId?: string;
    marketSlug?: string;
    orderId?: string;
    positionId?: string;
    [key: string]: unknown;
  };
}

interface NotificationsDropdownProps {
  className?: string;
}

export function NotificationsDropdown({ className }: NotificationsDropdownProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const url = `${API_CONFIG.baseUrl}/notifications`;
      
      const response = await fetch(url, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(
          `Failed to fetch notifications: ${response.status} ${errorText}`
        );
      }

      const data = await response.json();
      const fetchedNotifications: Notification[] = data.notifications || [];

      setNotifications(fetchedNotifications);
      setUnreadCount(
        fetchedNotifications.filter((n) => n.status === "unread").length
      );
    } catch (error) {
      // Handle network errors (API not running, CORS, etc.)
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        // Only log in development to reduce console noise
        if (process.env.NODE_ENV === "development") {
          console.warn(
            `[Notifications] Network error - API may not be running or CORS issue. URL: ${API_CONFIG.baseUrl}/notifications`
          );
        }
        // Don't show error to user if API is down - just show empty state
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      // Log other errors
      console.error("[Notifications] Error fetching notifications:", error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Poll for notifications every 30 seconds
  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(
        `${API_CONFIG.baseUrl}/notifications/mark-read`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ notificationId }),
        }
      );

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, status: "read" as const } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch(
        `${API_CONFIG.baseUrl}/notifications/mark-all-read`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, status: "read" as const }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (notification.status === "unread") {
      markAsRead(notification.id);
    }

    // Navigate to relevant page
    if (notification.metadata?.marketSlug) {
      router.push(`/markets/${notification.metadata.marketSlug}`);
    } else if (notification.metadata?.marketId) {
      router.push(`/markets/${notification.metadata.marketId}`);
    }

    setIsOpen(false);
  };

  // Format time ago
  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Get notification icon color
  const getNotificationColor = (type: Notification["type"]): string => {
    switch (type) {
      case "order":
        return "text-blue-400";
      case "trade":
        return "text-emerald-400";
      case "position":
        return "text-purple-400";
      case "market":
        return "text-orange-400";
      case "alert":
        return "text-yellow-400";
      default:
        return "text-white/60";
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className={cn("relative", className)}>
      {/* Bell Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#090E1C] text-white/60 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-white"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#FACC15] text-[10px] font-semibold text-[#020617]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-full mt-2 w-[360px] sm:w-[400px] rounded-lg border border-white/10 bg-[#121A30] shadow-xl z-50 max-h-[500px] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <h2 className="text-sm font-semibold text-white">Notifications</h2>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-white/60 hover:text-white/90 transition-colors flex items-center gap-1"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-white/60">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading notifications...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-white/60">No notifications</p>
                <p className="mt-1 text-xs text-white/40">
                  You'll see updates about your trades and orders here
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      "w-full px-4 py-3 text-left hover:bg-white/5 transition-colors",
                      notification.status === "unread" && "bg-white/5"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Status indicator */}
                      <div
                        className={cn(
                          "mt-1 h-2 w-2 shrink-0 rounded-full",
                          notification.status === "unread"
                            ? "bg-[#FACC15]"
                            : "bg-white/20"
                        )}
                      />

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3
                            className={cn(
                              "text-sm font-medium",
                              notification.status === "unread"
                                ? "text-white"
                                : "text-white/80"
                            )}
                          >
                            {notification.title}
                          </h3>
                          {notification.status === "unread" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              className="shrink-0 text-white/40 hover:text-white/70 transition-colors"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-white/60 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="mt-2 flex items-center gap-2 text-[10px] text-white/40">
                          <span
                            className={cn(
                              "font-medium",
                              getNotificationColor(notification.type)
                            )}
                          >
                            {notification.type}
                          </span>
                          <span>•</span>
                          <span>{formatTimeAgo(notification.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

