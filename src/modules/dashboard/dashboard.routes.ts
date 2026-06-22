import { FastifyInstance } from "fastify";
import { DashboardFinanceiroController } from "./financeiro.controller";
import { verifyJWT } from "../../middlewares/auth";
import { checkRole } from "../../middlewares/rbac";

export async function dashboardRoutes(app: FastifyInstance) {
  app.get(
    "/financeiro",
    { preHandler: [verifyJWT, checkRole(["GERENTE"])] },
    DashboardFinanceiroController.getIndicadores,
  );
}
