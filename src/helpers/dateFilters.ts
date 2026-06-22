import { Periodo } from "../modules/dashboard/financeiro.types";

export function getDateRange(periodo: Periodo) {
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
