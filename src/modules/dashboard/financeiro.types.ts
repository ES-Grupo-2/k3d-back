import { z } from "zod";

export const periodoSchema = z.enum(["SEMANAL", "MENSAL", "SEMESTRAL"]);

export type Periodo = z.infer<typeof periodoSchema>;

export type DashboardFinanceiroResponse = {
  periodo: Periodo;
  dataInicio: string;
  dataFim: string;
  receitaTotal: number;
  ticketMedio: number;
  totalPedidos: number;
};
