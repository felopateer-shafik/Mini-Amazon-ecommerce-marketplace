import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import {
  HardDrive,
  Cpu,
  MemoryStick,
  Activity,
  RefreshCw,
  Download,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Wrench,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";
import {
  useAdminAnalytics,
  useAdminMaintenanceAction,
  useAdminSettings,
  useAdminUpdateSettings,
} from "@/hooks/useApi";

const levelStyles = {
  error: "text-danger bg-red-50",
  warning: "text-yellow-600 bg-yellow-50",
  info: "text-accent bg-blue-50",
};

const defaultLogs = [];

export default function SystemPage() {
  const { t } = useTranslation();
  const MAX_MAINTENANCE_MESSAGE_LENGTH = 500;
  const [activeTab, setActiveTab] = useState("health");
  const {
    data: analyticsRes,
    isLoading: analyticsLoading,
    isError,
  } = useAdminAnalytics();
  const { data: settingsRes, isLoading: settingsLoading } = useAdminSettings();
  const updateSettings = useAdminUpdateSettings();
  const maintenanceAction = useAdminMaintenanceAction();

  const settings = settingsRes?.data ?? settingsRes ?? {};
  const analytics = analyticsRes?.data ?? analyticsRes ?? {};

  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [logs, setLogs] = useState(defaultLogs);
  const tabLabel = {
    health: t("admin.healthCheck"),
    logs: t("admin.logs"),
    maintenance: t("admin.maintenance"),
  };
  const logLevelLabel = {
    error: t("admin.error"),
    warning: t("common.warning"),
    info: t("admin.info"),
  };

  useEffect(() => {
    setMaintenanceMode(!!settings.maintenance_mode);
    setMaintenanceMessage(settings.maintenance_message ?? "");
    if (
      Array.isArray(settings.system_logs) &&
      settings.system_logs.length > 0
    ) {
      setLogs(settings.system_logs);
    }
  }, [settingsRes]);

  const isLoading = analyticsLoading || settingsLoading;

  const healthChecks = useMemo(
    () => [
      {
        name: t("admin.database"),
        status: "ok",
        detail: t("admin.analyticsQueryReturnedOrders", {
          count: Number(analytics.total_orders || 0).toLocaleString(),
        }),
      },
      {
        name: t("admin.cache"),
        status: "ok",
        detail: t("admin.settingsCacheAvailable"),
      },
      {
        name: t("admin.mail"),
        status: settings.site_email ? "ok" : "warning",
        detail: settings.site_email
          ? t("admin.senderConfigured", { email: settings.site_email })
          : t("admin.siteEmailNotConfigured"),
      },
      {
        name: t("admin.storefront"),
        status: maintenanceMode ? "warning" : "ok",
        detail: maintenanceMode
          ? t("admin.maintenanceModeEnabled")
          : t("admin.storefrontAcceptingTraffic"),
      },
    ],
    [analytics, settings, maintenanceMode, t],
  );

  const appendLog = (level, message) => {
    const now = new Date();
    const time = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const nextLogs = [{ time, level, message }, ...logs].slice(0, 100);
    setLogs(nextLogs);
    updateSettings.mutate({ system_logs: nextLogs });
  };

  const saveMaintenance = async () => {
    try {
      await updateSettings.mutateAsync({
        maintenance_mode: maintenanceMode,
        maintenance_message: maintenanceMessage,
      });
      appendLog(
        "info",
        t("admin.maintenanceModeSet", {
          mode: maintenanceMode ? t("common.enabled") : t("common.disabled"),
        }),
      );
      toast.success(t("admin.maintenanceSettingsSaved"));
    } catch {
      toast.error(t("admin.failedSaveMaintenanceSettings"));
    }
  };

  const clearLogs = async () => {
    try {
      await updateSettings.mutateAsync({ system_logs: [] });
      setLogs([]);
      toast.success(t("admin.logsCleared"));
    } catch {
      toast.error(t("admin.failedClearLogs"));
    }
  };

  const runMaintenanceAction = async (action, label) => {
    try {
      const response = await maintenanceAction.mutateAsync(action);
      if (action === "clear_logs") {
        setLogs([]);
      } else {
        appendLog(
          "info",
          response?.message || t("admin.actionCompleted", { label }),
        );
      }
      toast.success(response?.message || t("admin.actionCompleted", { label }));
    } catch {
      toast.error(t("admin.actionFailed", { label }));
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text">{t("admin.system")}</h1>
          <p className="text-sm text-text-secondary">
            {t("admin.monitorSystemHealthOperationalControls")}
          </p>
        </div>
        <Button
          variant="outline"
          icon={RefreshCw}
          onClick={() => appendLog("info", t("admin.systemCheckRefreshed"))}
          loading={isLoading}
        >
          {t("common.refresh")}
        </Button>
      </div>

      <div className="flex gap-2 border-b border-border/50">
        {[
          { id: "health", label: "Health Check" },
          { id: "logs", label: "Logs" },
          { id: "maintenance", label: "Maintenance" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-text-secondary"}`}
          >
            {tabLabel[tab.id] || tab.label}
          </button>
        ))}
      </div>

      {activeTab === "health" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: t("common.users"),
                value: Number(analytics.total_users || 0).toLocaleString(),
                icon: Cpu,
                color: "text-green-500",
              },
              {
                label: t("common.products"),
                value: Number(analytics.total_products || 0).toLocaleString(),
                icon: MemoryStick,
                color: "text-blue-500",
              },
              {
                label: t("merchant.revenue"),
                value: `$${Number(analytics.total_revenue || 0).toLocaleString()}`,
                icon: HardDrive,
                color: "text-yellow-500",
              },
              {
                label: t("common.orders"),
                value: Number(analytics.total_orders || 0).toLocaleString(),
                icon: Activity,
                color: "text-success",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white p-4 rounded-xl border border-border/50"
              >
                <s.icon className={`h-6 w-6 ${s.color} mb-2`} />
                <p className="text-xs text-text-secondary">{s.label}</p>
                <p className="text-lg font-bold text-text">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-border/50 overflow-hidden">
            <div className="p-4 border-b border-border/50">
              <h3 className="font-semibold text-text">
                {t("admin.serviceHealth")}
              </h3>
            </div>
            <div className="divide-y divide-border/50">
              {healthChecks.map((check) => (
                <div
                  key={check.name}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    {check.status === "ok" ? (
                      <CheckCircle className="h-5 w-5 text-success" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-text">
                        {check.name}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {check.detail}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={check.status === "ok" ? "success" : "warning"}
                    size="sm"
                  >
                    {check.status === "ok"
                      ? t("admin.ok")
                      : t("common.warning")}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "logs" && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              icon={Download}
              onClick={() => {
                if (!logs.length) {
                  toast.error(t("admin.noLogsToExport"));
                  return;
                }
                const rows = [
                  [t("admin.time"), t("admin.level"), t("common.message")],
                  ...logs.map((l) => [
                    l.time,
                    l.level,
                    `"${(l.message || "").replace(/"/g, '""')}"`,
                  ]),
                ];
                const csv = rows.map((r) => r.join(",")).join("\n");
                const blob = new Blob([csv], {
                  type: "text/csv;charset=utf-8;",
                });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.setAttribute(
                  "download",
                  `system-logs-${new Date().toISOString().slice(0, 10)}.csv`,
                );
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              }}
            >
              {t("admin.exportLogs")}
            </Button>
            <Button
              variant="outline"
              className="!text-danger !border-danger"
              icon={Trash2}
              onClick={clearLogs}
              loading={updateSettings.isPending}
            >
              {t("admin.clearLogs")}
            </Button>
          </div>

          <div className="bg-white rounded-xl border border-border/50 overflow-hidden">
            <div className="divide-y divide-border/50">
              {logs.length === 0 && (
                <div className="px-4 py-10 text-center text-sm text-text-secondary">
                  {t("admin.noLogsAvailable")}
                </div>
              )}
              {logs.map((log, index) => (
                <div
                  key={`${log.time}-${index}`}
                  className="flex items-start gap-3 px-4 py-3"
                >
                  <code className="text-xs text-text-secondary font-mono whitespace-nowrap">
                    {log.time}
                  </code>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded uppercase ${levelStyles[log.level] || levelStyles.info}`}
                  >
                    {logLevelLabel[log.level] || log.level}
                  </span>
                  <p className="text-sm text-text">{log.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "maintenance" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl border border-border/50 space-y-4">
            <h3 className="font-semibold text-text flex items-center gap-2">
              <Wrench className="h-4 w-4" /> {t("admin.maintenanceMode")}
            </h3>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm">
                {t("admin.enableMaintenanceMode")}
              </span>
              <button
                type="button"
                className={`w-11 h-6 rounded-full relative transition ${maintenanceMode ? "bg-primary" : "bg-gray-300"}`}
                onClick={() => setMaintenanceMode((v) => !v)}
                role="switch"
                aria-checked={maintenanceMode}
                aria-label={t("admin.enableMaintenanceMode")}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition ${maintenanceMode ? "right-0.5" : "left-0.5"}`}
                />
              </button>
            </div>

            <Input
              label={t("admin.maintenanceMessage")}
              value={maintenanceMessage}
              maxLength={MAX_MAINTENANCE_MESSAGE_LENGTH}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
            />

            <Button
              onClick={saveMaintenance}
              loading={updateSettings.isPending}
            >
              {t("admin.saveMaintenance")}
            </Button>
          </div>

          <div className="bg-white p-4 rounded-xl border border-border/50 space-y-3">
            <h3 className="font-semibold text-text">
              {t("admin.quickActions")}
            </h3>
            {[
              {
                label: t("admin.clearApplicationCache"),
                action: "clear_cache",
              },
              {
                label: t("admin.backupSettings") || "Backup Settings",
                action: "backup_settings",
              },
            ].map((item) => (
              <Button
                key={item.label}
                variant="outline"
                fullWidth
                onClick={() => runMaintenanceAction(item.action, item.label)}
                loading={maintenanceAction.isPending}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
