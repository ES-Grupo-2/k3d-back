import { z } from "zod";

export const periodoSchema = z.enum(["SEMANAL", "MENSAL", "SEMESTRAL"]);

export const financeiroQuerySchema = z.object({
  periodo: periodoSchema.default("MENSAL"),
  ref: z.string().optional(),
});

export type Periodo = z.infer<typeof periodoSchema>;
export type FinanceiroQuery = z.infer<typeof financeiroQuerySchema>;

export type DashboardFinanceiroResponse = {
  periodo: Periodo;
  dataInicio: string;
  dataFim: string;
  receitaTotal: number;
  custoTotal: number;
  lucroTotal: number;
  precoMedio: number;
  ticketMedio: number;
  totalPedidos: number;
};
