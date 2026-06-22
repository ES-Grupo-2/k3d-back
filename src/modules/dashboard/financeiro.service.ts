import { prisma } from "../../lib/clientPrisma";
import { Periodo, DashboardFinanceiroResponse } from "./financeiro.types";

export class DashboardFinanceiroService {
  static async getIndicadores(periodo: Periodo): Promise<DashboardFinanceiroResponse> {
    const { start, end } = this.getPeriodo(periodo);

    const result = await prisma.order.aggregate({
      _sum: { amount_paid: true },
      _avg: { amount_paid: true },
      _count: { id: true },
      where: {
        created_at: { gte: start, lte: end },
      },
    });

    return {
      periodo,
      dataInicio: start.toISOString(),
      dataFim: end.toISOString(),
      receitaTotal: result._sum.amount_paid ?? 0,
      ticketMedio: result._avg.amount_paid ?? 0,
      totalPedidos: result._count.id,
    };
  }

  private static getPeriodo(periodo: Periodo) {
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
}
