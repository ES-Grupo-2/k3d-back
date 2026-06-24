import { FastifyInstance } from "fastify";
import { TagsController } from "./tags.controller";
import { verifyJWT } from "../../middlewares/auth";
import { checkRole } from "../../middlewares/rbac";

export async function tagsRoutes(app: FastifyInstance) {
  app.get(
    "/",
    { preHandler: [verifyJWT] },
    TagsController.findAll,
  );

  app.get(
    "/:id",
    { preHandler: [verifyJWT] },
    TagsController.findById,
  );

  app.post(
    "/",
    { preHandler: [verifyJWT, checkRole(["GERENTE"])] },
    TagsController.create,
  );

  app.patch(
    "/:id",
    { preHandler: [verifyJWT, checkRole(["GERENTE"])] },
    TagsController.update,
  );
}
