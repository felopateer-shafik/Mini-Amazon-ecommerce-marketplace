import { useEffect, useMemo, useState } from "react";
import { Save, Plus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import toast from "react-hot-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { useAdminSettings, useAdminUpdateSettings } from "@/hooks/useApi";

const DEFAULT_METHODS = [
  { name: "Standard", cost: 50, minDays: 3, maxDays: 7, enabled: true },
  { name: "Express", cost: 120, minDays: 1, maxDays: 2, enabled: true },
];

function toBool(value, fallback = true) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
  }
  return fallback;
}

export default function ShippingConfigPage() {
  const { t } = useTranslation();
  const { data: settingsRes, isLoading } = useAdminSettings();
  const updateSettings = useAdminUpdateSettings();

  const settings = settingsRes?.data ?? settingsRes ?? {};

  const [shippingFee, setShippingFee] = useState(0);
  const [freeShippingThresholdEnabled, setFreeShippingThresholdEnabled] =
    useState(true);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(0);
  const [shippingMinDays, setShippingMinDays] = useState(3);
  const [shippingMaxDays, setShippingMaxDays] = useState(7);
  const [methods, setMethods] = useState(DEFAULT_METHODS);
  const [zones, setZones] = useState([]);
  const [activeCarriers, setActiveCarriers] = useState([]);

  useEffect(() => {
    if (!settings || Object.keys(settings).length === 0) return;
    setShippingFee(Number(settings.shipping_fee ?? 0));
    setFreeShippingThresholdEnabled(
      toBool(settings.free_shipping_threshold_enabled, true),
    );
    setFreeShippingThreshold(Number(settings.free_shipping_threshold ?? 0));
    setShippingMinDays(Number(settings.shipping_min_days ?? 3));
    setShippingMaxDays(Number(settings.shipping_max_days ?? 7));
    setMethods(
      Array.isArray(settings.shipping_methods) &&
        settings.shipping_methods.length > 0
        ? settings.shipping_methods
        : DEFAULT_METHODS,
    );
    setZones(
      Array.isArray(settings.shipping_zones) ? settings.shipping_zones : [],
    );
    setActiveCarriers(
      Array.isArray(settings.active_carriers) ? settings.active_carriers : [],
    );
  }, [settingsRes]);

  const estimatedWindow = useMemo(() => {
    const min = Math.min(shippingMinDays || 0, shippingMaxDays || 0);
    const max = Math.max(shippingMinDays || 0, shippingMaxDays || 0);
    return t("admin.deliveryWindow", { min, max });
  }, [shippingMinDays, shippingMaxDays]);

  const carrierOptions = useMemo(() => {
    const configured = Array.isArray(settings.available_carriers)
      ? settings.available_carriers
      : [];
    const active = Array.isArray(settings.active_carriers)
      ? settings.active_carriers
      : [];
    return [...new Set([...configured, ...active])];
  }, [settings]);

  const addMethod = () => {
    setMethods((prev) => [
      ...prev,
      { name: "", cost: 0, minDays: 1, maxDays: 1, enabled: true },
    ]);
  };

  const updateMethod = (index, key, value) => {
    setMethods((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [key]: value } : m)),
    );
  };

  const removeMethod = (index) => {
    setMethods((prev) => prev.filter((_, i) => i !== index));
  };

  const addZone = () => {
    setZones((prev) => [...prev, { name: "", countries: [] }]);
  };

  const updateZoneName = (index, value) => {
    setZones((prev) =>
      prev.map((zone, i) => (i === index ? { ...zone, name: value } : zone)),
    );
  };

  const updateZoneCountries = (index, value) => {
    const countries = value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

    setZones((prev) =>
      prev.map((zone, i) => (i === index ? { ...zone, countries } : zone)),
    );
  };

  const removeZone = (index) => {
    setZones((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleCarrier = (carrier) => {
    setActiveCarriers((prev) =>
      prev.includes(carrier)
        ? prev.filter((name) => name !== carrier)
        : [...prev, carrier],
    );
  };

  const handleSave = async () => {
    const fee = Number(shippingFee) || 0;
    const threshold = Number(freeShippingThreshold) || 0;
    const minD = Number(shippingMinDays) || 1;
    const maxD = Number(shippingMaxDays) || 1;

    if (fee < 0 || threshold < 0) {
      toast.error(t("admin.shippingFeesCannotBeNegative"));
      return;
    }
    if (minD > maxD) {
      toast.error(t("admin.minDeliveryCannotExceedMax"));
      return;
    }

    try {
      const payload = {
        shipping_fee: fee,
        free_shipping_threshold_enabled: !!freeShippingThresholdEnabled,
        free_shipping_threshold: threshold,
        shipping_min_days: minD,
        shipping_max_days: maxD,
        shipping_methods: methods
          .filter((m) => m.name?.trim())
          .map((m) => {
            const mMin = Number(m.minDays) || 1;
            const mMax = Number(m.maxDays) || 1;
            return {
              name: m.name.trim(),
              cost: Math.max(0, Number(m.cost) || 0),
              minDays: Math.min(mMin, mMax),
              maxDays: Math.max(mMin, mMax),
              enabled: !!m.enabled,
            };
          }),
        shipping_zones: zones
          .filter((zone) => zone.name?.trim())
          .map((zone) => ({
            name: zone.name.trim(),
            countries: Array.isArray(zone.countries) ? zone.countries : [],
          })),
        active_carriers: activeCarriers,
      };

      await updateSettings.mutateAsync(payload);
      toast.success(t("admin.shippingSettingsSaved"));
    } catch {
      toast.error(t("admin.failedSaveShippingSettings"));
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-text">
          {t("admin.shippingConfig")}
        </h1>
        <p className="text-sm text-text-secondary">
          {t("admin.manageDeliveryFeesEtaMethods")}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-border/50 p-6 space-y-4">
        <h2 className="font-semibold text-text">
          {t("admin.globalShippingSettings")}
        </h2>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg flex-wrap gap-2">
          <div>
            <p className="text-sm font-medium text-text">
              Enable Free Shipping Threshold
            </p>
            <p className="text-xs text-text-secondary mt-0.5">
              Apply free shipping only when cart subtotal reaches threshold.
            </p>
          </div>
          <div className="flex grow-1 justify-end">
            <button
              type="button"
              className={`w-11 h-6 rounded-full relative transition ${freeShippingThresholdEnabled ? "bg-primary" : "bg-gray-300"}`}
              onClick={() => setFreeShippingThresholdEnabled((prev) => !prev)}
              role="switch"
              aria-checked={!!freeShippingThresholdEnabled}
              aria-label="Enable free shipping threshold"
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition ${freeShippingThresholdEnabled ? "right-0.5" : "left-0.5"}`}
              />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label={t("admin.baseShippingFee")}
            type="number"
            value={shippingFee}
            onChange={(e) => setShippingFee(e.target.value)}
          />
          <Input
            label={t("admin.freeShippingThreshold")}
            type="number"
            value={freeShippingThreshold}
            onChange={(e) => setFreeShippingThreshold(e.target.value)}
            disabled={!freeShippingThresholdEnabled}
          />
          <Input
            label={t("admin.minDeliveryDays")}
            type="number"
            value={shippingMinDays}
            onChange={(e) => setShippingMinDays(e.target.value)}
          />
          <Input
            label={t("admin.maxDeliveryDays")}
            type="number"
            value={shippingMaxDays}
            onChange={(e) => setShippingMaxDays(e.target.value)}
          />
        </div>
        <div className="text-sm text-text-secondary">
          {t("admin.currentEstimatedDeliveryWindow")}:{" "}
          <span className="font-medium text-text">{estimatedWindow}</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border/50 p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-text width-140">
            {t("admin.shippingMethods")}
          </h2>
          <Button size="sm" variant="outline" icon={Plus} onClick={addMethod}>
            {t("admin.addMethod")}
          </Button>
        </div>

        <div className="space-y-3">
          {methods.map((method, index) => (
            <div
              key={`method-${index}`}
              className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end border border-border/50 rounded-lg p-3"
            >
              <div className="md:col-span-4">
                <Input
                  label={t("common.name")}
                  value={method.name}
                  onChange={(e) => updateMethod(index, "name", e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Input
                  label={t("admin.cost")}
                  type="number"
                  value={method.cost}
                  onChange={(e) => updateMethod(index, "cost", e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Input
                  label={t("admin.minDays")}
                  type="number"
                  value={method.minDays}
                  onChange={(e) =>
                    updateMethod(index, "minDays", e.target.value)
                  }
                />
              </div>
              <div className="md:col-span-2">
                <Input
                  label={t("admin.maxDays")}
                  type="number"
                  value={method.maxDays}
                  onChange={(e) =>
                    updateMethod(index, "maxDays", e.target.value)
                  }
                />
              </div>
              <div className="md:col-span-2 flex items-center justify-between gap-2 pb-1">
                <button
                  type="button"
                  className={`w-11 h-6 rounded-full relative transition ${method.enabled ? "bg-primary" : "bg-gray-300"}`}
                  onClick={() =>
                    updateMethod(index, "enabled", !method.enabled)
                  }
                  role="switch"
                  aria-checked={!!method.enabled}
                  aria-label={t("common.status")}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition ${method.enabled ? "right-0.5" : "left-0.5"}`}
                  />
                </button>
                <button
                  type="button"
                  className="p-2 hover:bg-gray-100 rounded"
                  onClick={() => removeMethod(index)}
                  aria-label={t("common.delete")}
                >
                  <Trash2 className="h-4 w-4 text-text-secondary hover:text-danger" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border/50 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-text">
            {t("admin.shippingZones")}
          </h2>
          <Button size="sm" variant="outline" icon={Plus} onClick={addZone}>
            {t("admin.addZone")}
          </Button>
        </div>

        <div className="space-y-3">
          {zones.map((zone, index) => (
            <div
              key={`zone-${index}`}
              className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end border border-border/50 rounded-lg p-3"
            >
              <div className="md:col-span-4">
                <Input
                  label={t("admin.zoneName")}
                  value={zone.name || ""}
                  onChange={(e) => updateZoneName(index, e.target.value)}
                />
              </div>
              <div className="md:col-span-7">
                <Input
                  label={t("admin.countriesCommaSeparated")}
                  value={
                    Array.isArray(zone.countries)
                      ? zone.countries.join(", ")
                      : ""
                  }
                  onChange={(e) => updateZoneCountries(index, e.target.value)}
                />
              </div>
              <div className="md:col-span-1 flex justify-end pb-1">
                <button
                  type="button"
                  className="p-2 hover:bg-gray-100 rounded"
                  onClick={() => removeZone(index)}
                  aria-label={t("common.delete")}
                >
                  <Trash2 className="h-4 w-4 text-text-secondary hover:text-danger" />
                </button>
              </div>
            </div>
          ))}

          {zones.length === 0 && (
            <div className="text-sm text-text-secondary border border-dashed border-border rounded-lg p-4 text-center">
              {t("admin.noShippingZonesConfiguredYet")}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border/50 p-6 space-y-4">
        <h2 className="font-semibold text-text">{t("admin.carriers")}</h2>
        <div className="flex flex-wrap gap-2">
          {carrierOptions.map((carrier) => (
            <button
              key={carrier}
              type="button"
              onClick={() => toggleCarrier(carrier)}
            >
              <Badge
                variant={
                  activeCarriers.includes(carrier) ? "success" : "default"
                }
              >
                {carrier}
              </Badge>
            </button>
          ))}
          {carrierOptions.length === 0 && (
            <span className="text-sm text-text-secondary">
              {t("common.notAvailable")}
            </span>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          icon={Save}
          onClick={handleSave}
          loading={updateSettings.isPending || isLoading}
        >
          {t("admin.saveShippingConfiguration")}
        </Button>
      </div>
    </div>
  );
}
