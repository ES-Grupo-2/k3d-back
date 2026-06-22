import { FastifyRequest, FastifyReply } from "fastify";
import { periodoSchema } from "./financeiro.types";
import { DashboardFinanceiroService } from "./financeiro.service";

export class DashboardFinanceiroController {
  static async getIndicadores(request: FastifyRequest, reply: FastifyReply) {
    const { periodo } = request.query as { periodo?: string };
    const periodoValido = periodoSchema.parse(periodo ?? "MENSAL");
    const result = await DashboardFinanceiroService.getIndicadores(periodoValido);
    return reply.send(result);
  }
}
