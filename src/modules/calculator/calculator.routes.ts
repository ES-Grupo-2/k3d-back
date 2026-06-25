import { FastifyInstance } from "fastify";
import { CalculatorController } from "./calculator.controller";
import { verifyJWT } from "../../middlewares/auth";
import { checkRole } from "../../middlewares/rbac";

export async function calculatorRoutes(app: FastifyInstance) {
  app.addHook("preHandler", verifyJWT);

  app.post(
    "/calculator/parameters",
    { preHandler: [checkRole(["GERENTE"])] },
    CalculatorController.updateParametersHandler
  );

  app.get(
    "/calculator/parameters",
    { preHandler: [checkRole(["GERENTE"])] },
    CalculatorController.getParametersHandler
  );

  app.post(
    "/calculator/calculate",
    { preHandler: [checkRole(["GERENTE"])] },
    CalculatorController.calculateHandler
  );
}