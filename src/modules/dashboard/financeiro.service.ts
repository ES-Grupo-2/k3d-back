import { prisma } from "../../lib/clientPrisma";
import { getDateRange } from "../../helpers/dateFilters";
import { Periodo, DashboardFinanceiroResponse } from "./financeiro.types";

export class DashboardFinanceiroService {
  static async getFinanceiro(periodo: Periodo, ref?: string): Promise<DashboardFinanceiroResponse> {
    const { start, end } = getDateRange(periodo, ref);

    const result = await prisma.order.aggregate({
      _sum: { amount_paid: true, cost: true },
      _avg: { amount_paid: true, price: true },
      _count: { id: true },
      where: {
        created_at: { gte: start, lte: end },
      },
    });

    const receitaTotal = result._sum.amount_paid ?? 0;
    const custoTotal = result._sum.cost ?? 0;

    return {
      periodo,
      dataInicio: start.toISOString(),
      dataFim: end.toISOString(),
      receitaTotal,
      custoTotal,
      lucroTotal: receitaTotal - custoTotal,
      precoMedio: result._avg.price ?? 0,
      ticketMedio: result._avg.amount_paid ?? 0,
      totalPedidos: result._count.id,
    };
  }
}
