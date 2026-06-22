import { FastifyRequest, FastifyReply } from "fastify";
import { financeiroQuerySchema } from "./financeiro.types";
import { DashboardFinanceiroService } from "./financeiro.service";

export class DashboardFinanceiroController {
  static async financeiro(request: FastifyRequest, reply: FastifyReply) {
    const { periodo, ref } = financeiroQuerySchema.parse(request.query);
    const result = await DashboardFinanceiroService.getFinanceiro(periodo, ref);
    return reply.send(result);
  }
}
