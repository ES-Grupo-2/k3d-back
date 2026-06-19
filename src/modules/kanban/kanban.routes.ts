import { FastifyInstance } from "fastify";
import { verifyJWT } from "../../middlewares/auth";
import { KanbanController } from "./kanban.controller";

export async function kanbanRoutes(app: FastifyInstance) {
  app.get(
    "/sections/:taskStatus",
    {
      preHandler: [verifyJWT],
    },
    KanbanController.listSectionTasksHandler,
  );
}
