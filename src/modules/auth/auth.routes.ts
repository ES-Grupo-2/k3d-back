import { FastifyInstance } from "fastify";
import { AuthController } from "./auth.controller";
import { verifyJWT } from "../../middlewares/auth";
import { checkRole } from "../../middlewares/rbac";

export async function authRoutes(app: FastifyInstance) {
  app.post(
    "/auth/register",
    {
      preHandler: [verifyJWT, checkRole("GERENTE")],
    },
    AuthController.registerHandler,
  );

  app.post("/auth/login", AuthController.loginHandler);
}
