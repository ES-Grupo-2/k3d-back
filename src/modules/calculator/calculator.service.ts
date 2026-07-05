import { prisma } from "../../lib/clientPrisma";
import { AppError } from "../../utils/errors";
import { CalculateCostInput, CalculatorParameterInput } from "./calculator.types";

export class CalculatorService {
  static async updateParameters(data: CalculatorParameterInput) {
    const currentParam = await prisma.calculatorParameter.findFirst();

    if (currentParam) {
      return await prisma.calculatorParameter.update({
        where: { id: currentParam.id },
        data,
      });
    }

    return await prisma.calculatorParameter.create({
      data,
    });
  }

  static async getParameters() {
    const parameters = await prisma.calculatorParameter.findFirst();
    if (!parameters) {
      throw new AppError("Parâmetros da calculadora não configurados pelo Gerente.", 404);
    }
    return parameters;
  }

  static async calculate(input: CalculateCostInput) {
    const parameters = await prisma.calculatorParameter.findFirst();
    
    if (!parameters) {
      throw new AppError("Nenhum parâmetro base encontrado. O Gerente precisa configurar os valores antes do cálculo.", 400);
    }

    const filamentCost = (input.filament_weight_grams / 1000) * parameters.filament_price;

    const energyCost = input.kwh_used * parameters.kw_cost;

    const depreciationCost = parameters.depreciation;

    const totalCost = filamentCost + energyCost + depreciationCost;

    const suggestedPrice = totalCost * (1 + parameters.profit_margin / 100);

    return {
      inputs: input,
      breakdown: {
        filamentCost: Number(filamentCost.toFixed(2)),
        energyCost: Number(energyCost.toFixed(2)),
        depreciationCost: Number(depreciationCost.toFixed(2)),
      },
      totalCost: Number(totalCost.toFixed(2)),
      suggestedPrice: Number(suggestedPrice.toFixed(2)),
    };
  }
}