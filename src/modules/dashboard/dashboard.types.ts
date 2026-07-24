import { z } from "zod";

export const periodoSchema = z.enum(["SEMANAL", "MENSAL", "SEMESTRAL"]);

export const financeiroQuerySchema = z.object({
  periodo: periodoSchema.default("MENSAL"),
  ref: z.string().optional(),
  tagType: z.string().optional(),
});

export const operacionalQuerySchema = z.object({
  periodo: periodoSchema.default("MENSAL"),
  ref: z.string().optional(),
  tagType: z.string().optional(),
});

export type Periodo = z.infer<typeof periodoSchema>;
export type FinanceiroQuery = z.infer<typeof financeiroQuerySchema>;
export type OperacionalQuery = z.infer<typeof operacionalQuerySchema>;

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

export type TagCount = {
  tagType: string;
  quantidade: number;
};

export type DashboardOperacionalResponse = {
  periodo: Periodo;
  dataInicio: string;
  dataFim: string;
  tags: TagCount[];
  totalPedidos: number;
};


export const receitaDiariaQuerySchema = z.object({
  periodo: periodoSchema.default("MENSAL"),
  ref: z.string().optional(),
  tagType: z.string().optional(),
});

export type ReceitaDiariaQuery = z.infer<typeof receitaDiariaQuerySchema>;

export type ReceitaPorDia = {
  data: string; // YYYY-MM-DD
  receitaTotal: number;
  totalPedidos: number;
};

export type DashboardReceitaDiariaResponse = {
  periodo: Periodo;
  dataInicio: string;
  dataFim: string;
  dias: ReceitaPorDia[];
};