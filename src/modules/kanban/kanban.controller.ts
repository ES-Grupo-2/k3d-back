import { FastifyReply, FastifyRequest } from "fastify";
import { KanbanService } from "./kanban.service";
import { kanbanSectionParamsSchema } from "./kanban.types";

export class KanbanController {
  static async listSectionTasksHandler(
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    const { taskStatus } = kanbanSectionParamsSchema.parse(request.params);
    const result = await KanbanService.listTasksBySection(taskStatus);

    return reply.status(200).send(result);
  }
}
