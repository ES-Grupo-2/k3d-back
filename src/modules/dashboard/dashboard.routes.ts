import { FastifyInstance } from "fastify";
import { DashboardController } from "./dashboard.controller";
import { verifyJWT } from "../../middlewares/auth";
import { checkRole } from "../../middlewares/rbac";

export async function dashboardRoutes(app: FastifyInstance) {
  app.get(
    "/financeiro",
    { preHandler: [verifyJWT, checkRole(["GERENTE"])] },
    DashboardController.financeiro,
  );

  app.get(
    "/operacional",
    { preHandler: [verifyJWT, checkRole(["OPERACIONAL", "GERENTE"])] },
    DashboardController.operacional,
  );

  app.get(
    "/financeiro/receita-diaria",
    { preHandler: [verifyJWT, checkRole(["GERENTE"])] },
    DashboardController.receitaDiaria,
  );
}
