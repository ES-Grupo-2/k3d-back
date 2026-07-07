import { z } from "zod";

export const calculatorParameterSchema = z.object({
  filament_price: z.coerce.number({ required_error: "Preço do filamento é obrigatório" }).positive("Deve ser maior que 0"),
  kw_cost: z.coerce.number({ required_error: "Preço do KWh é obrigatório" }).positive("Deve ser maior que 0"),
  depreciation: z.coerce.number({ required_error: "Depreciação é obrigatória" }).nonnegative("Não pode ser negativa"),
  profit_margin: z.coerce.number({ required_error: "Margem de lucro é obrigatória" }).nonnegative("Não pode ser negativa"),
});

export const calculateCostSchema = z.object({
  filament_weight_grams: z.coerce.number({ required_error: "Quantidade de filamento (g) é obrigatória" }).positive("Deve ser maior que 0"),
  kwh_used: z.coerce.number({ required_error: "Quantidade de KWh é obrigatória" }).positive("Deve ser maior que 0"),
});

export type CalculatorParameterInput = z.infer<typeof calculatorParameterSchema>;
export type CalculateCostInput = z.infer<typeof calculateCostSchema>;