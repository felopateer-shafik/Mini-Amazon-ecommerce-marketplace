import { useMemo, useState } from "react";
import {
  Search,
  MessageSquare,
  Clock,
  CheckCircle,
  User,
  Send,
  ArrowLeft,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useAdminChat,
  useAdminChats,
  useAdminDeleteChat,
  useAdminBlockChatCustomer,
  useAdminSendChatMessage,
  useAdminUnblockChatCustomer,
  useAdminUpdateChatStatus,
} from "@/hooks/useApi";
import toast from "react-hot-toast";
import { usePermission } from "@/hooks/usePermission";

const statusColors = {
  active: "success",
  waiting: "warning",
  resolved: "info",
};

export default function ChatManagePage() {
  const { t } = useTranslation();
  const { hasPerm } = usePermission();
  const canManage = hasPerm("manage-chats");
  const canDelete = hasPerm("delete-chats");

  const [selectedChatId, setSelectedChatId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [message, setMessage] = useState("");

  const chatsQuery = useAdminChats({ search, status: statusFilter });
  const chatsRaw = chatsQuery.data ?? {};
  const conversationsPayload = chatsRaw?.data ?? chatsRaw ?? {};
  const conversations = Array.isArray(conversationsPayload?.data)
    ? conversationsPayload.data
    : Array.isArray(conversationsPayload)
      ? conversationsPayload
      : [];
  const chatMeta = chatsRaw?.meta ?? conversationsPayload?.meta ?? {};

  const chatQuery = useAdminChat(selectedChatId, {
    refetchInterval: selectedChatId ? 10000 : false,
  });
  const selectedChat = useMemo(
    () => conversations.find((c) => c.id === selectedChatId) ?? null,
    [conversations, selectedChatId],
  );
  const messages = chatQuery.data?.data?.messages ?? [];
  const statusLabel = {
    all: t("common.all"),
    active: t("admin.statusActive"),
    waiting: t("admin.statusWaiting"),
    resolved: t("admin.statusResolved"),
  };

  const sendMessage = useAdminSendChatMessage();
  const updateChatStatus = useAdminUpdateChatStatus();
  const blockCustomer = useAdminBlockChatCustomer();
  const unblockCustomer = useAdminUnblockChatCustomer();
  const deleteChat = useAdminDeleteChat();

  const sendAdminMessage = async () => {
    if (!selectedChatId || !message.trim()) return;

    try {
      await sendMessage.mutateAsync({
        conversationId: selectedChatId,
        data: { message: message.trim() },
      });
      setMessage("");
    } catch {
      toast.error(t("admin.failedSendMessage"));
    }
  };

  const setStatus = async (status) => {
    if (!selectedChatId) return;

    try {
      await updateChatStatus.mutateAsync({
        conversationId: selectedChatId,
        data: { status },
      });
      toast.success(t("admin.conversationUpdated"));
    } catch {
      toast.error(t("admin.failedUpdateConversation"));
    }
  };

  const handleToggleBlock = async () => {
    if (!selectedChatId || !selectedChat) return;

    try {
      if (selectedChat.is_customer_blocked) {
        await unblockCustomer.mutateAsync(selectedChatId);
        toast.success(t("admin.customerUnblocked"));
      } else {
        await blockCustomer.mutateAsync(selectedChatId);
        toast.success(t("admin.customerBlocked"));
      }
    } catch {
      toast.error(t("admin.failedUpdateChatAccess"));
    }
  };

  const handleDeleteChat = async () => {
    if (!selectedChatId) return;
    if (!window.confirm(t("admin.deleteConversationConfirm"))) return;

    try {
      await deleteChat.mutateAsync(selectedChatId);
      toast.success(t("admin.conversationDeleted"));
      setSelectedChatId(null);
      setMessage("");
    } catch {
      toast.error(t("admin.failedDeleteConversation"));
    }
  };

  const loading = chatsQuery.isLoading || chatQuery.isLoading;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-text">
          {t("admin.chatManage")}
        </h1>
        <p className="text-sm text-text-secondary">
          {t("admin.monitorCustomerMerchantConversations")}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: t("admin.liveChats"),
            value:
              chatMeta.active_count ??
              conversations.filter((c) => c.status === "active").length,
            icon: MessageSquare,
            color: "text-success",
          },
          {
            label: t("admin.waitingResponse"),
            value:
              chatMeta.waiting_count ??
              conversations.filter((c) => c.status === "waiting").length,
            icon: Clock,
            color: "text-yellow-500",
          },
          {
            label: t("admin.resolved"),
            value:
              chatMeta.resolved_count ??
              conversations.filter((c) => c.status === "resolved").length,
            icon: CheckCircle,
            color: "text-accent",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white p-4 rounded-xl border border-border/50 flex items-center gap-3 flex-wrap justify-center text-center"
          >
            <s.icon className={`h-8 w-8 ${s.color}`} />
            <div>
              <p className="text-xl font-bold text-text">{s.value}</p>
              <p className="text-xs text-text-secondary">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-border/50 flex h-[500px] overflow-hidden">
        <div
          className={`w-80 border-r border-border/50 flex flex-col shrink-0 width-fit-content ${selectedChatId ? "hidden md:flex" : ""}`}
        >
          <div className="p-3 border-b border-border/50 space-y-2">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("admin.searchChats")}
                className="w-full ps-9 pe-3 py-2 border border-border rounded-lg text-sm"
              />
            </div>
            <div className="flex gap-1">
              {["all", "active", "waiting", "resolved"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  aria-pressed={statusFilter === s}
                  aria-label={statusLabel[s] || s}
                  className={`px-2 py-1 text-xs rounded capitalize ${statusFilter === s ? "bg-primary text-white" : "bg-gray-100 text-text-secondary"}`}
                >
                  {statusLabel[s] || s}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setSelectedChatId(chat.id)}
                className={`w-full text-left p-3 border-b border-border/50 hover:bg-gray-50 transition ${selectedChatId === chat.id ? "bg-primary/5" : ""}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-text">
                    {chat.customer}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {chat.time}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-text-secondary truncate flex-1">
                    {chat.lastMessage || t("merchant.noMessages")}
                  </p>
                  <div className="flex items-center gap-1.5 ml-2">
                    <Badge
                      variant={statusColors[chat.status] || "info"}
                      size="sm"
                    >
                      {statusLabel[chat.status] || chat.status}
                    </Badge>
                    {chat.unread > 0 && (
                      <span className="w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                        {chat.unread}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-accent mt-0.5">{chat.merchant}</p>
              </button>
            ))}

            {!loading && conversations.length === 0 && (
              <div className="p-6 text-center text-sm text-text-secondary">
                {t("admin.noConversationsFound")}
              </div>
            )}
          </div>
        </div>

        <div
          className={`flex-1 flex flex-col ${!selectedChatId ? "hidden md:flex" : ""}`}
        >
          {selectedChatId ? (
            <>
              <div className="p-3 border-b border-border/50 flex items-center gap-3 flex-wrap">
                <button
                  className="md:hidden p-1"
                  onClick={() => setSelectedChatId(null)}
                  aria-label={t("admin.goBack")}
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <User className="h-8 w-8 text-text-secondary bg-gray-100 rounded-full p-1.5" />
                <div className="flex-1 width-200">
                  <p className="text-sm font-medium text-text">
                    {selectedChat?.customer} ↔ {selectedChat?.merchant}
                  </p>
                  <Badge
                    variant={statusColors[selectedChat?.status] || "info"}
                    size="sm"
                  >
                    {statusLabel[selectedChat?.status] || statusLabel.active}
                  </Badge>
                </div>
                <div className="flex gap-2 grow-1 justify-end">
                  {canManage && (
                    <button
                      onClick={() => setStatus("waiting")}
                      className="text-xs px-2 py-1 rounded bg-gray-100"
                      disabled={updateChatStatus.isPending}
                      aria-label={t("admin.waiting")}
                    >
                      {t("admin.waiting")}
                    </button>
                  )}
                  {canManage && (
                    <button
                      onClick={() => setStatus("resolved")}
                      className="text-xs px-2 py-1 rounded bg-gray-100"
                      disabled={updateChatStatus.isPending}
                      aria-label={t("admin.resolve")}
                    >
                      {t("admin.resolve")}
                    </button>
                  )}
                  {canManage && (
                    <button
                      onClick={handleToggleBlock}
                      className={`text-xs px-2 py-1 rounded ${selectedChat?.is_customer_blocked ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                      disabled={
                        blockCustomer.isPending || unblockCustomer.isPending
                      }
                      aria-label={
                        selectedChat?.is_customer_blocked
                          ? t("admin.unblockCustomer")
                          : t("admin.blockCustomer")
                      }
                    >
                      {selectedChat?.is_customer_blocked
                        ? t("admin.unblock")
                        : t("admin.block")}
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={handleDeleteChat}
                      className="text-xs px-2 py-1 rounded bg-gray-100"
                      disabled={deleteChat.isPending}
                      aria-label={t("admin.deleteConversation")}
                    >
                      {t("common.delete")}
                    </button>
                  )}
                </div>
              </div>
              <div className="px-3 py-2 border-b border-border/50 text-xs text-text-secondary">
                {selectedChat?.is_customer_blocked
                  ? t("admin.customerBlockedMessage")
                  : selectedChat?.customer_chat_expires_at
                    ? t("admin.customerReplyWindowUntil").replace(
                        "{time}",
                        new Date(
                          selectedChat.customer_chat_expires_at,
                        ).toLocaleString(),
                      )
                    : t("admin.customerReplyWindowStarts")}
              </div>
              <div
                className="flex-1 overflow-y-auto p-4 space-y-3"
                role="log"
                aria-label={t("merchant.messages")}
              >
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === "customer" ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-xs px-3 py-2 rounded-xl text-sm ${msg.sender === "customer" ? "bg-gray-100 text-text" : "bg-accent text-white"}`}
                    >
                      <p>{msg.text}</p>
                      <p
                        className={`text-xs mt-1 ${msg.sender === "customer" ? "text-text-secondary" : "text-white/70"}`}
                      >
                        {msg.time} • {msg.sender}
                      </p>
                    </div>
                  </div>
                ))}
                {!loading && messages.length === 0 && (
                  <p className="text-sm text-text-secondary text-center py-8">
                    {t("merchant.noMessages")}
                  </p>
                )}
              </div>
              <div className="p-3 border-t border-border/50">
                <div className="flex gap-2">
                  <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t("merchant.typeMessage")}
                    className="flex-1 border border-border rounded-lg px-3 py-2 text-sm"
                  />
                  <button
                    className="p-2 bg-primary text-white rounded-lg"
                    onClick={sendAdminMessage}
                    disabled={sendMessage.isPending}
                    aria-label={t("merchant.sendMessage")}
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  {t("admin.monitoringModeVisibleToBoth")}
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-text-secondary">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>{t("merchant.selectConversation")}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
