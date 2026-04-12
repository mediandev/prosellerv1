export const toSafeNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/\./g, "").replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
};

export const formatCurrencyBRL = (value: unknown): string => {
  const safeValue = toSafeNumber(value, 0);
  return safeValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};
