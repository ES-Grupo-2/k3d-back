import { FastifyInstance } from "fastify";
import { AuthController } from "./auth.controller";
import { verifyJWT } from "../../middlewares/auth";
import { checkRole } from "../../middlewares/rbac";

export async function authRoutes(app: FastifyInstance) {
  app.post(
    "/register",
    {
      preHandler: [verifyJWT, checkRole("GERENTE")],
    },
    AuthController.registerHandler,
  );

  app.post("/login", AuthController.loginHandler);
}
