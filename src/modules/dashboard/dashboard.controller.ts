import { FastifyRequest, FastifyReply } from "fastify";
import { financeiroQuerySchema, operacionalQuerySchema } from "./dashboard.types";
import { DashboardService } from "./dashboard.service";

export class DashboardController {
  static async financeiro(request: FastifyRequest, reply: FastifyReply) {
    const { periodo, ref, tagType } = financeiroQuerySchema.parse(request.query);
    const result = await DashboardService.getFinanceiro(periodo, ref, tagType);
    return reply.send(result);
  }

  static async operacional(request: FastifyRequest, reply: FastifyReply) {
    const { periodo, ref, tagType } = operacionalQuerySchema.parse(request.query);
    const result = await DashboardService.getOperacional(periodo, ref, tagType);
    return reply.send(result);
  }
}
