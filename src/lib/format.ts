export function formatSar(value: number | null | undefined) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}
