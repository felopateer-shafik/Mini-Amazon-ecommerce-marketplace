export function resolveOrderShippingMeta(order) {
  const shippingMethod = String(order?.shipping_method || "").trim();
  const shippingZone = String(order?.shipping_zone || "").trim();
  const resourceEta = String(order?.shipping_eta || "").trim();

  const minDays = Number(order?.shipping_min_days ?? 0);
  const maxDays = Number(order?.shipping_max_days ?? 0);
  const hasDayRange = minDays > 0 || maxDays > 0;
  const rangeStart = hasDayRange ? Math.min(minDays || maxDays, maxDays || minDays) : 0;
  const rangeEnd = hasDayRange ? Math.max(minDays || maxDays, maxDays || minDays) : 0;
  const shippingEta = hasDayRange
    ? `${rangeStart}-${rangeEnd} days`
    : resourceEta;

  return {
    shippingMethod,
    shippingZone,
    shippingEta,
    remainingNotes: String(order?.notes || "").trim(),
  };
}