import { Periodo } from "../modules/dashboard/financeiro.types";

export function getDateRange(periodo: Periodo, ref?: string) {
  if (ref) {
    const [startStr, endStr] = ref.split(",");
    const start = new Date(`${startStr}T00:00:00`);
    const end = new Date(`${endStr}T23:59:59.999`);
    return { start, end };
  }

  const now = new Date();
  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23, 59, 59, 999,
  );

  const dias: Record<Periodo, number> = {
    SEMANAL: 7,
    MENSAL: 30,
    SEMESTRAL: 180,
  };

  const start = new Date(end.getTime() - dias[periodo] * 24 * 60 * 60 * 1000);
  start.setHours(0, 0, 0, 0);

  return { start, end };
}
