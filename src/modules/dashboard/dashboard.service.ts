import { prisma } from "../../lib/clientPrisma";
import { Prisma } from "@prisma/client";
import { getDateRange } from "../../utils/dateFilters";
import {
  Periodo,
  DashboardFinanceiroResponse,
  DashboardOperacionalResponse,
  DashboardReceitaDiariaResponse,
} from "./dashboard.types";

export class DashboardService {
  static async getFinanceiro(
    periodo: Periodo,
    ref?: string,
    tagType?: string,
  ): Promise<DashboardFinanceiroResponse> {
    const { start, end } = getDateRange(periodo, ref);

    const where: Record<string, unknown> = {
      created_at: { gte: start, lte: end },
    };
    if (tagType) where.tagType = tagType;

    const result = await prisma.order.aggregate({
      _sum: { amount_paid: true, cost: true },
      _avg: { amount_paid: true, price: true },
      _count: { id: true },
      where,
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

  static async getOperacional(
    periodo: Periodo,
    ref?: string,
    tagType?: string,
  ): Promise<DashboardOperacionalResponse> {
    const { start, end } = getDateRange(periodo, ref);

    const where: Record<string, unknown> = {
      created_at: { gte: start, lte: end },
    };
    if (tagType) where.tagType = tagType;

    const result = await prisma.order.groupBy({
      by: ["tagType"],
      _count: { id: true },
      where,
    });

    const tags = result.map((r) => ({
      tagType: r.tagType,
      quantidade: r._count.id,
    }));

    const totalPedidos = tags.reduce((sum, t) => sum + t.quantidade, 0);

    return {
      periodo,
      dataInicio: start.toISOString(),
      dataFim: end.toISOString(),
      tags,
      totalPedidos,
    };



    
  }

  static async getReceitaDiaria(
    periodo: Periodo,
    ref?: string,
    tagType?: string,
  ): Promise<DashboardReceitaDiariaResponse> {
    const { start, end } = getDateRange(periodo, ref);

    const rows = await prisma.$queryRaw<
      { dia: Date; receita_total: number; total_pedidos: bigint }[]
    >(
      Prisma.sql`
      SELECT
        DATE("created_at") AS dia,
        COALESCE(SUM("price"), 0) AS receita_total,
        COUNT("id") AS total_pedidos
      FROM "orders"
      WHERE "created_at" >= ${start}
        AND "created_at" <= ${end}
        ${tagType ? Prisma.sql`AND "tagType" = ${tagType}` : Prisma.empty}
      GROUP BY DATE("created_at")
      ORDER BY DATE("created_at") ASC
    `
    );

    const dias = rows.map((r) => ({
      data: r.dia.toISOString().split("T")[0],
      receitaTotal: Number(r.receita_total),
      totalPedidos: Number(r.total_pedidos),
    }));

    return {
      periodo,
      dataInicio: start.toISOString(),
      dataFim: end.toISOString(),
      dias,
    };
  }
}
