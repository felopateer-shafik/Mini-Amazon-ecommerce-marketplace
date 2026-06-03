import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  Package,
  Tag,
  CreditCard,
  ShieldCheck,
  Trash2,
  CheckCheck,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Breadcrumb from "@/components/ui/Breadcrumb";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useDeleteNotification,
  useClearAllNotifications,
} from "@/hooks/useApi";

const iconMap = {
  order: Package,
  promo: Tag,
  payment: CreditCard,
  security: ShieldCheck,
  default: Bell,
};

export default function NotificationsPage() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState("all"); // all, unread

  const { data: notificationsRes, isLoading } = useNotifications();
  const markAllRead = useMarkAllNotificationsRead();
  const markAsRead = useMarkNotificationRead();
  const removeNotification = useDeleteNotification();
  const clearAllNotifications = useClearAllNotifications();

  const notifications = notificationsRes?.data ?? notificationsRes ?? [];
  const unreadCount =
    notificationsRes?.meta?.unread_count ??
    notifications.filter((n) => !n.read).length;

  const displayedNotifications =
    filter === "unread" ? notifications.filter((n) => !n.read) : notifications;

  const onMarkAllRead = () => markAllRead.mutate();

  const onMarkRead = (id) => {
    markAsRead.mutate(id);
  };

  const onRemoveNotification = (id) => {
    removeNotification.mutate(id);
  };

  const onClearAll = () => {
    if (!notifications.length) return;
    clearAllNotifications.mutate();
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Breadcrumb
        items={[
          { label: t("common.home"), href: "/" },
          { label: t("header.notifications") || "Notifications" },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-4 mb-6 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />{" "}
            {t("header.notifications") || "Notifications"}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {unreadCount > 0
              ? (unreadCount > 1
                  ? t("notifications.unreadCountPlural")
                  : t("notifications.unreadCount")
                ).replace("{count}", unreadCount)
              : t("notifications.allCaughtUp")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-sm border border-border rounded-lg px-3 py-2 bg-white"
          >
            <option value="all">{t("notifications.all")}</option>
            <option value="unread">{t("notifications.unread")}</option>
          </select>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              icon={CheckCheck}
              onClick={onMarkAllRead}
            >
              {t("notifications.markAllRead")}
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              icon={Trash2}
              onClick={onClearAll}
            >
              {t("notifications.clearAll")}
            </Button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="text-sm text-text-secondary py-4">
          {t("notifications.loading")}
        </div>
      )}

      {displayedNotifications.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="h-20 w-20 text-gray-200 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-text mb-2">
            {t("notifications.noNotifications")}
          </h2>
          <p className="text-text-secondary mb-4">
            {filter === "unread"
              ? t("notifications.noUnread")
              : t("notifications.noAny")}
          </p>
          <Link to="/">
            <Button>{t("notifications.continueShopping")}</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {displayedNotifications.map((notification) => {
            const Icon = iconMap[notification.type] || iconMap.default;
            return (
              <div
                key={notification.id}
                className={`flex items-start gap-4 p-4 rounded-lg border transition ${
                  notification.read
                    ? "bg-white border-border/50"
                    : "bg-primary/5 border-primary/20"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    notification.read ? "bg-gray-100" : "bg-primary/10"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${
                      notification.read ? "text-text-secondary" : "text-primary"
                    }`}
                  />
                </div>
                <Link
                  to={notification.link}
                  className="flex-1 min-w-0"
                  onClick={() => onMarkRead(notification.id)}
                >
                  <div className="flex items-center gap-2">
                    <h3
                      className={`text-sm font-medium ${
                        notification.read
                          ? "text-text"
                          : "text-text font-semibold"
                      }`}
                    >
                      {notification.title}
                    </h3>
                    {!notification.read && (
                      <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-text-secondary mt-0.5 line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-text-secondary mt-1">
                    {notification.time}
                  </p>
                </Link>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onRemoveNotification(notification.id);
                  }}
                  className="p-1.5 text-text-secondary hover:text-danger rounded transition flex-shrink-0"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
